"use client";

import { useEffect, useRef, useState } from "react";
import { formatDayMonth, formatWeekdayDate } from "@/lib/time";

export type DailyPoint = { date: string; views: number; visitors: number };

const HEIGHT = 230;
const M = { top: 12, right: 8, bottom: 26, left: 40 };
const BAR = "#5c8c45"; // leaf — validated against the card surface (see dataviz checks)
const BAR_HOVER = "#7fae5f";

function niceMax(max: number) {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= max)! * pow;
  return step * 4;
}

// Rounded 4px data-end, square at the baseline.
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Daily unique visitors as columns, with a per-day tooltip (pointer and arrow keys). */
export function TrafficChart({ daily }: { daily: DailyPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = daily.length;
  const max = niceMax(Math.max(0, ...daily.map((d) => d.visitors)));
  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const band = plotW / Math.max(1, n);
  const barW = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => M.top + plotH - (v / max) * plotH;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 70))));
  const point = active !== null ? daily[active] : null;
  const total = daily.reduce((s, d) => s + d.visitors, 0);

  const indexAt = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left - M.left;
    return Math.min(n - 1, Math.max(0, Math.floor(x / band)));
  };

  return (
    <div ref={wrap} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Daily unique visitors over the last ${n} days: ${total} in total. Use the left and right arrow keys to read each day.`}
        tabIndex={0}
        className="block max-w-full overflow-visible rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"
        onPointerMove={(e) => setActive(indexAt(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
          else if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
          else return;
          e.preventDefault();
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="rgba(18,35,26,0.1)" strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-2 text-[11px] tabular-nums">
              {t.toLocaleString("en-US")}
            </text>
          </g>
        ))}
        {daily.map((d, i) => {
          const h = (d.visitors / max) * plotH;
          const x = M.left + i * band + (band - barW) / 2;
          return h > 0 ? <path key={d.date} d={barPath(x, y(d.visitors), barW, h)} fill={i === active ? BAR_HOVER : BAR} /> : null;
        })}
        {active !== null && (
          <line x1={M.left + active * band + band / 2} x2={M.left + active * band + band / 2} y1={M.top} y2={M.top + plotH} stroke="rgba(18,35,26,0.25)" strokeWidth={1} pointerEvents="none" />
        )}
        {daily.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={d.date} x={M.left + i * band + band / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-ink-2 text-[11px]">
              {formatDayMonth(d.date)}
            </text>
          ) : null,
        )}
      </svg>

      <div aria-live="polite" className="pointer-events-none absolute top-0" style={{ left: point ? Math.min(width - 170, Math.max(0, M.left + active! * band + band / 2 - 80)) : 0 }}>
        {point && (
          <div className="w-40 rounded-xl border border-forest/10 bg-paper px-3 py-2 shadow-lg">
            <p className="text-[0.72rem] text-ink-2">{formatWeekdayDate(point.date)}</p>
            <p className="mt-1 flex items-center gap-2 text-[0.85rem]">
              <span className="h-0.5 w-3 rounded-full" style={{ background: BAR }} />
              <strong className="font-semibold text-forest">{point.visitors.toLocaleString("en-US")}</strong>
              <span className="text-ink-2">visitors</span>
            </p>
            <p className="mt-0.5 pl-5 text-[0.78rem] text-ink-2">{point.views.toLocaleString("en-US")} page views</p>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Visitors and page views per day</caption>
        <thead>
          <tr><th scope="col">Date</th><th scope="col">Visitors</th><th scope="col">Page views</th></tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.date}><th scope="row">{d.date}</th><td>{d.visitors}</td><td>{d.views}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
