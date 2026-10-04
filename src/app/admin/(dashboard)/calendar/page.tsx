import type { Metadata, Route } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { WEEKDAYS, monthGrid, parseMonth, shiftMonth } from "@/lib/admin/calendar";
import { nowMs } from "@/lib/admin/now";
import { lotLabel } from "@/lib/admin/format";
import { addDays, colomboDateKey, formatDateTime, formatMonth, formatTime, formatWeekdayDate } from "@/lib/time";
import { viewingStatusLabel, type Viewing } from "@/lib/admin/types";
import { Card, CardTitle, EmptyState, PageHeader, buttonClass } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";
import { VIEWING_TONE, ViewingTrigger } from "@/components/admin/viewings/ViewingDialog";

export const metadata: Metadata = { title: "Viewings calendar" };

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const now = nowMs();
  const today = colomboDateKey(now);
  const month = parseMonth(typeof sp.month === "string" ? sp.month : undefined, now);
  const grid = monthGrid(month);

  const [monthRes, requestedRes] = await Promise.all([
    supabase.from("viewings").select("*").gte("starts_at", grid.from.toISOString()).lt("starts_at", grid.to.toISOString()).order("starts_at"),
    supabase.from("viewings").select("*").eq("status", "requested").gte("starts_at", new Date(now).toISOString()).order("starts_at").limit(20),
  ]);
  if (monthRes.error) throw new Error(monthRes.error.message);

  const viewings = (monthRes.data ?? []) as Viewing[];
  const requested = (requestedRes.data ?? []) as Viewing[];
  const byDay: Record<string, Viewing[]> = {};
  for (const v of viewings) (byDay[colomboDateKey(v.starts_at)] ??= []).push(v);
  const monthDays = grid.days.filter((d) => d.inMonth && byDay[d.key]?.length);
  const inMonth = viewings.filter((v) => colomboDateKey(v.starts_at).startsWith(month));
  const tomorrow = addDays(today, 1);

  return (
    <>
      <PageHeader
        eyebrow="Viewings"
        title="Viewings calendar"
        description="Site visits requested through the website appear as Requested until you confirm them. All times are Sri Lanka time."
        actions={
          <ViewingTrigger draft={{ date: tomorrow, time: "10:00", status: "confirmed" }} className={buttonClass("primary")}>
            <Icon name="plus" className="size-4" /> Book viewing
          </ViewingTrigger>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-9">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-light text-forest uppercase">{formatMonth(`${month}-15`)}</h2>
            <nav aria-label="Month" className="flex items-center gap-1">
              <Link href={`/admin/calendar?month=${shiftMonth(month, -1)}` as Route} className={buttonClass("ghost", "sm", "!px-2")} aria-label="Previous month">
                <Icon name="chevronLeft" />
              </Link>
              <Link href="/admin/calendar" className={buttonClass("outline", "sm")}>Today</Link>
              <Link href={`/admin/calendar?month=${shiftMonth(month, 1)}` as Route} className={buttonClass("ghost", "sm", "!px-2")} aria-label="Next month">
                <Icon name="chevronRight" />
              </Link>
            </nav>
          </div>

          {/* Month grid (tablet and up) */}
          <div className="hidden md:block">
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[18px] border border-forest/10 bg-forest/10">
              {WEEKDAYS.map((w) => (
                <div key={w} className="bg-cream px-2 py-2 text-center text-[0.68rem] font-semibold tracking-[0.12em] text-ink-2 uppercase">{w}</div>
              ))}
              {grid.days.map((d) => {
                const list = byDay[d.key] ?? [];
                return (
                  <div
                    key={d.key}
                    id={`day-${d.key}`}
                    className={`group relative flex min-h-28 scroll-mt-24 flex-col gap-1 p-1.5 ${d.inMonth ? "bg-paper" : "bg-paper/60"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex size-7 items-center justify-center rounded-full text-[0.8rem] ${d.key === today ? "bg-forest font-semibold text-paper" : d.inMonth ? "text-forest" : "text-ink-2/40"}`}
                      >
                        {d.day}
                      </span>
                      <ViewingTrigger
                        draft={{ date: d.key, time: "10:00", status: "confirmed" }}
                        className="rounded-full p-1 text-ink-2/50 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-cream hover:text-forest focus-visible:opacity-100"
                        title={`Book a viewing on ${formatWeekdayDate(`${d.key}T12:00:00+05:30`)}`}
                      >
                        <Icon name="plus" className="size-4" />
                        <span className="sr-only">Book a viewing on {d.key}</span>
                      </ViewingTrigger>
                    </div>
                    {list.map((v) => (
                      <ViewingTrigger key={v.id} draft={v} className={`truncate rounded-lg px-1.5 py-1 text-left text-[0.72rem] leading-tight ${VIEWING_TONE[v.status]}`} title={`${formatTime(v.starts_at)} · ${v.name} · ${viewingStatusLabel(v.status)}`}>
                        <span className="font-semibold">{formatTime(v.starts_at)}</span> {v.name}
                      </ViewingTrigger>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda (phones) */}
          <div className="md:hidden">
            {monthDays.length === 0 ? (
              <EmptyState title="No viewings this month" />
            ) : (
              <ol className="space-y-4">
                {monthDays.map((d) => (
                  <li key={d.key} id={`day-${d.key}`}>
                    <p className="eyebrow mb-2 text-ink-2">{formatWeekdayDate(`${d.key}T12:00:00+05:30`)}{d.key === today ? " · Today" : ""}</p>
                    <ul className="space-y-1.5">
                      {byDay[d.key].map((v) => (
                        <li key={v.id}>
                          <ViewingTrigger draft={v} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[0.85rem] ${VIEWING_TONE[v.status]}`}>
                            <span className="font-semibold">{formatTime(v.starts_at)}</span>
                            <span className="truncate">{v.name}</span>
                          </ViewingTrigger>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <ul className="mt-4 flex flex-wrap gap-2 text-[0.72rem]" aria-label="Legend">
            {(["requested", "confirmed", "completed", "cancelled", "no_show"] as const).map((s) => (
              <li key={s} className={`rounded-full px-2.5 py-0.5 font-semibold ${VIEWING_TONE[s]}`}>{viewingStatusLabel(s)}</li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6 xl:col-span-3">
          <Card>
            <CardTitle>Awaiting confirmation</CardTitle>
            {requested.length === 0 ? (
              <p className="text-[0.85rem] text-ink-2">No requests waiting.</p>
            ) : (
              <ul className="space-y-2">
                {requested.map((v) => (
                  <li key={v.id}>
                    <ViewingTrigger draft={v} className="w-full rounded-2xl border border-dashed border-design bg-design/5 p-3 text-left transition-colors hover:bg-design/10">
                      <span className="block font-semibold text-forest">{v.name}</span>
                      <span className="block text-[0.78rem] text-ink-2">{formatDateTime(v.starts_at)}</span>
                      {v.lot && <span className="block text-[0.78rem] text-ink-2">{lotLabel(v.lot)}</span>}
                    </ViewingTrigger>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle>This month</CardTitle>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[0.78rem] text-ink-2">Confirmed</dt>
                <dd className="font-sans text-2xl font-semibold text-forest">{inMonth.filter((v) => v.status === "confirmed").length}</dd>
              </div>
              <div>
                <dt className="text-[0.78rem] text-ink-2">Completed</dt>
                <dd className="font-sans text-2xl font-semibold text-forest">{inMonth.filter((v) => v.status === "completed").length}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
