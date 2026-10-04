-- =============================================================================
-- Admin core
-- Who may use /admin, shared helpers, the activity feed behind the dashboard, and
-- rate limiting for the public enquiry form and the admin sign-in.
--
-- Security model (applies to every migration in this folder):
--   * Row-level security is enabled on every table in the public schema.
--   * The anon role gets no table access at all. The website writes through
--     server-only code that uses the secret (service-role) key, which calls the
--     narrow functions below.
--   * Signed-in staff are "admins" only if they have a row in public.admin_users;
--     every policy checks private.is_admin().
--   * Helpers live in the private schema, which the Data API does not expose.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Staff allowed into the admin area. Create the user in Supabase Auth first, then:
--   insert into public.admin_users (user_id, email)
--   select id, email from auth.users where email = 'you@example.com';
-- -----------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (char_length(full_name) <= 120),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;
grant all on table public.admin_users to service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated, service_role;

-- Staff can read the staff list; anyone signed in can see their own row (so the app can
-- tell "not an admin" apart from "not signed in"). Changes are made in the SQL editor.
create policy "admin_users_select" on public.admin_users
  for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Activity feed. Written only by triggers and workflow functions (through
-- private.log_activity); read by admins on the dashboard. New admin features add
-- their own entity_type values — no schema change needed.
-- -----------------------------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  entity_type text not null check (char_length(entity_type) <= 40),
  entity_id uuid,
  action text not null check (char_length(action) <= 40),
  summary text not null check (char_length(summary) <= 300),
  meta jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index activity_log_created_at_idx on public.activity_log (created_at desc);
create index activity_log_entity_idx on public.activity_log (entity_type, entity_id);

alter table public.activity_log enable row level security;
revoke all on table public.activity_log from anon, authenticated;
grant select on table public.activity_log to authenticated;
grant all on table public.activity_log to service_role;

create policy "activity_log_select" on public.activity_log
  for select to authenticated
  using ((select private.is_admin()));

create or replace function private.log_activity(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_summary text,
  p_meta jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_log (entity_type, entity_id, action, summary, meta, actor_id)
  values (p_entity_type, p_entity_id, p_action, left(p_summary, 300), coalesce(p_meta, '{}'::jsonb), auth.uid());
$$;

revoke all on function private.log_activity(text, uuid, text, text, jsonb) from public;

-- -----------------------------------------------------------------------------
-- Rate limiting. Keys are salted hashes computed by the app — never raw IP addresses.
-- Rows older than 7 days are removed by private.prune_old_data() (workflows migration).
-- -----------------------------------------------------------------------------
create table private.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx on private.rate_limit_events (bucket, key, created_at desc);

-- Returns true and records the attempt if under the limit; false if the limit is reached.
create or replace function public.check_rate_limit(p_bucket text, p_key text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- Serialise attempts for the same key so parallel requests can't slip past the limit.
  perform pg_advisory_xact_lock(hashtext(p_bucket || ':' || p_key));

  select count(*) into v_count
  from private.rate_limit_events
  where bucket = p_bucket and key = p_key and created_at > now() - p_window;

  if v_count >= p_limit then
    return false;
  end if;

  insert into private.rate_limit_events (bucket, key) values (p_bucket, p_key);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, interval) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, interval) to service_role;
