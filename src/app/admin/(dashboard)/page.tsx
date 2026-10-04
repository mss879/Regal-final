import type { Metadata, Route } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { ADMIN_FEATURES, type DashboardSummary } from "@/lib/admin/features";
import { monthGrid } from "@/lib/admin/calendar";
import { nowMs } from "@/lib/admin/now";
import { colomboDateKey, colomboTimeKey, formatMonth } from "@/lib/time";
import type { Activity, Viewing } from "@/lib/admin/types";
import { Card, CardTitle, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { ActivityFeed, BarList, MiniCalendar, StatTile, UpcomingViewings } from "@/components/admin/dashboard/parts";
import { TrafficChart, type DailyPoint } from "@/components/admin/dashboard/TrafficChart";

export const metadata: Metadata = { title: "Dashboard" };

type Overview = {
  days: number;
  totals: { views: number; visitors: number };
  previous: { views: number; visitors: number };
  daily: DailyPoint[];
  top_pages: { path: string; views: number }[];
  referrers: { host: string; views: number }[];
  campaigns: { source: string; views: number }[];
  devices: { device: string; views: number }[];
  countries: { country: string; views: number }[];
};

const RANGES = [7, 30, 90] as const;
const regionName = new Intl.DisplayNames(["en"], { type: "region" });
const countryLabel = (code: string) => {
  try {
    return code === "??" ? "Unknown" : (regionName.of(code) ?? code);
  } catch {
    return code;
  }
};
const PAGE_NAMES: Record<string, string> = { "/": "Home" };

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const { supabase, admin } = await requireAdmin();
  const sp = await searchParams;
  const range = RANGES.find((r) => String(r) === sp.range) ?? 30;
  const now = nowMs();
  const today = colomboDateKey(now);
  const month = today.slice(0, 7);
  const grid = monthGrid(month);

  const [summaryRes, overviewRes, activityRes, upcomingRes, monthRes] = await Promise.all([
    supabase.rpc("admin_dashboard_summary"),
    supabase.rpc("analytics_overview", { p_days: range }),
    supabase.from("activity_log").select("id, entity_type, entity_id, action, summary, created_at").order("created_at", { ascending: false }).limit(12),
    supabase
      .from("viewings")
      .select("*")
      .in("status", ["requested", "confirmed"])
      .gte("starts_at", new Date(now).toISOString())
      .order("starts_at")
      .limit(5),
    supabase.from("viewings").select("*").gte("starts_at", grid.from.toISOString()).lt("starts_at", grid.to.toISOString()).order("starts_at"),
  ]);
  if (summaryRes.error) throw new Error(summaryRes.error.message);
  if (overviewRes.error) throw new Error(overviewRes.error.message);

  const summary = summaryRes.data as DashboardSummary;
  const traffic = overviewRes.data as Overview;
  const activity = (activityRes.data ?? []) as Activity[];
  const upcoming = (upcomingRes.data ?? []) as Viewing[];
  const monthViewings = (monthRes.data ?? []) as Viewing[];

  const byDay: Record<string, Viewing[]> = {};
  for (const v of monthViewings) (byDay[colomboDateKey(v.starts_at)] ??= []).push(v);
  const viewingMonths = Object.fromEntries([...monthViewings, ...upcoming].map((v) => [v.id, colomboDateKey(v.starts_at).slice(0, 7)]));

  const hour = Number(colomboTimeKey(now).slice(0, 2));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (admin.full_name ?? admin.email.split("@")[0]).split(" ")[0];
  const pagesPerVisit = traffic.totals.visitors ? (traffic.totals.views / traffic.totals.visitors).toFixed(1) : "—";

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting}, ${firstName}`}
        description={
          summary.viewings_today
            ? `You have ${summary.viewings_today} viewing${summary.viewings_today > 1 ? "s" : ""} today.`
            : "Here's what's happening at Regal Victoria Lakeside."
        }
      />

      {/* Overview of every admin feature (driven by ADMIN_FEATURES) */}
      <section aria-label="Overview" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_FEATURES.filter((f) => f.stats).map((f) => (
          <Link key={f.key} href={f.href} className="group flex flex-col justify-between gap-6 rounded-[24px] border border-forest/10 bg-paper p-5 transition-colors hover:border-forest/25">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 font-display text-lg text-forest">
                  <Icon name={f.icon} className="size-5 text-leaf" /> {f.label}
                </p>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-ink-2">{f.description}</p>
              </div>
              <Icon name="chevronRight" className="size-5 shrink-0 text-ink-2 transition-transform group-hover:translate-x-1" />
            </div>
            <dl className="flex gap-8">
              {f.stats!(summary).map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-sans text-[1.9rem] leading-none font-semibold text-forest">{s.value}</dd>
                  <dd className="mt-1 text-[0.78rem] text-ink-2">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Link>
        ))}
      </section>

      <div className="mb-6 grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardTitle>Viewings</CardTitle>
          <div className="grid gap-6 md:grid-cols-2">
            <MiniCalendar month={month} label={formatMonth(`${month}-15`)} days={grid.days} today={today} byDay={byDay} />
            <div>
              <h3 className="eyebrow mb-3 text-ink-2">Coming up</h3>
              <UpcomingViewings items={upcoming} />
            </div>
          </div>
        </Card>
        <Card className="xl:col-span-5">
          <CardTitle>Latest activity</CardTitle>
          <ActivityFeed items={activity} now={now} viewingMonths={viewingMonths} />
        </Card>
      </div>

      {/* Traffic: the range filter scopes everything below it */}
      <section aria-labelledby="traffic-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="traffic-title" className="font-display text-2xl font-light text-forest uppercase">Website traffic</h2>
          <nav aria-label="Date range" className="flex gap-1 rounded-full bg-paper p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={(r === 30 ? "/admin" : `/admin?range=${r}`) as Route}
                aria-current={r === range ? "page" : undefined}
                scroll={false}
                className="rounded-full px-3.5 py-1.5 text-[0.8rem] text-ink-2 transition-colors hover:text-forest aria-[current=page]:bg-forest aria-[current=page]:text-paper"
              >
                Last {r} days
              </Link>
            ))}
          </nav>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatTile label="Visitors" value={traffic.totals.visitors.toLocaleString("en-US")} current={traffic.totals.visitors} previous={traffic.previous.visitors} hint={`vs previous ${range} days`} />
          <StatTile label="Page views" value={traffic.totals.views.toLocaleString("en-US")} current={traffic.totals.views} previous={traffic.previous.views} hint={`vs previous ${range} days`} />
          <StatTile label="Pages per visit" value={pagesPerVisit} hint="Cookieless, bots excluded" />
        </div>

        <Card className="mb-4">
          <CardTitle>Daily visitors</CardTitle>
          <TrafficChart daily={traffic.daily} />
        </Card>

        <Card>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            <BarList title="Top pages" rows={traffic.top_pages.map((p) => ({ label: PAGE_NAMES[p.path] ?? p.path, value: p.views }))} />
            <BarList title="Referrers" rows={traffic.referrers.map((r) => ({ label: r.host, value: r.views }))} />
            <BarList title="Countries" rows={traffic.countries.map((c) => ({ label: countryLabel(c.country), value: c.views }))} />
            <div className="space-y-8">
              <BarList title="Devices" rows={traffic.devices.map((d) => ({ label: d.device.charAt(0).toUpperCase() + d.device.slice(1), value: d.views }))} />
              {traffic.campaigns.length > 0 && <BarList title="Campaigns" rows={traffic.campaigns.map((c) => ({ label: c.source, value: c.views }))} />}
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}
