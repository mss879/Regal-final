-- Assertions for the migrations: access control, the built-in stage, board operations,
-- the enquiry workflow, rate limiting and analytics bucketing. Any failure raises.
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'staff@example.com');
insert into public.admin_users (user_id, email) values ('00000000-0000-0000-0000-00000000000a', 'admin@example.com');

-- ---------------------------------------------------------------- website (service role)
set role service_role;
do $$
declare r jsonb; v_count int;
begin
  r := public.create_website_enquiry('11111111-1111-1111-1111-111111111111', 'Ann Perera', 'Ann@Example.com', '+94 77 000 0000',
        '9', 'site_visit', 'Hello', now() + interval '3 days', '/contact', 'rk-1');
  assert (r->>'ok')::boolean, 'enquiry should be created: ' || r::text;
  select count(*) into v_count from public.viewings where enquiry_id = (r->>'id')::uuid and status = 'requested';
  assert v_count = 1, 'a requested viewing should be created';
  assert (select email from public.enquiries where id = (r->>'id')::uuid) = 'ann@example.com', 'email is normalised';

  r := public.create_website_enquiry('11111111-1111-1111-1111-111111111111', 'Ann Perera', 'ann@example.com', null,
        null, 'site_visit', null, now() + interval '3 days', '/contact', 'rk-1');
  assert (r->>'duplicate')::boolean, 'same submission id is stored once';

  for i in 2..5 loop
    r := public.create_website_enquiry(gen_random_uuid(), 'Visitor ' || i, 'v' || i || '@example.com', null, 'any', 'pricing', null, null, '/contact', 'rk-1');
    assert (r->>'ok')::boolean, 'enquiry ' || i || ' within the limit';
  end loop;
  r := public.create_website_enquiry(gen_random_uuid(), 'Spammer', 'spam@example.com', null, null, 'other', null, null, '/contact', 'rk-1');
  assert r->>'error' = 'rate_limited', '6th enquiry in 15 minutes is rate limited: ' || r::text;
  assert (select lot from public.enquiries where email = 'v2@example.com') is null, '"any" lot is stored as null';
  assert (select preferred_viewing_at from public.enquiries where email = 'v2@example.com') is null, 'viewing time only kept for site visits';
  raise notice 'ok: website enquiry workflow, idempotency, rate limit';
end $$;

-- page views at Sri Lanka day boundaries: 00:10 today and 23:50 yesterday (Colombo time)
insert into public.page_views (path, device, visitor_hash, created_at) values
  ('/', 'desktop', 'aaaaaaaa', (date_trunc('day', now() at time zone 'Asia/Colombo') at time zone 'Asia/Colombo') + interval '10 minutes'),
  ('/', 'mobile', 'aaaaaaaa', (date_trunc('day', now() at time zone 'Asia/Colombo') at time zone 'Asia/Colombo') - interval '10 minutes'),
  ('/villas', 'mobile', 'bbbbbbbb', (date_trunc('day', now() at time zone 'Asia/Colombo') at time zone 'Asia/Colombo') + interval '20 minutes');
reset role;

-- ---------------------------------------------------------------- anonymous visitors
set role anon;
do $$ begin perform 1 from public.enquiries; raise exception 'FAIL: anon read enquiries';
exception when insufficient_privilege then raise notice 'ok: anon cannot read enquiries'; end $$;
do $$ begin perform 1 from public.leads; raise exception 'FAIL: anon read leads';
exception when insufficient_privilege then raise notice 'ok: anon cannot read leads'; end $$;
do $$ begin perform 1 from public.page_views; raise exception 'FAIL: anon read page views';
exception when insufficient_privilege then raise notice 'ok: anon cannot read page views'; end $$;
do $$ begin insert into public.enquiries (name, email) values ('x', 'x@x.com'); raise exception 'FAIL: anon inserted';
exception when insufficient_privilege then raise notice 'ok: anon cannot insert enquiries'; end $$;
do $$ begin perform public.create_website_enquiry(null, 'x', 'x@x.com', null, null, 'other', null, null, null, null); raise exception 'FAIL: anon called create_website_enquiry';
exception when insufficient_privilege then raise notice 'ok: anon cannot call create_website_enquiry'; end $$;
do $$ begin perform public.check_rate_limit('a', 'b', 1, interval '1 minute'); raise exception 'FAIL: anon called check_rate_limit';
exception when insufficient_privilege then raise notice 'ok: anon cannot call check_rate_limit'; end $$;
do $$ begin perform public.analytics_overview(7); raise exception 'FAIL: anon called analytics_overview';
exception when insufficient_privilege then raise notice 'ok: anon cannot call analytics_overview'; end $$;
do $$ begin perform public.move_enquiry_to_crm(gen_random_uuid()); raise exception 'FAIL: anon called move_enquiry_to_crm';
exception when insufficient_privilege then raise notice 'ok: anon cannot call move_enquiry_to_crm'; end $$;
reset role;

-- ---------------------------------------------------------------- signed in, but not an admin
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
begin
  assert (select count(*) from public.enquiries) = 0, 'non-admin sees no enquiries';
  assert (select count(*) from public.pipeline_stages) = 0, 'non-admin sees no stages';
  assert (select count(*) from public.activity_log) = 0, 'non-admin sees no activity';
  assert (select count(*) from public.admin_users) = 0, 'non-admin sees no staff rows';
  update public.enquiries set status = 'archived';
  begin
    perform public.analytics_overview(7);
    raise exception 'FAIL: non-admin got analytics';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.move_enquiry_to_crm((select gen_random_uuid()));
    raise exception 'FAIL: non-admin moved an enquiry';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.pipeline_stages (name) values ('Sneaky');
    raise exception 'FAIL: non-admin created a stage';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: non-admin user is locked out';
end $$;
reset role;
reset request.jwt.claim.sub;
do $$ begin assert (select count(*) from public.enquiries where status = 'archived') = 0, 'non-admin update had no effect'; end $$;

-- ---------------------------------------------------------------- admin
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare
  v_enq uuid; v_lead uuid; v_again uuid; v_new uuid; v_stage uuid; v_test uuid; v_l1 uuid; v_l2 uuid; v_l3 uuid;
  v_positions int[]; a jsonb; s jsonb;
begin
  assert (select count(*) from public.enquiries) = 5, 'admin sees all 5 enquiries';
  select id into v_new from public.pipeline_stages where system_key = 'new_leads';

  -- Built-in stage is protected
  begin delete from public.pipeline_stages where id = v_new; raise exception 'FAIL: deleted New Leads';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin update public.pipeline_stages set name = 'Fresh' where id = v_new; raise exception 'FAIL: renamed New Leads';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin insert into public.pipeline_stages (name, is_system, system_key) values ('Fake', true, 'new_leads'); raise exception 'FAIL: second system stage';
  exception when raise_exception or unique_violation then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin perform public.delete_stage(v_new); raise exception 'FAIL: delete_stage removed New Leads';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  update public.pipeline_stages set color = 'leaf' where id = v_new;  -- colour is allowed
  raise notice 'ok: New Leads cannot be deleted, renamed or duplicated';

  -- Enquiry -> CRM (idempotent, viewing follows)
  select id into v_enq from public.enquiries where email = 'ann@example.com';
  v_lead := public.move_enquiry_to_crm(v_enq);
  v_again := public.move_enquiry_to_crm(v_enq);
  assert v_lead = v_again, 'move_enquiry_to_crm is idempotent';
  assert (select stage_id from public.leads where id = v_lead) = v_new, 'lead lands in New Leads';
  assert (select position from public.leads where id = v_lead) = 0, 'lead goes to the top';
  assert (select lead_id from public.viewings where enquiry_id = v_enq) = v_lead, 'requested viewing follows the enquiry';
  assert (select status from public.enquiries where id = v_enq) = 'read', 'moved enquiry is marked read';
  assert (select count(*) from public.leads) = 1, 'exactly one lead';

  -- a second enquiry from another person goes on top; same-email enquiries attach to the open lead
  select id into v_enq from public.enquiries where email = 'v2@example.com';
  perform public.move_enquiry_to_crm(v_enq);
  assert (select position from public.leads where email = 'v2@example.com') = 0, 'newest lead on top';
  assert (select position from public.leads where id = v_lead) = 1, 'older lead shifted down';
  reset role;
  insert into public.enquiries (name, email, message) values ('Ann Perera', 'ann@example.com', 'Second message');
  set role authenticated;
  select id into v_enq from public.enquiries where message = 'Second message';
  assert public.move_enquiry_to_crm(v_enq) = v_lead, 'repeat enquiry attaches to the existing open lead';
  assert (select notes from public.leads where id = v_lead) like '%Second message%', 'repeat enquiry is noted on the lead';
  raise notice 'ok: enquiries move into the CRM';

  -- Board operations
  insert into public.pipeline_stages (name, color) values ('Test stage', 'sand') returning id into v_test;
  assert (select position from public.pipeline_stages where id = v_test) = 7, 'new stage goes last';
  insert into public.leads (stage_id, name) values (v_test, 'L1') returning id into v_l1;
  insert into public.leads (stage_id, name) values (v_test, 'L2') returning id into v_l2;
  insert into public.leads (stage_id, name) values (v_test, 'L3') returning id into v_l3;
  assert (select array_agg(position order by position) from public.leads where stage_id = v_test) = array[0,1,2], 'cards append in order';

  perform public.move_lead(v_l3, v_test, 0);
  assert (select array_agg(name order by position) from public.leads where stage_id = v_test) = array['L3','L1','L2'], 'move within a column';
  perform public.move_lead(v_l1, v_new, 1);
  select array_agg(position order by position) into v_positions from public.leads where stage_id = v_new;
  assert v_positions = array[0,1,2], 'target column renumbered: ' || v_positions::text;
  assert (select position from public.leads where id = v_l1) = 1, 'card placed at the requested index';
  assert (select array_agg(position order by position) from public.leads where stage_id = v_test) = array[0,1], 'source column compacted';
  perform public.move_lead(v_l2, v_new, 99);
  assert (select position from public.leads where id = v_l2) = 3, 'index past the end clamps to the bottom';

  perform public.delete_stage(v_test);
  assert not exists (select 1 from public.pipeline_stages where id = v_test), 'stage deleted';
  assert (select stage_id from public.leads where id = v_l3) = v_new, 'cards of a deleted stage move to New Leads';
  select array_agg(position order by position) into v_positions from public.leads where stage_id = v_new;
  assert v_positions = array[0,1,2,3,4], 'New Leads stays contiguous: ' || v_positions::text;
  assert (select array_agg(position order by position) from public.pipeline_stages) = array[0,1,2,3,4,5,6], 'stage positions compacted';

  perform public.reorder_stages((select array_agg(id order by position desc) from public.pipeline_stages));
  assert (select position from public.pipeline_stages where id = v_new) = 0, 'New Leads stays first after a reorder';
  assert (select name from public.pipeline_stages where position = 1) = 'Lost', 'other stages follow the given order';
  raise notice 'ok: move_lead, delete_stage and reorder_stages';

  -- Viewings
  insert into public.viewings (name, starts_at, duration_minutes) values ('Walk-in', now() + interval '1 day', 90) returning id into v_test;
  assert (select ends_at - starts_at from public.viewings where id = v_test) = interval '90 minutes', 'ends_at maintained';
  update public.viewings set status = 'confirmed' where enquiry_id is not null;
  raise notice 'ok: viewings';

  -- Analytics bucketed by Sri Lanka day
  a := public.analytics_overview(7);
  assert jsonb_array_length(a->'daily') = 7, 'seven days returned';
  assert (a->'daily'->6->>'views')::int = 2, 'today (Colombo) has 2 views: ' || (a->'daily')::text;
  assert (a->'daily'->5->>'views')::int = 1, 'yesterday (Colombo) has 1 view';
  assert (a->'totals'->>'visitors')::int = 3, 'visitors are daily uniques summed';
  assert (a->'top_pages'->0->>'path') = '/', 'top page';
  raise notice 'ok: analytics overview';

  s := public.admin_dashboard_summary();
  assert (s->>'leads_open')::int = 5, 'open leads counted: ' || s::text;
  assert (s->>'viewings_upcoming')::int = 2, 'upcoming viewings counted: ' || s::text;

  assert (select count(*) from public.activity_log) > 10, 'activity feed populated';
  assert exists (select 1 from public.activity_log where summary like '%moved from enquiries to New Leads%'), 'move logged';
  assert exists (select 1 from public.activity_log where summary like '%requested a viewing%'), 'viewing request logged';
  raise notice 'ok: dashboard summary and activity feed';
end $$;
reset role;

-- ---------------------------------------------------------------- AI chat
set role service_role;
do $$
declare r jsonb; v_enq uuid;
begin
  perform public.log_chat_message('22222222-2222-2222-2222-222222222222', 'user', 'Which villas are available?', '/villas');
  perform public.log_chat_message('22222222-2222-2222-2222-222222222222', 'assistant', 'Five villas are released.', '/villas');
  assert (select message_count from public.chat_sessions where id = '22222222-2222-2222-2222-222222222222') = 2, 'chat messages counted';
  assert (select started_path from public.chat_sessions where id = '22222222-2222-2222-2222-222222222222') = '/villas', 'start page kept';
  assert (select last_role from public.chat_sessions where id = '22222222-2222-2222-2222-222222222222') = 'assistant', 'last role tracked';
  r := public.chat_poll('22222222-2222-2222-2222-222222222222', 0);
  assert jsonb_array_length(r->'messages') = 1 and r->'messages'->0->>'role' = 'assistant', 'poll returns replies only: ' || r::text;
  assert (r->>'paused')::boolean = false, 'AI on by default';
  assert jsonb_array_length(public.chat_poll(gen_random_uuid(), 0)->'messages') = 0, 'unknown chat polls empty';
  begin
    perform public.log_chat_message('22222222-2222-2222-2222-222222222222', 'agent', 'spoof', null);
    raise exception 'FAIL: service logged an agent message through log_chat_message';
  exception when invalid_parameter_value then null;
  end;

  r := public.save_chat_enquiry('22222222-2222-2222-2222-222222222222', 'Ravi Silva', null, '+94 71 000 0000', '9', 'prebook', 'Interested in Lot 09', null, 'chat-rk');
  assert (r->>'ok')::boolean and not (r->>'updated')::boolean, 'phone-only chat enquiry created: ' || r::text;
  v_enq := (r->>'id')::uuid;
  assert (select channel from public.enquiries where id = v_enq) = 'chat', 'channel is chat';
  assert (select email from public.enquiries where id = v_enq) is null, 'email may be empty for chat leads';
  assert (select enquiry_id from public.chat_sessions where id = '22222222-2222-2222-2222-222222222222') = v_enq, 'session linked';

  r := public.save_chat_enquiry('22222222-2222-2222-2222-222222222222', 'Ravi Silva', 'Ravi@Example.com', null, null, 'site_visit', null, now() + interval '5 days', 'chat-rk');
  assert (r->>'updated')::boolean and (r->>'id')::uuid = v_enq, 'second save updates the same enquiry';
  assert (select email from public.enquiries where id = v_enq) = 'ravi@example.com', 'email added and normalised';
  assert (select phone from public.enquiries where id = v_enq) = '+94 71 000 0000', 'phone kept';
  assert (select count(*) from public.viewings where enquiry_id = v_enq and status = 'requested') = 1, 'requested viewing created';

  r := public.save_chat_enquiry('22222222-2222-2222-2222-222222222222', 'Ravi Silva', null, null, null, 'site_visit', null, now() + interval '6 days', 'chat-rk');
  assert (select count(*) from public.viewings where enquiry_id = v_enq) = 1, 'new time moves the request instead of duplicating it';

  r := public.save_chat_enquiry(gen_random_uuid(), 'No Contact', null, null, null, 'other', null, null, 'chat-rk2');
  assert r->>'error' = 'missing_contact', 'an email or phone is required';
  begin
    insert into public.enquiries (name) values ('Nobody');
    raise exception 'FAIL: enquiry without contact details';
  exception when not_null_violation or check_violation then null;
  end;
  raise notice 'ok: chat logging and save_chat_enquiry';
end $$;
reset role;

set role anon;
do $$ begin perform public.log_chat_message(gen_random_uuid(), 'user', 'x', null); raise exception 'FAIL: anon logged a chat';
exception when insufficient_privilege then raise notice 'ok: anon cannot call log_chat_message'; end $$;
do $$ begin perform public.save_chat_enquiry(gen_random_uuid(), 'x', 'x@x.com', null, null, 'other', null, null, null); raise exception 'FAIL: anon saved a chat enquiry';
exception when insufficient_privilege then raise notice 'ok: anon cannot call save_chat_enquiry'; end $$;
do $$ begin perform public.chat_poll(gen_random_uuid(), 0); raise exception 'FAIL: anon polled a chat';
exception when insufficient_privilege then raise notice 'ok: anon cannot call chat_poll'; end $$;
do $$ begin perform 1 from public.chat_messages; raise exception 'FAIL: anon read chats';
exception when insufficient_privilege then raise notice 'ok: anon cannot read chats'; end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.chat_messages) = 0, 'non-admin sees no chats';
  begin
    perform public.send_chat_reply('22222222-2222-2222-2222-222222222222', 'x');
    raise exception 'FAIL: non-admin replied in a chat';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_chat_ai('22222222-2222-2222-2222-222222222222', true);
    raise exception 'FAIL: non-admin paused the AI';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: non-admin sees no chats and cannot take over';
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  assert (select count(*) from public.chat_messages) = 2, 'admin reads chat transcripts';
  assert (public.admin_dashboard_summary()->>'chats_7d')::int = 2, 'chats counted on the dashboard';
  assert exists (select 1 from public.activity_log where summary like '%via the AI assistant%'), 'chat enquiry logged in the feed';
  -- human takeover
  perform public.send_chat_reply('22222222-2222-2222-2222-222222222222', 'Hi Ravi, this is Nadia from the sales team.');
  assert (select ai_paused from public.chat_sessions where id = '22222222-2222-2222-2222-222222222222'), 'replying switches the AI off';
  assert (select author_id from public.chat_messages where role = 'agent') = '00000000-0000-0000-0000-00000000000a', 'staff author recorded';
  perform public.set_chat_ai('22222222-2222-2222-2222-222222222222', false);
  assert not (select ai_paused from public.chat_sessions where id = '22222222-2222-2222-2222-222222222222'), 'AI switched back on';
  begin
    perform public.send_chat_reply('22222222-2222-2222-2222-222222222222', '   ');
    raise exception 'FAIL: empty reply accepted';
  exception when invalid_parameter_value then null;
  end;
  delete from public.chat_sessions where id = '22222222-2222-2222-2222-222222222222';
  assert (select count(*) from public.chat_messages) = 0, 'deleting a chat removes its messages';
  assert (select chat_session_id from public.enquiries where name = 'Ravi Silva') is null, 'enquiry survives chat deletion';
  raise notice 'ok: admin chat access and human takeover';
end $$;
reset role;
reset request.jwt.claim.sub;

select private.prune_old_data();
\echo 'ALL DATABASE TESTS PASSED'
