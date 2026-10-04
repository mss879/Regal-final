import { addDays, colomboDateKey, fromColombo, weekdayIndex } from "@/lib/time";

/** "2026-10" for the current Sri Lanka month, or the given one if it's valid. */
export function parseMonth(raw: string | undefined, nowMs: number): string {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return raw;
  return colomboDateKey(nowMs).slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** Monday-first weeks covering the month, as "YYYY-MM-DD" keys, plus the UTC range to query. */
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekdayIndex(first);
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const start = addDays(first, -lead);
  const days = Array.from({ length: cells }, (_, i) => {
    const key = addDays(start, i);
    return { key, day: Number(key.slice(8)), inMonth: key.startsWith(month) };
  });
  return { days, from: fromColombo(start), to: fromColombo(addDays(start, cells)) };
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
