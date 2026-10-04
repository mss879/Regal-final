-- =============================================================================
-- AI chat assistant
--   * chat_sessions / chat_messages: every conversation with the website's AI agent,
--     written by /api/chat with the service role, readable by admins.
--   * Human takeover: staff can switch the AI off for a chat (ai_paused) and reply
--     themselves (role = 'agent'); the visitor's widget polls for those replies.
--   * Enquiries can now come from the chat (channel = 'chat') and may have a phone
--     number instead of an email address.
--   * save_chat_enquiry(): the agent's "save details" tool. One enquiry per chat,
--     updated if the visitor adds details later (e.g. a viewing time).
-- Chats without an enquiry are deleted after 12 months (private.prune_old_data).
-- =============================================================================

-- ---------------------------------------------------------------- enquiries
alter table public.enquiries alter column email drop not null;
alter table public.enquiries drop constraint if exists enquiries_email_check;
alter table public.enquiries
  add constraint enquiries_email_check check (email is null or (char_length(email) between 3 and 254 and email like '%_@_%')),
  add constraint enquiries_contact_check check (email is not null or phone is not null),
  add column channel text not null default 'form' check (channel in ('form', 'chat')),
  add column chat_session_id uuid;

-- ---------------------------------------------------------------- chats
create table public.chat_sessions (
  -- Generated in the visitor's browser and sent with each message.
  id uuid primary key,
  started_path text check (char_length(started_path) <= 300),
  message_count integer not null default 0,
  enquiry_id uuid references public.enquiries (id) on delete set null,
  -- Human takeover: while true the AI doesn't answer and staff reply from /admin/chats.
  ai_paused boolean not null default false,
  last_role text check (last_role in ('user', 'assistant', 'agent')),
  -- Last time the visitor's chat window checked in (updated at most once a minute).
  visitor_seen_at timestamptz,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index chat_sessions_last_message_at_idx on public.chat_sessions (last_message_at desc);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  -- user = visitor, assistant = the AI, agent = a staff member who took over
  role text not null check (role in ('user', 'assistant', 'agent')),
  content text not null check (char_length(content) between 1 and 8000),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

alter table public.enquiries
  add constraint enquiries_chat_session_id_fkey foreign key (chat_session_id) references public.chat_sessions (id) on delete set null;
create index enquiries_chat_session_id_idx on public.enquiries (chat_session_id);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
revoke all on table public.chat_sessions, public.chat_messages from anon, authenticated;
grant select, delete on table public.chat_sessions, public.chat_messages to authenticated;
grant all on table public.chat_sessions, public.chat_messages to service_role;

create policy "chat_sessions_admin_read" on public.chat_sessions
  for select to authenticated using ((select private.is_admin()));
create policy "chat_sessions_admin_delete" on public.chat_sessions
  for delete to authenticated using ((select private.is_admin()));
create policy "chat_messages_admin_read" on public.chat_messages
  for select to authenticated using ((select private.is_admin()));
create policy "chat_messages_admin_delete" on public.chat_messages
  for delete to authenticated using ((select private.is_admin()));

-- Logs one visitor or AI message, creating the session on first use. Returns the message
-- id and whether the AI is switched off for this chat. Service role only.
create or replace function public.log_chat_message(p_session uuid, p_role text, p_content text, p_path text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_paused boolean;
begin
  if p_role not in ('user', 'assistant') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  insert into public.chat_sessions (id, started_path)
  values (p_session, left(p_path, 300))
  on conflict (id) do nothing;

  insert into public.chat_messages (session_id, role, content)
  values (p_session, p_role, left(p_content, 8000))
  returning id into v_id;

  update public.chat_sessions
  set message_count = message_count + 1,
      last_message_at = now(),
      last_role = p_role,
      visitor_seen_at = case when p_role = 'user' then now() else visitor_seen_at end
  where id = p_session
  returning ai_paused into v_paused;

  return jsonb_build_object('id', v_id, 'paused', v_paused);
end;
$$;

revoke all on function public.log_chat_message(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.log_chat_message(uuid, text, text, text) to service_role;

-- The visitor's widget polling for staff/AI replies after a message id. Also records that the
-- visitor is still there (at most one write a minute). Service role only (via /api/chat).
create or replace function public.chat_poll(p_session uuid, p_after bigint default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paused boolean;
begin
  update public.chat_sessions
  set visitor_seen_at = now()
  where id = p_session and (visitor_seen_at is null or visitor_seen_at < now() - interval '60 seconds');

  select ai_paused into v_paused from public.chat_sessions where id = p_session;
  if not found then
    return jsonb_build_object('paused', false, 'messages', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'paused', v_paused,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'role', m.role, 'content', m.content, 'created_at', m.created_at) order by m.id)
      from (
        select id, role, content, created_at from public.chat_messages
        where session_id = p_session and id > coalesce(p_after, 0) and role in ('assistant', 'agent')
        order by id
        limit 50
      ) m
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.chat_poll(uuid, bigint) from public, anon, authenticated;
grant execute on function public.chat_poll(uuid, bigint) to service_role;

-- Staff reply in a chat. Replying switches the AI off so the two don't talk over each other.
create or replace function public.send_chat_reply(p_session uuid, p_content text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_content, ''))) = 0 then
    raise exception 'Message is empty' using errcode = '22023';
  end if;
  perform 1 from public.chat_sessions where id = p_session for update;
  if not found then
    raise exception 'Chat not found' using errcode = 'P0002';
  end if;

  insert into public.chat_messages (session_id, role, content, author_id)
  values (p_session, 'agent', left(btrim(p_content), 8000), auth.uid())
  returning id into v_id;

  update public.chat_sessions
  set ai_paused = true, message_count = message_count + 1, last_message_at = now(), last_role = 'agent'
  where id = p_session;

  return v_id;
end;
$$;

-- Switch the AI on or off for one chat.
create or replace function public.set_chat_ai(p_session uuid, p_paused boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  update public.chat_sessions set ai_paused = p_paused where id = p_session;
  if not found then
    raise exception 'Chat not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.send_chat_reply(uuid, text) from public, anon;
revoke all on function public.set_chat_ai(uuid, boolean) from public, anon;
grant execute on function public.send_chat_reply(uuid, text) to authenticated;
grant execute on function public.set_chat_ai(uuid, boolean) to authenticated;

-- The agent's save tool. Creates the chat's enquiry (and a requested viewing if a time is
-- given), or updates them when the visitor adds details later. Service role only.
create or replace function public.save_chat_enquiry(
  p_session uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_lot text,
  p_interest text,
  p_message text,
  p_preferred_viewing_at timestamptz,
  p_rate_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_viewing uuid;
  v_email text := nullif(lower(btrim(p_email)), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_lot text := nullif(nullif(btrim(p_lot), ''), 'any');
  v_updated boolean := false;
begin
  if p_rate_key is not null and not public.check_rate_limit('chat-enquiry', p_rate_key, 6, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.chat_sessions (id) values (p_session) on conflict (id) do nothing;

  select id into v_id from public.enquiries where chat_session_id = p_session for update;

  if v_id is null then
    if v_email is null and v_phone is null then
      return jsonb_build_object('ok', false, 'error', 'missing_contact');
    end if;
    insert into public.enquiries (name, email, phone, lot, interest, message, preferred_viewing_at, source_path, channel, chat_session_id)
    values (
      btrim(p_name), v_email, v_phone, v_lot, coalesce(p_interest, 'other'), nullif(btrim(p_message), ''),
      p_preferred_viewing_at, '/chat', 'chat', p_session
    )
    returning id into v_id;
  else
    v_updated := true;
    update public.enquiries
    set name = coalesce(nullif(btrim(p_name), ''), name),
        email = coalesce(v_email, email),
        phone = coalesce(v_phone, phone),
        lot = coalesce(v_lot, lot),
        interest = coalesce(p_interest, interest),
        message = coalesce(nullif(btrim(p_message), ''), message),
        preferred_viewing_at = coalesce(p_preferred_viewing_at, preferred_viewing_at),
        status = case when status = 'archived' then 'new' else status end
    where id = v_id;
  end if;

  if p_preferred_viewing_at is not null then
    select id into v_viewing from public.viewings
    where enquiry_id = v_id and status = 'requested'
    order by created_at desc limit 1;
    if v_viewing is null then
      insert into public.viewings (enquiry_id, lead_id, name, email, phone, lot, starts_at, status)
      select e.id, e.lead_id, e.name, e.email, e.phone, e.lot, p_preferred_viewing_at, 'requested'
      from public.enquiries e where e.id = v_id;
    else
      update public.viewings set starts_at = p_preferred_viewing_at where id = v_viewing;
    end if;
  end if;

  update public.chat_sessions set enquiry_id = v_id where id = p_session;

  return jsonb_build_object('ok', true, 'id', v_id, 'updated', v_updated);
end;
$$;

revoke all on function public.save_chat_enquiry(uuid, text, text, text, text, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.save_chat_enquiry(uuid, text, text, text, text, text, text, timestamptz, text) to service_role;

-- Activity feed: say where an enquiry came from.
create or replace function private.enquiries_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(
      'enquiry', new.id, 'created',
      case when new.channel = 'chat'
        then format('New enquiry from %s via the AI assistant', new.name)
        else format('New enquiry from %s', new.name) end,
      jsonb_build_object('interest', new.interest, 'lot', new.lot, 'channel', new.channel)
    );
  elsif tg_op = 'DELETE' then
    perform private.log_activity('enquiry', old.id, 'deleted', format('Enquiry from %s deleted', old.name));
  end if;
  return coalesce(new, old);
end;
$$;

-- Dashboard counts, now including chats.
create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Colombo')::date;
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'enquiries_new', (select count(*) from public.enquiries where status = 'new'),
    'enquiries_7d', (select count(*) from public.enquiries where created_at > now() - interval '7 days'),
    'enquiries_total', (select count(*) from public.enquiries where status <> 'archived'),
    'leads_open', (select count(*) from public.leads l join public.pipeline_stages s on s.id = l.stage_id where s.kind = 'open'),
    'leads_new', (select count(*) from public.leads l join public.pipeline_stages s on s.id = l.stage_id where s.is_system),
    'leads_won', (select count(*) from public.leads l join public.pipeline_stages s on s.id = l.stage_id where s.kind = 'won'),
    'pipeline_value', (select coalesce(sum(l.value), 0) from public.leads l join public.pipeline_stages s on s.id = l.stage_id where s.kind = 'open'),
    'viewings_upcoming', (select count(*) from public.viewings where starts_at >= now() and status in ('requested', 'confirmed')),
    'viewings_requested', (select count(*) from public.viewings where starts_at >= now() and status = 'requested'),
    'viewings_today', (
      select count(*) from public.viewings
      where (starts_at at time zone 'Asia/Colombo')::date = v_today and status in ('requested', 'confirmed')
    ),
    'chats_7d', (select count(*) from public.chat_sessions where created_at > now() - interval '7 days'),
    'chats_with_enquiry', (select count(*) from public.chat_sessions where enquiry_id is not null and created_at > now() - interval '30 days')
  );
end;
$$;

-- Retention, extended to chats.
create or replace function private.prune_old_data()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.page_views where created_at < now() - interval '25 months';
  delete from private.rate_limit_events where created_at < now() - interval '7 days';
  delete from public.activity_log where created_at < now() - interval '24 months';
  delete from public.chat_sessions where enquiry_id is null and last_message_at < now() - interval '12 months';
$$;
