-- =============================================================================
-- Traffic analytics
-- Cookieless, first-party page views recorded by /api/track (service role only).
-- No IP addresses are stored: visitor_hash is a salted SHA-256 of IP + user agent +
-- the Sri Lanka calendar date, so it changes every day and can't identify anyone.
-- Rows older than 25 months are removed by private.prune_old_data().
-- =============================================================================

create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) between 1 and 300),
  referrer_host text check (char_length(referrer_host) <= 255),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  device text not null default 'desktop' check (device in ('desktop', 'mobile', 'tablet')),
  browser text check (char_length(browser) <= 40),
  country text check (char_length(country) = 2),
  visitor_hash text not null check (char_length(visitor_hash) between 8 and 64),
  created_at timestamptz not null default now()
);

create index page_views_created_at_idx on public.page_views (created_at desc);
create index page_views_path_created_at_idx on public.page_views (path, created_at desc);

alter table public.page_views enable row level security;
revoke all on table public.page_views from anon, authenticated;
grant select on table public.page_views to authenticated;
grant all on table public.page_views to service_role;

create policy "page_views_select" on public.page_views
  for select to authenticated
  using ((select private.is_admin()));

-- -----------------------------------------------------------------------------
-- Dashboard numbers for the last p_days days (Sri Lanka calendar days, today included)
-- plus the same-length period before, for comparison. "visitors" is the sum of daily
-- unique visitors (the hash rotates daily by design).
-- -----------------------------------------------------------------------------
create or replace function public.analytics_overview(p_days integer default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 366);
  v_today date := (now() at time zone 'Asia/Colombo')::date;
  v_start date := v_today - (v_days - 1);
  v_prev_start date := v_start - v_days;
  v_result jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  with pv as (
    select
      (created_at at time zone 'Asia/Colombo')::date as day,
      path, referrer_host, utm_source, device, browser, country, visitor_hash
    from public.page_views
    where created_at >= (v_prev_start::timestamp at time zone 'Asia/Colombo')
  ),
  cur as (select * from pv where day >= v_start),
  prev as (select * from pv where day < v_start),
  daily as (
    select day, count(*) as views, count(distinct visitor_hash) as visitors
    from cur
    group by day
  )
  select jsonb_build_object(
    'days', v_days,
    'from', v_start,
    'to', v_today,
    'totals', (select jsonb_build_object('views', count(*), 'visitors', count(distinct (day, visitor_hash))) from cur),
    'previous', (select jsonb_build_object('views', count(*), 'visitors', count(distinct (day, visitor_hash))) from prev),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'date', g.day,
               'views', coalesce(d.views, 0),
               'visitors', coalesce(d.visitors, 0)
             ) order by g.day), '[]'::jsonb)
      from (select generate_series(v_start, v_today, interval '1 day')::date as day) g
      left join daily d on d.day = g.day
    ),
    'top_pages', (
      select coalesce(jsonb_agg(t), '[]'::jsonb)
      from (select path, count(*) as views from cur group by path order by count(*) desc, path limit 8) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(t), '[]'::jsonb)
      from (select coalesce(referrer_host, 'Direct') as host, count(*) as views
            from cur group by 1 order by count(*) desc, 1 limit 8) t
    ),
    'campaigns', (
      select coalesce(jsonb_agg(t), '[]'::jsonb)
      from (select utm_source as source, count(*) as views
            from cur where utm_source is not null group by 1 order by count(*) desc, 1 limit 6) t
    ),
    'devices', (
      select coalesce(jsonb_agg(t), '[]'::jsonb)
      from (select device, count(*) as views from cur group by 1 order by count(*) desc) t
    ),
    'countries', (
      select coalesce(jsonb_agg(t), '[]'::jsonb)
      from (select coalesce(country, '??') as country, count(*) as views
            from cur group by 1 order by count(*) desc, 1 limit 8) t
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.analytics_overview(integer) from public, anon;
grant execute on function public.analytics_overview(integer) to authenticated;
