-- =============================================================================
-- CRM: a kanban pipeline of stages and lead cards.
-- Stages and leads can all be added, renamed, recoloured, reordered and deleted —
-- except the built-in "New Leads" stage (is_system), which is where enquiries are
-- moved into. Triggers enforce that even for direct API calls.
-- Positions are contiguous integers per column, renumbered by move_lead().
-- =============================================================================

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  -- Brand colour tokens; the admin UI maps them to classes.
  color text not null default 'sage'
    check (color in ('lime', 'sage', 'leaf', 'moss', 'forest', 'sand', 'design', 'sold')),
  position integer not null,
  -- Dashboard counts use kind, because stage names are editable.
  kind text not null default 'open' check (kind in ('open', 'won', 'lost')),
  is_system boolean not null default false,
  system_key text unique check (system_key in ('new_leads')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_system = (system_key is not null))
);

create unique index pipeline_stages_single_system_idx on public.pipeline_stages (is_system) where is_system;
create index pipeline_stages_position_idx on public.pipeline_stages (position);

create trigger pipeline_stages_set_updated_at
  before update on public.pipeline_stages
  for each row execute function private.set_updated_at();

-- New stages go to the end.
create or replace function private.pipeline_stages_default_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position is null then
    select coalesce(max(position) + 1, 0) into new.position from public.pipeline_stages;
  end if;
  return new;
end;
$$;

create trigger pipeline_stages_default_position
  before insert on public.pipeline_stages
  for each row execute function private.pipeline_stages_default_position();

-- The built-in stage can't be deleted, renamed or re-purposed.
create or replace function private.protect_system_stage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'The "%" stage is built in and cannot be deleted', old.name using errcode = 'P0001';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.is_system then
      raise exception 'Only the built-in New Leads stage can be a system stage' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if old.is_system and (
    new.name is distinct from old.name
    or new.is_system is distinct from old.is_system
    or new.system_key is distinct from old.system_key
    or new.kind is distinct from old.kind
  ) then
    raise exception 'The "%" stage is built in and cannot be renamed or changed', old.name using errcode = 'P0001';
  end if;

  if not old.is_system and (new.is_system or new.system_key is not null) then
    raise exception 'Only the built-in New Leads stage can be a system stage' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Seed first (the INSERT guard is attached afterwards), then protect.
insert into public.pipeline_stages (name, color, position, kind, is_system, system_key) values
  ('New Leads',         'lime',   0, 'open', true,  'new_leads'),
  ('Contacted',         'sage',   1, 'open', false, null),
  ('Viewing Scheduled', 'moss',   2, 'open', false, null),
  ('Negotiation',       'design', 3, 'open', false, null),
  ('Reserved',          'leaf',   4, 'open', false, null),
  ('Won',               'forest', 5, 'won',  false, null),
  ('Lost',              'sold',   6, 'lost', false, null);

create trigger pipeline_stages_protect
  before insert or update or delete on public.pipeline_stages
  for each row execute function private.protect_system_stage();

alter table public.pipeline_stages enable row level security;
revoke all on table public.pipeline_stages from anon;
grant select, insert, update, delete on table public.pipeline_stages to authenticated;
grant all on table public.pipeline_stages to service_role;

create policy "pipeline_stages_admin_all" on public.pipeline_stages
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- Leads (the cards)
-- -----------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.pipeline_stages (id) on delete restrict,
  position integer not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 40),
  lot text check (char_length(lot) <= 20),
  interest text check (interest in ('prebook', 'site_visit', 'pricing', 'other')),
  source text not null default 'manual'
    check (source in ('website', 'manual', 'phone', 'referral', 'walk_in', 'social', 'other')),
  -- Expected deal value in LKR (optional, internal only).
  value numeric(14, 0) check (value >= 0),
  notes text check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_stage_position_idx on public.leads (stage_id, position);
create index leads_email_idx on public.leads (lower(email));

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function private.set_updated_at();

-- New cards go to the bottom of their column unless a position is given.
create or replace function private.leads_default_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position is null then
    select coalesce(max(position) + 1, 0) into new.position from public.leads where stage_id = new.stage_id;
  end if;
  return new;
end;
$$;

create trigger leads_default_position
  before insert on public.leads
  for each row execute function private.leads_default_position();

alter table public.leads enable row level security;
revoke all on table public.leads from anon;
grant select, insert, update, delete on table public.leads to authenticated;
grant all on table public.leads to service_role;

create policy "leads_admin_all" on public.leads
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter table public.enquiries
  add constraint enquiries_lead_id_fkey foreign key (lead_id) references public.leads (id) on delete set null;
create index enquiries_lead_id_idx on public.enquiries (lead_id);

-- -----------------------------------------------------------------------------
-- Activity feed entries for stages and leads.
-- -----------------------------------------------------------------------------
create or replace function private.pipeline_stages_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity('stage', new.id, 'created', format('Pipeline stage "%s" added', new.name));
  elsif tg_op = 'UPDATE' and new.name is distinct from old.name then
    perform private.log_activity('stage', new.id, 'renamed', format('Pipeline stage "%s" renamed to "%s"', old.name, new.name));
  elsif tg_op = 'DELETE' then
    perform private.log_activity('stage', old.id, 'deleted', format('Pipeline stage "%s" deleted', old.name));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger pipeline_stages_activity
  after insert or update or delete on public.pipeline_stages
  for each row execute function private.pipeline_stages_activity();

create or replace function private.leads_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage text;
begin
  if tg_op = 'INSERT' then
    select name into v_stage from public.pipeline_stages where id = new.stage_id;
    perform private.log_activity(
      'lead', new.id, 'created',
      case when new.source = 'website'
        then format('%s moved from enquiries to %s', new.name, v_stage)
        else format('%s added to %s', new.name, v_stage) end,
      jsonb_build_object('stage_id', new.stage_id)
    );
  elsif tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    select name into v_stage from public.pipeline_stages where id = new.stage_id;
    perform private.log_activity(
      'lead', new.id, 'moved',
      format('%s moved to %s', new.name, v_stage),
      jsonb_build_object('from', old.stage_id, 'to', new.stage_id)
    );
  elsif tg_op = 'DELETE' then
    perform private.log_activity('lead', old.id, 'deleted', format('Lead %s deleted', old.name));
  end if;
  return coalesce(new, old);
end;
$$;

create trigger leads_activity
  after insert or update or delete on public.leads
  for each row execute function private.leads_activity();

-- -----------------------------------------------------------------------------
-- Board operations. security invoker: they run with the caller's rights, so RLS
-- applies; the explicit admin check gives a clear error.
-- -----------------------------------------------------------------------------

-- Move a card to p_index (0-based) in p_stage, renumbering both columns.
create or replace function public.move_lead(p_lead uuid, p_stage uuid, p_index integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from uuid;
  v_count integer;
  v_index integer;
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  select stage_id into v_from from public.leads where id = p_lead for update;
  if not found then
    raise exception 'Lead not found' using errcode = 'P0002';
  end if;
  perform 1 from public.pipeline_stages where id = p_stage;
  if not found then
    raise exception 'Stage not found' using errcode = 'P0002';
  end if;

  -- Lock both columns so concurrent moves can't interleave.
  perform 1 from public.leads where stage_id in (v_from, p_stage) order by id for update;

  select count(*) into v_count from public.leads where stage_id = p_stage and id <> p_lead;
  v_index := least(greatest(coalesce(p_index, v_count), 0), v_count);

  update public.leads set stage_id = p_stage where id = p_lead and stage_id <> p_stage;

  with others as (
    select id, (row_number() over (order by position, created_at, id) - 1)::integer as rn
    from public.leads
    where stage_id = p_stage and id <> p_lead
  ),
  numbered as (
    select id, case when rn >= v_index then rn + 1 else rn end as pos from others
    union all
    select p_lead, v_index
  )
  update public.leads l
  set position = n.pos
  from numbered n
  where l.id = n.id and l.position is distinct from n.pos;

  if v_from <> p_stage then
    with s as (
      select id, (row_number() over (order by position, created_at, id) - 1)::integer as pos
      from public.leads
      where stage_id = v_from
    )
    update public.leads l
    set position = s.pos
    from s
    where l.id = s.id and l.position is distinct from s.pos;
  end if;
end;
$$;

-- Reorder stages to match p_ids. New Leads always stays first.
create or replace function public.reorder_stages(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  with ids as (
    select id, ord from unnest(p_ids) with ordinality as t (id, ord)
  ),
  ordered as (
    select s.id, (row_number() over (order by s.is_system desc, i.ord nulls last, s.position) - 1)::integer as pos
    from public.pipeline_stages s
    left join ids i on i.id = s.id
  )
  update public.pipeline_stages s
  set position = o.pos
  from ordered o
  where s.id = o.id and s.position is distinct from o.pos;
end;
$$;

-- Delete a stage; its cards move to the bottom of New Leads.
create or replace function public.delete_stage(p_stage uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_is_system boolean;
  v_target uuid;
  v_max integer;
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  select is_system into v_is_system from public.pipeline_stages where id = p_stage for update;
  if not found then
    raise exception 'Stage not found' using errcode = 'P0002';
  end if;
  if v_is_system then
    raise exception 'The New Leads stage cannot be deleted' using errcode = 'P0001';
  end if;

  select id into v_target from public.pipeline_stages where system_key = 'new_leads';
  select coalesce(max(position), -1) into v_max from public.leads where stage_id = v_target;

  with moved as (
    select id, (row_number() over (order by position, created_at, id))::integer as rn
    from public.leads
    where stage_id = p_stage
  )
  update public.leads l
  set stage_id = v_target, position = v_max + m.rn
  from moved m
  where l.id = m.id;

  delete from public.pipeline_stages where id = p_stage;

  with o as (
    select id, (row_number() over (order by position, created_at) - 1)::integer as pos
    from public.pipeline_stages
  )
  update public.pipeline_stages s
  set position = o.pos
  from o
  where s.id = o.id and s.position is distinct from o.pos;
end;
$$;

revoke all on function public.move_lead(uuid, uuid, integer) from public, anon;
revoke all on function public.reorder_stages(uuid[]) from public, anon;
revoke all on function public.delete_stage(uuid) from public, anon;
grant execute on function public.move_lead(uuid, uuid, integer) to authenticated;
grant execute on function public.reorder_stages(uuid[]) to authenticated;
grant execute on function public.delete_stage(uuid) to authenticated;
