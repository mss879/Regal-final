-- =============================================================================
-- Viewings (site visits) shown on the admin calendar.
-- Created as 'requested' when a visitor suggests a date on the enquiry form, or by
-- staff from the calendar, an enquiry or a CRM card. Times are stored in UTC and
-- always displayed in Asia/Colombo.
-- =============================================================================

create table public.viewings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  enquiry_id uuid references public.enquiries (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 40),
  lot text check (char_length(lot) <= 20),
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  -- Maintained by trigger (timestamptz + interval can't be a generated column).
  ends_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('requested', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index viewings_starts_at_idx on public.viewings (starts_at);
create index viewings_lead_id_idx on public.viewings (lead_id);
create index viewings_enquiry_id_idx on public.viewings (enquiry_id);

create trigger viewings_set_updated_at
  before update on public.viewings
  for each row execute function private.set_updated_at();

create or replace function private.viewings_set_ends_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.ends_at := new.starts_at + make_interval(mins => new.duration_minutes);
  return new;
end;
$$;

create trigger viewings_set_ends_at
  before insert or update of starts_at, duration_minutes on public.viewings
  for each row execute function private.viewings_set_ends_at();

alter table public.viewings enable row level security;
revoke all on table public.viewings from anon;
grant select, insert, update, delete on table public.viewings to authenticated;
grant all on table public.viewings to service_role;

create policy "viewings_admin_all" on public.viewings
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create or replace function private.viewings_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_when text;
begin
  v_when := to_char(coalesce(new.starts_at, old.starts_at) at time zone 'Asia/Colombo', 'Dy DD Mon, HH12:MI AM');
  if tg_op = 'INSERT' then
    perform private.log_activity(
      'viewing', new.id, 'created',
      case when new.status = 'requested'
        then format('%s requested a viewing for %s', new.name, v_when)
        else format('Viewing booked with %s for %s', new.name, v_when) end,
      jsonb_build_object('starts_at', new.starts_at, 'status', new.status)
    );
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform private.log_activity(
        'viewing', new.id, new.status,
        format('Viewing with %s %s', new.name, replace(new.status, '_', '-')),
        jsonb_build_object('starts_at', new.starts_at, 'from', old.status, 'to', new.status)
      );
    elsif new.starts_at is distinct from old.starts_at then
      perform private.log_activity(
        'viewing', new.id, 'rescheduled',
        format('Viewing with %s moved to %s', new.name, v_when),
        jsonb_build_object('starts_at', new.starts_at)
      );
    end if;
  elsif tg_op = 'DELETE' then
    perform private.log_activity('viewing', old.id, 'deleted', format('Viewing with %s deleted', old.name));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger viewings_activity
  after insert or update or delete on public.viewings
  for each row execute function private.viewings_activity();
