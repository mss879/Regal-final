import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { formatDateTime, formatTime, relativeTime } from "@/lib/time";
import { WEEKDAYS } from "@/lib/admin/calendar";
import type { Activity, Viewing } from "@/lib/admin/types";
import { lotLabel } from "@/lib/admin/format";
import { Delta, EmptyState } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/admin/icons";
import { VIEWING_TONE, ViewingTrigger } from "@/components/admin/viewings/ViewingDialog";

export function StatTile({ label, value, current, previous, hint }: { label: string; value: ReactNode; current?: number; previous?: number; hint?: string }) {
  return (
    <div className="rounded-[20px] border border-forest/10 bg-paper p-5">
      <p className="text-[0.8rem] text-ink-2">{label}</p>
      <p className="mt-2 font-sans text-[2rem] leading-none font-semibold text-forest">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {current !== undefined && previous !== undefined && <Delta current={current} previous={previous} />}
        {hint && <span className="text-[0.75rem] text-ink-2">{hint}</span>}
      </div>
    </div>
  );
}

/** Labelled horizontal bars: one hue (magnitude), value at the tip, so no tooltip is needed. */
export function BarList({ title, rows, empty = "No data yet" }: { title: string; rows: { label: string; value: number }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <h3 className="eyebrow mb-3 text-ink-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-[0.82rem] text-ink-2">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="text-[0.82rem]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-forest" title={r.label}>{r.label}</span>
                <span className="shrink-0 font-semibold text-forest tabular-nums">{r.value.toLocaleString("en-US")}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-forest/[0.06]">
                <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ACTIVITY_ICON: Record<string, IconName> = { enquiry: "inbox", lead: "kanban", viewing: "calendar", stage: "settings" };

function activityHref(a: Activity, viewingMonths: Record<string, string>): Route | null {
  if (!a.entity_id || a.action === "deleted") return null;
  if (a.entity_type === "enquiry") return `/admin/enquiries?tab=all&id=${a.entity_id}` as Route;
  if (a.entity_type === "lead") return `/admin/crm?lead=${a.entity_id}` as Route;
  if (a.entity_type === "stage") return "/admin/crm";
  if (a.entity_type === "viewing") return `/admin/calendar${viewingMonths[a.entity_id] ? `?month=${viewingMonths[a.entity_id]}` : ""}` as Route;
  return null;
}

export function ActivityFeed({ items, now, viewingMonths }: { items: Activity[]; now: number; viewingMonths: Record<string, string> }) {
  if (items.length === 0) {
    return <EmptyState title="No activity yet">New enquiries, CRM moves and viewings will show up here as they happen.</EmptyState>;
  }
  return (
    <ol className="space-y-1">
      {items.map((a) => {
        const href = activityHref(a, viewingMonths);
        const body = (
          <>
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-cream text-forest">
              <Icon name={ACTIVITY_ICON[a.entity_type] ?? "dashboard"} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.86rem] leading-snug text-forest">{a.summary}</span>
              <time dateTime={a.created_at} title={formatDateTime(a.created_at)} className="text-[0.75rem] text-ink-2">
                {relativeTime(a.created_at, now)}
              </time>
            </span>
          </>
        );
        return (
          <li key={a.id}>
            {href ? (
              <Link href={href} className="flex gap-3 rounded-2xl p-2 transition-colors hover:bg-cream/70">{body}</Link>
            ) : (
              <div className="flex gap-3 p-2">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Compact month view: a dot on each day with viewings, today ringed. */
export function MiniCalendar({
  month,
  label,
  days,
  today,
  byDay,
}: {
  month: string;
  label: string;
  days: { key: string; day: number; inMonth: boolean }[];
  today: string;
  byDay: Record<string, Viewing[]>;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg text-forest">{label}</p>
        <Link href={`/admin/calendar?month=${month}` as Route} className="text-[0.8rem] text-leaf hover:text-forest">Open calendar →</Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-[0.66rem] font-semibold tracking-[0.1em] text-ink-2 uppercase">{w.slice(0, 2)}</span>
        ))}
        {days.map((d) => {
          const list = (byDay[d.key] ?? []).filter((v) => v.status === "requested" || v.status === "confirmed");
          const requested = list.some((v) => v.status === "requested");
          return (
            <Link
              key={d.key}
              href={`/admin/calendar?month=${d.key.slice(0, 7)}#day-${d.key}` as Route}
              aria-label={`${d.key}${list.length ? `: ${list.length} viewing${list.length > 1 ? "s" : ""}` : ""}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-[0.82rem] transition-colors hover:bg-cream ${d.inMonth ? "text-forest" : "text-ink-2/40"} ${d.key === today ? "ring-2 ring-forest" : ""} ${list.length ? "font-semibold" : ""}`}
            >
              {d.day}
              {list.length > 0 && (
                <span className="absolute bottom-1 flex gap-0.5">
                  <span className={`size-1.5 rounded-full ${requested ? "bg-design" : "bg-leaf"}`} />
                  {list.length > 1 && <span className="size-1.5 rounded-full bg-leaf" />}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap gap-4 text-[0.72rem] text-ink-2">
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-leaf" /> Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-design" /> Requested</span>
      </p>
    </div>
  );
}

export function UpcomingViewings({ items }: { items: Viewing[] }) {
  if (items.length === 0) return <p className="text-[0.85rem] text-ink-2">No upcoming viewings.</p>;
  return (
    <ul className="space-y-2">
      {items.map((v) => (
        <li key={v.id}>
          <ViewingTrigger draft={v} className="flex w-full items-center gap-3 rounded-2xl border border-forest/10 p-3 text-left transition-colors hover:bg-cream/70">
            <span className="w-16 shrink-0 text-center">
              <span className="block text-[0.68rem] font-semibold tracking-[0.1em] text-ink-2 uppercase">{formatDateTime(v.starts_at).split(",")[0]}</span>
              <span className="block font-display text-base text-forest">{formatTime(v.starts_at)}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-forest">{v.name}</span>
              <span className="block truncate text-[0.78rem] text-ink-2">{lotLabel(v.lot) ?? "Site visit"}{v.phone ? ` · ${v.phone}` : ""}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${VIEWING_TONE[v.status]}`}>
              {v.status === "requested" ? "Requested" : "Confirmed"}
            </span>
          </ViewingTrigger>
        </li>
      ))}
    </ul>
  );
}
