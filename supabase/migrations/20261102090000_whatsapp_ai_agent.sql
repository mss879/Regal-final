-- =============================================================================
-- WhatsApp AI agent
--   * The AI answers customers on WhatsApp and books a call with the sales team.
--   * Staff stay in charge: a staff reply, or the switch in /admin/whatsapp, pauses the AI
--     for that conversation for 8 hours, so it never talks over a person but still covers
--     the night.
--   * Call requests are saved as enquiries with channel = 'whatsapp'.
-- =============================================================================

alter table public.whatsapp_conversations
  add column ai_paused_until timestamptz,
  add column enquiry_id uuid references public.enquiries (id) on delete set null;

create index whatsapp_conversations_enquiry_id_idx on public.whatsapp_conversations (enquiry_id);

-- Who wrote an outgoing message. Customer messages leave this empty.
alter table public.whatsapp_messages
  add column sent_by text check (sent_by in ('staff', 'ai'));

update public.whatsapp_messages set sent_by = 'staff' where direction = 'out';

alter table public.enquiries drop constraint enquiries_channel_check;
alter table public.enquiries
  add constraint enquiries_channel_check check (channel in ('form', 'chat', 'whatsapp'));

-- A staff reply now pauses the AI as well.
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

  insert into public.whatsapp_messages (conversation_id, wamid, direction, content, status, sent_by, author_id)
  values (p_conversation, p_wamid, 'out', left(btrim(p_content), 8000), 'sent', 'staff', auth.uid())
  returning id into v_id;

  update public.whatsapp_conversations
  set last_preview = left(btrim(p_content), 200),
      last_direction = 'out',
      last_message_at = now(),
      ai_paused_until = now() + interval '8 hours'
  where id = p_conversation;

  return v_id;
end;
$$;

-- Switches the AI on, or off for the next 8 hours, for one conversation.
create or replace function public.set_whatsapp_ai(p_conversation uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  update public.whatsapp_conversations
  set ai_paused_until = case when p_on then null else now() + interval '8 hours' end
  where id = p_conversation;
end;
$$;

revoke all on function public.set_whatsapp_ai(uuid, boolean) from public, anon;
grant execute on function public.set_whatsapp_ai(uuid, boolean) to authenticated;

-- Logs a reply from the AI that WhatsApp has already accepted. Service role only.
create or replace function public.log_whatsapp_ai_reply(p_conversation uuid, p_wamid text, p_content text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into public.whatsapp_messages (conversation_id, wamid, direction, content, status, sent_by)
  values (p_conversation, p_wamid, 'out', left(btrim(p_content), 8000), 'sent', 'ai')
  returning id into v_id;

  update public.whatsapp_conversations
  set last_preview = left(btrim(p_content), 200), last_direction = 'out', last_message_at = now()
  where id = p_conversation;

  return v_id;
end;
$$;

-- The agent's save tool. One enquiry per conversation, updated if the customer changes
-- anything later. Service role only.
create or replace function public.save_whatsapp_enquiry(
  p_conversation uuid,
  p_name text,
  p_phone text,
  p_lot text,
  p_interest text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_phone text := nullif(btrim(p_phone), '');
  v_lot text := nullif(nullif(btrim(p_lot), ''), 'any');
  v_updated boolean := false;
begin
  select enquiry_id into v_id from public.whatsapp_conversations where id = p_conversation for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'conversation_not_found');
  end if;

  if v_id is null then
    if v_phone is null then
      return jsonb_build_object('ok', false, 'error', 'missing_contact');
    end if;
    insert into public.enquiries (name, phone, lot, interest, message, source_path, channel)
    values (btrim(p_name), v_phone, v_lot, coalesce(p_interest, 'other'), nullif(btrim(p_message), ''), '/whatsapp', 'whatsapp')
    returning id into v_id;
    update public.whatsapp_conversations set enquiry_id = v_id where id = p_conversation;
  else
    v_updated := true;
    update public.enquiries
    set name = coalesce(nullif(btrim(p_name), ''), name),
        phone = coalesce(v_phone, phone),
        lot = coalesce(v_lot, lot),
        interest = coalesce(p_interest, interest),
        message = coalesce(nullif(btrim(p_message), ''), message),
        status = case when status = 'archived' then 'new' else status end
    where id = v_id;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'updated', v_updated);
end;
$$;

revoke all on function public.log_whatsapp_ai_reply(uuid, text, text) from public, anon, authenticated;
revoke all on function public.save_whatsapp_enquiry(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.log_whatsapp_ai_reply(uuid, text, text) to service_role;
grant execute on function public.save_whatsapp_enquiry(uuid, text, text, text, text, text) to service_role;

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
      case new.channel
        when 'chat' then format('New enquiry from %s via the AI assistant', new.name)
        when 'whatsapp' then format('New call request from %s via WhatsApp', new.name)
        else format('New enquiry from %s', new.name) end,
      jsonb_build_object('interest', new.interest, 'lot', new.lot, 'channel', new.channel)
    );
  elsif tg_op = 'DELETE' then
    perform private.log_activity('enquiry', old.id, 'deleted', format('Enquiry from %s deleted', old.name));
  end if;
  return coalesce(new, old);
end;
$$;
