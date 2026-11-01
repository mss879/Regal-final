-- =============================================================================
-- WhatsApp chat
--   * whatsapp_conversations / whatsapp_messages: every conversation on the business
--     number, written by /api/whatsapp/webhook with the service role, readable by admins.
--   * Staff read and reply from /admin/whatsapp. Replies go out through the WhatsApp
--     Cloud API first and are only logged once WhatsApp has accepted them.
--   * contact_id is the sender's phone number in digits, or their business-scoped user
--     ID when they use a WhatsApp username and hide their number.
-- =============================================================================

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null unique check (char_length(contact_id) between 3 and 64),
  bsuid text check (char_length(bsuid) <= 64),
  profile_name text check (char_length(profile_name) <= 200),
  unread_count integer not null default 0,
  last_preview text check (char_length(last_preview) <= 200),
  last_direction text check (last_direction in ('in', 'out')),
  -- WhatsApp only allows free-form replies for 24 hours after the customer's last message.
  last_inbound_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index whatsapp_conversations_last_message_at_idx on public.whatsapp_conversations (last_message_at desc);

create table public.whatsapp_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.whatsapp_conversations (id) on delete cascade,
  -- WhatsApp's own message ID. Unique, because Meta can deliver a webhook more than once.
  wamid text unique check (char_length(wamid) <= 200),
  direction text not null check (direction in ('in', 'out')),
  message_type text not null default 'text' check (char_length(message_type) <= 32),
  content text not null check (char_length(content) between 1 and 8000),
  status text not null default 'received' check (status in ('received', 'sent', 'delivered', 'read', 'failed')),
  error text check (char_length(error) <= 300),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index whatsapp_messages_conversation_idx on public.whatsapp_messages (conversation_id, created_at);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
revoke all on table public.whatsapp_conversations, public.whatsapp_messages from anon, authenticated;
grant select, delete on table public.whatsapp_conversations, public.whatsapp_messages to authenticated;
grant all on table public.whatsapp_conversations, public.whatsapp_messages to service_role;

create policy "whatsapp_conversations_admin_read" on public.whatsapp_conversations
  for select to authenticated using ((select private.is_admin()));
create policy "whatsapp_conversations_admin_delete" on public.whatsapp_conversations
  for delete to authenticated using ((select private.is_admin()));
create policy "whatsapp_messages_admin_read" on public.whatsapp_messages
  for select to authenticated using ((select private.is_admin()));
create policy "whatsapp_messages_admin_delete" on public.whatsapp_messages
  for delete to authenticated using ((select private.is_admin()));

-- Logs a customer's message, creating the conversation on first contact. A repeat delivery
-- of the same message returns null and changes nothing. Service role only.
create or replace function public.log_whatsapp_inbound(
  p_contact text,
  p_bsuid text,
  p_name text,
  p_wamid text,
  p_type text,
  p_content text,
  p_sent_at timestamptz
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation uuid;
  v_id bigint;
begin
  insert into public.whatsapp_conversations (contact_id, bsuid, profile_name)
  values (p_contact, nullif(p_bsuid, ''), left(nullif(p_name, ''), 200))
  on conflict (contact_id) do update
  set bsuid = coalesce(excluded.bsuid, public.whatsapp_conversations.bsuid),
      profile_name = coalesce(excluded.profile_name, public.whatsapp_conversations.profile_name)
  returning id into v_conversation;

  insert into public.whatsapp_messages (conversation_id, wamid, direction, message_type, content, status, created_at)
  values (v_conversation, p_wamid, 'in', left(p_type, 32), left(p_content, 8000), 'received', p_sent_at)
  on conflict (wamid) do nothing
  returning id into v_id;

  if v_id is null then
    return null;
  end if;

  update public.whatsapp_conversations
  set unread_count = unread_count + 1,
      last_preview = left(p_content, 200),
      last_direction = 'in',
      last_inbound_at = greatest(last_inbound_at, p_sent_at),
      last_message_at = greatest(last_message_at, p_sent_at)
  where id = v_conversation;

  return v_id;
end;
$$;

-- Records delivery progress for a staff reply. Webhooks can arrive out of order, so a status
-- never moves backwards, and "failed" always wins. Service role only.
create or replace function public.update_whatsapp_status(p_wamid text, p_status text, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('sent', 'delivered', 'read', 'failed') then
    return;
  end if;

  update public.whatsapp_messages
  set status = p_status,
      error = case when p_status = 'failed' then left(p_error, 300) else error end
  where wamid = p_wamid
    and direction = 'out'
    and status <> 'failed'
    and (
      p_status = 'failed'
      or array_position(array['sent', 'delivered', 'read'], p_status) > array_position(array['sent', 'delivered', 'read'], status)
    );
end;
$$;

revoke all on function public.log_whatsapp_inbound(text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.update_whatsapp_status(text, text, text) from public, anon, authenticated;
grant execute on function public.log_whatsapp_inbound(text, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.update_whatsapp_status(text, text, text) to service_role;

-- Logs a staff reply that WhatsApp has already accepted.
create or replace function public.log_whatsapp_reply(p_conversation uuid, p_wamid text, p_content text)
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
  perform 1 from public.whatsapp_conversations where id = p_conversation for update;
  if not found then
    raise exception 'Conversation not found' using errcode = 'P0002';
  end if;

  insert into public.whatsapp_messages (conversation_id, wamid, direction, content, status, author_id)
  values (p_conversation, p_wamid, 'out', left(btrim(p_content), 8000), 'sent', auth.uid())
  returning id into v_id;

  update public.whatsapp_conversations
  set last_preview = left(btrim(p_content), 200), last_direction = 'out', last_message_at = now()
  where id = p_conversation;

  return v_id;
end;
$$;

create or replace function public.mark_whatsapp_read(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  update public.whatsapp_conversations set unread_count = 0 where id = p_conversation and unread_count > 0;
end;
$$;

revoke all on function public.log_whatsapp_reply(uuid, text, text) from public, anon;
revoke all on function public.mark_whatsapp_read(uuid) from public, anon;
grant execute on function public.log_whatsapp_reply(uuid, text, text) to authenticated;
grant execute on function public.mark_whatsapp_read(uuid) to authenticated;
