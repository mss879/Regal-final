-- =============================================================================
-- Cross-feature workflows
--   create_website_enquiry  website form -> enquiry (+ requested viewing), service role only
--   move_enquiry_to_crm     enquiry -> lead in "New Leads" (idempotent)
--   admin_dashboard_summary counts for the dashboard overview cards
--   prune_old_data          retention, scheduled daily with pg_cron when available
-- =============================================================================

-- Called by the Next.js server action with the secret key. Never callable from a browser.
create or replace function public.create_website_enquiry(
  p_submission_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_lot text,
  p_interest text,
  p_message text,
  p_preferred_viewing_at timestamptz,
  p_source_path text,
  p_rate_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_submission_id is not null then
    select id into v_id from public.enquiries where submission_id = p_submission_id;
    if found then
      return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true);
    end if;
  end if;

  -- 5 enquiries per visitor per 15 minutes.
  if p_rate_key is not null and not public.check_rate_limit('enquiry', p_rate_key, 5, interval '15 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.enquiries (submission_id, name, email, phone, lot, interest, message, preferred_viewing_at, source_path)
  values (
    p_submission_id,
    btrim(p_name),
    lower(btrim(p_email)),
    nullif(btrim(p_phone), ''),
    nullif(nullif(btrim(p_lot), ''), 'any'),
    coalesce(p_interest, 'other'),
    nullif(btrim(p_message), ''),
    case when p_interest = 'site_visit' then p_preferred_viewing_at end,
    p_source_path
  )
  returning id into v_id;

  if p_interest = 'site_visit' and p_preferred_viewing_at is not null then
    insert into public.viewings (enquiry_id, name, email, phone, lot, starts_at, status)
    values (
      v_id,
      btrim(p_name),
      lower(btrim(p_email)),
      nullif(btrim(p_phone), ''),
      nullif(nullif(btrim(p_lot), ''), 'any'),
      p_preferred_viewing_at,
      'requested'
    );
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    -- The same form submitted twice at the same moment: the first one won.
    return jsonb_build_object('ok', true, 'duplicate', true);
end;
$$;

revoke all on function public.create_website_enquiry(uuid, text, text, text, text, text, text, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.create_website_enquiry(uuid, text, text, text, text, text, text, timestamptz, text, text)
  to service_role;

-- Moves an enquiry into the CRM and returns the lead id. Running it twice is harmless.
-- If an open lead with the same email exists, the enquiry is attached to it instead of
-- creating a duplicate card. Requested viewings follow the enquiry onto the lead.
create or replace function public.move_enquiry_to_crm(p_enquiry uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.enquiries%rowtype;
  v_lead uuid;
  v_stage uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  select * into e from public.enquiries where id = p_enquiry for update;
  if not found then
    raise exception 'Enquiry not found' using errcode = 'P0002';
  end if;
  if e.lead_id is not null then
    return e.lead_id;
  end if;

  select l.id into v_lead
  from public.leads l
  join public.pipeline_stages s on s.id = l.stage_id
  where s.kind = 'open' and l.email is not null and lower(l.email) = lower(e.email)
  order by l.updated_at desc
  limit 1;

  if v_lead is null then
    select id into v_stage from public.pipeline_stages where system_key = 'new_leads';
    -- Newest enquiries go to the top of New Leads.
    update public.leads set position = position + 1 where stage_id = v_stage;
    insert into public.leads (stage_id, position, name, email, phone, lot, interest, source, notes)
    values (v_stage, 0, e.name, e.email, e.phone, e.lot, e.interest, 'website', e.message)
    returning id into v_lead;
  else
    update public.leads
    set notes = left(concat_ws(
          E'\n\n',
          notes,
          format('Website enquiry, %s: %s',
                 to_char(e.created_at at time zone 'Asia/Colombo', 'DD Mon YYYY'),
                 coalesce(e.message, '(no message)'))
        ), 5000),
        phone = coalesce(phone, e.phone),
        lot = coalesce(lot, e.lot)
    where id = v_lead;
    perform private.log_activity(
      'enquiry', e.id, 'moved_to_crm',
      format('Enquiry from %s added to their existing lead', e.name),
      jsonb_build_object('lead_id', v_lead)
    );
  end if;

  update public.enquiries
  set lead_id = v_lead, status = case when status = 'new' then 'read' else status end
  where id = e.id;

  update public.viewings set lead_id = v_lead where enquiry_id = e.id and lead_id is null;

  return v_lead;
end;
$$;

revoke all on function public.move_enquiry_to_crm(uuid) from public, anon;
grant execute on function public.move_enquiry_to_crm(uuid) to authenticated;

-- Counts for the dashboard's overview cards.
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
    )
  );
end;
$$;

revoke all on function public.admin_dashboard_summary() from public, anon;
grant execute on function public.admin_dashboard_summary() to authenticated;

-- -----------------------------------------------------------------------------
-- Retention (matches the privacy policy): page views 25 months, rate-limit hashes
-- 7 days, activity feed 24 months. Enquiries and CRM records are kept until staff
-- delete them.
-- -----------------------------------------------------------------------------
create or replace function private.prune_old_data()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.page_views where created_at < now() - interval '25 months';
  delete from private.rate_limit_events where created_at < now() - interval '7 days';
  delete from public.activity_log where created_at < now() - interval '24 months';
$$;

revoke all on function private.prune_old_data() from public;

-- Run it daily at 02:47 Sri Lanka time (21:17 UTC) if pg_cron is available (it is on
-- Supabase). Elsewhere, schedule `select private.prune_old_data();` yourself.
do $$
begin
  begin
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('rvl-prune-old-data', '17 21 * * *', 'select private.prune_old_data()');
  exception
    when others then
      raise notice 'pg_cron is not available (%). Schedule private.prune_old_data() manually.', sqlerrm;
  end;
end;
$$;
