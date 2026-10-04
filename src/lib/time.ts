// Sri Lanka is UTC+05:30 all year (no daylight saving). Every date shown on the site or in the
// admin goes through these helpers, so the server (which runs in UTC) and the browser always
// render identical strings. Never use getDate()/getHours() directly.
export const TZ = "Asia/Colombo";
export const TZ_OFFSET = "+05:30";

type DateInput = Date | string | number;

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts });

/** "4 October 2026" */
export const formatDate = (d: DateInput) => fmt({ day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

/** "4 Oct" */
export const formatDayMonth = (d: DateInput) => fmt({ day: "numeric", month: "short" }).format(new Date(d));

/** "Sat 4 Oct" */
export const formatWeekdayDate = (d: DateInput) => fmt({ weekday: "short", day: "numeric", month: "short" }).format(new Date(d));

/** "3:30 pm" */
export const formatTime = (d: DateInput) =>
  fmt({ hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(d)).replace(/\s?([ap])\.?m\.?/i, " $1m");

/** "Sat 4 Oct, 3:30 pm" */
export const formatDateTime = (d: DateInput) => `${formatWeekdayDate(d)}, ${formatTime(d)}`;

/** "October 2026" */
export const formatMonth = (d: DateInput) => fmt({ month: "long", year: "numeric" }).format(new Date(d));

/** The Sri Lanka calendar date of an instant, as "YYYY-MM-DD". */
export function colomboDateKey(d: DateInput): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

/** The Sri Lanka wall-clock time of an instant, as "HH:MM" (24 h). */
export function colomboTimeKey(d: DateInput): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
}

/** The instant for a Sri Lanka wall-clock date ("2026-10-12") and time ("14:30"). */
export function fromColombo(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00${TZ_OFFSET}`);
}

const DAY_MS = 86_400_000;

/** Adds whole days to a "YYYY-MM-DD" key (calendar arithmetic, timezone-free). */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday, for a "YYYY-MM-DD" key. */
export function weekdayIndex(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** "in 3 days", "2 hours ago" … relative to `now` (pass it in so renders stay pure). */
export function relativeTime(d: DateInput, now: number): string {
  const diff = new Date(d).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", DAY_MS],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "minute") return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, "minute");
}
