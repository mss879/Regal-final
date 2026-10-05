"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Suspense, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { gsap, useGSAP, REDUCED } from "@/lib/gsap";
import { MAP_SIZE, STATUS_LABEL, formatSqft, isOpen, type Lot, type LotStatus } from "@/lib/lots";
import { MAP_PINS } from "@/lib/site";
import { MapDebug } from "./MapDebug";

type MapLot = Pick<Lot, "id" | "label" | "phase" | "status" | "slug" | "perches" | "bedrooms" | "areas" | "tagline" | "hero" | "polygon">;

const TINT: Record<LotStatus, string> = {
  available: "#8fd16a",
  "nearing-completion": "#c5ec8e",
  "design-stage": "#f0c070",
  sold: "#ff4d57",
};

const hrefFor = (lot: MapLot): string | undefined => {
  if (isOpen(lot.status) && lot.slug) return `/villas/${lot.slug}`;
  if (lot.status === "design-stage") return `/contact?lot=${lot.id}`;
  return undefined;
};

const centroid = (pts: [number, number][]) => {
  const [sx, sy] = pts.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / pts.length, sy / pts.length] as const;
};

const toPoints = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");

type Active = { kind: "lot"; id: string } | { kind: "pin"; id: string } | null;

export function InteractiveMap({ lots }: { lots: MapLot[] }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const mover = useRef<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc } | null>(null);
  const pointerType = useRef<string>("mouse");
  const [active, setActive] = useState<Active>(null);
  const [armed, setArmed] = useState<string | null>(null);

  const activeLot = active?.kind === "lot" ? lots.find((l) => l.id === active.id) : undefined;
  const activePin = active?.kind === "pin" ? MAP_PINS.find((p) => p.id === active.id) : undefined;

  useGSAP(
    () => {
      const el = root.current;
      const t = tip.current;
      if (!el || !t) return;
      mover.current = {
        x: gsap.quickTo(t, "x", { duration: 0.45, ease: "power3" }),
        y: gsap.quickTo(t, "y", { duration: 0.45, ease: "power3" }),
      };
      const q = gsap.utils.selector(el);
      if (window.matchMedia(REDUCED).matches) {
        gsap.set(q("[data-reveal]"), { autoAlpha: 1 });
        return;
      }
      const tl = gsap.timeline({ scrollTrigger: { trigger: stage.current, start: "top 75%", once: true } });
      tl.fromTo(q("[data-map-frame]"), { autoAlpha: 0, scale: 0.94, y: 40 }, { autoAlpha: 1, scale: 1, y: 0, duration: 1.4, ease: "expo.out" })
        .fromTo(q("[data-map-img]"), { scale: 1.12, filter: "saturate(0.2) brightness(0.8)" }, { scale: 1, filter: "saturate(1) brightness(1)", duration: 2, ease: "expo.out" }, 0)
        .fromTo(q("[data-lot-outline]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.6, stagger: 0.07, ease: "power2.inOut" }, 0.5)
        .fromTo(q("[data-lot-fills]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1.4)
        .fromTo(q("[data-pin]"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.8, stagger: 0.12, ease: "back.out(2.2)" }, 1.6)
        .fromTo(q("[data-map-rail] li"), { autoAlpha: 0, x: 24 }, { autoAlpha: 1, x: 0, duration: 0.8, stagger: 0.04 }, 0.8);
    },
    { scope: root },
  );

  const place = (clientX: number, clientY: number) => {
    const s = stage.current;
    const t = tip.current;
    if (!s || !t || !mover.current) return;
    const r = s.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    const w = t.offsetWidth || 280;
    const h = t.offsetHeight || 160;
    if (x + 22 + w > r.width && x - w - 22 < 0) {
      // No room beside the point (phones): dock the card under the plan, so every lot stays tappable.
      mover.current.x(Math.max((r.width - w) / 2, 0));
      mover.current.y(r.height + 12);
      return;
    }
    const nx = x + 22 + w > r.width ? x - w - 22 : x + 22;
    const ny = Math.min(Math.max(y - h / 2, 8), r.height - h - 8);
    mover.current.x(nx);
    mover.current.y(ny);
  };

  // Anchor the tooltip to a point in map space (keyboard focus / touch).
  const placeAt = (mx: number, my: number) => {
    const s = stage.current;
    if (!s) return;
    const r = s.getBoundingClientRect();
    place(r.left + (mx / MAP_SIZE.width) * r.width, r.top + (my / MAP_SIZE.height) * r.height);
  };

  const onMove = (e: ReactPointerEvent) => {
    pointerType.current = e.pointerType;
    if (e.pointerType === "mouse") place(e.clientX, e.clientY);
  };

  const enter = (next: Active, e?: ReactPointerEvent) => {
    if (e && e.pointerType !== "mouse") return;
    setActive(next);
  };

  const activate = (lot: MapLot) => {
    const href = hrefFor(lot);
    if (pointerType.current !== "mouse" && armed !== lot.id) {
      // First tap on touch: show the card, second tap follows it.
      setArmed(lot.id);
      setActive({ kind: "lot", id: lot.id });
      placeAt(...centroid(lot.polygon));
      return;
    }
    if (href) router.push(href as Route);
  };

  const dim = active !== null;

  return (
    <div ref={root} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
      <div
        ref={stage}
        className="relative"
        onPointerMove={onMove}
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
          // Touch: a tap on the plan away from any lot, pin or the card closes the card.
          if (e.pointerType !== "mouse" && !(e.target as Element).closest("a, [tabindex], [role=status]")) {
            setActive(null);
            setArmed(null);
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setActive(null);
        }}
      >
        <div data-map-frame data-reveal className="relative aspect-[3/2] overflow-hidden rounded-[28px] bg-[#467f71] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.6)] ring-1 ring-paper/10">
          <div data-map-img className="absolute inset-0">
            <Image
              src="/images/map/site-plan.png"
              alt="Site plan of Regal Victoria Lakeside showing 15 villa lots on a peninsula of the Victoria Reservoir"
              fill
              sizes="(min-width: 1280px) 1100px, 100vw"
              quality={90}
              className="object-contain"
            />
          </div>

          <svg
            viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 size-full"
            role="group"
            aria-label="Interactive master plan"
          >
            <defs>
              <mask id="rvl-spot">
                <rect width="100%" height="100%" fill="white" />
                {activeLot && <polygon points={toPoints(activeLot.polygon)} fill="black" />}
              </mask>
              <filter id="rvl-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Spotlight: darken everything except the hovered lot */}
            <rect
              width="100%"
              height="100%"
              fill="#0b1a12"
              mask="url(#rvl-spot)"
              className="pointer-events-none transition-opacity duration-500"
              style={{ opacity: activeLot ? 0.42 : 0 }}
            />

            <g data-lot-fills>
              {lots.map((lot) => {
                const isActive = activeLot?.id === lot.id;
                const href = hrefFor(lot);
                const sold = lot.status === "sold";
                const common = {
                  "aria-label": `${lot.label} — ${STATUS_LABEL[lot.status]}${lot.bedrooms ? `, ${lot.bedrooms} bedrooms` : ""}`,
                  onPointerEnter: (e: ReactPointerEvent) => enter({ kind: "lot", id: lot.id }, e),
                  onPointerLeave: (e: ReactPointerEvent) => {
                    if (e.pointerType === "mouse") setActive(null);
                  },
                  onFocus: () => {
                    setActive({ kind: "lot", id: lot.id });
                    placeAt(...centroid(lot.polygon));
                  },
                  onBlur: () => setActive(null),
                  className: "outline-none",
                };
                const shape = (
                  <polygon
                    points={toPoints(lot.polygon)}
                    fill={TINT[lot.status]}
                    stroke={TINT[lot.status]}
                    strokeWidth={isActive ? 3 : 0}
                    vectorEffect="non-scaling-stroke"
                    filter={isActive ? "url(#rvl-glow)" : undefined}
                    className="transition-[fill-opacity,stroke-width] duration-300"
                    style={{
                      fillOpacity: isActive ? (sold ? 0.5 : 0.42) : dim ? 0.05 : 0.14,
                      cursor: sold ? "not-allowed" : "pointer",
                    }}
                  />
                );
                return href ? (
                  <a
                    key={lot.id}
                    href={href}
                    {...common}
                    onClick={(e) => {
                      e.preventDefault();
                      activate(lot);
                    }}
                  >
                    {shape}
                  </a>
                ) : (
                  <g
                    key={lot.id}
                    role="img"
                    tabIndex={0}
                    {...common}
                    onClick={() => {
                      if (pointerType.current !== "mouse") {
                        setArmed(lot.id);
                        setActive({ kind: "lot", id: lot.id });
                        placeAt(...centroid(lot.polygon));
                      }
                    }}
                  >
                    {shape}
                  </g>
                );
              })}
            </g>

            {/* Outlines drawn on when the section enters */}
            <g className="pointer-events-none" fill="none">
              {lots.map((lot) => (
                <polygon
                  key={lot.id}
                  data-lot-outline
                  points={toPoints(lot.polygon)}
                  stroke={TINT[lot.status]}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ opacity: dim && activeLot?.id !== lot.id ? 0.25 : 0.95, transition: "opacity .3s" }}
                />
              ))}
            </g>

            {/* Amenity pins */}
            {MAP_PINS.map((p) => (
              <g
                key={p.id}
                data-pin
                tabIndex={0}
                role="img"
                aria-label={`${p.label}: ${p.detail}`}
                className="cursor-help outline-none"
                onPointerEnter={(e) => enter({ kind: "pin", id: p.id }, e)}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setActive(null);
                }}
                onFocus={() => {
                  setActive({ kind: "pin", id: p.id });
                  placeAt(p.x, p.y);
                }}
                onBlur={() => setActive(null)}
                onClick={() => {
                  setActive({ kind: "pin", id: p.id });
                  placeAt(p.x, p.y);
                }}
              >
                <circle cx={p.x} cy={p.y} r={16} fill="#fff" className="pin-pulse" opacity={0.6} />
                <circle cx={p.x} cy={p.y} r={30} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={11} fill="#12231a" stroke="#fff" strokeWidth={3} />
                <circle cx={p.x} cy={p.y} r={4} fill="#c5dc9f" />
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="pointer-events-none absolute top-4 left-4 hidden gap-2 sm:flex">
            {(["available", "nearing-completion", "design-stage", "sold"] as LotStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-2 rounded-full bg-forest/70 px-3 py-1.5 text-[0.66rem] font-semibold tracking-[0.12em] text-paper uppercase backdrop-blur-md">
                <span className="size-2 rounded-full" style={{ background: TINT[s] }} />
                {STATUS_LABEL[s]}
              </span>
            ))}
          </div>
        </div>

        {/* Tooltip card */}
        <div
          ref={tip}
          role="status"
          aria-live="polite"
          className={`absolute top-0 left-0 z-10 w-[270px] transition-opacity duration-300 ${active ? "opacity-100" : "pointer-events-none opacity-0"} ${armed ? "" : "pointer-events-none"}`}
        >
          {activeLot && <LotCard lot={activeLot} armed={armed === activeLot.id} />}
          {activePin && (
            <div className="rounded-2xl bg-paper p-4 text-forest shadow-2xl">
              <p className="eyebrow text-leaf">Amenity</p>
              <p className="mt-1 font-display text-xl">{activePin.label}</p>
              <p className="mt-1 text-[0.8rem] text-ink-2">{activePin.detail}</p>
            </div>
          )}
        </div>

        {process.env.NODE_ENV !== "production" && (
          <Suspense fallback={null}>
            <MapDebug lots={lots} />
          </Suspense>
        )}
      </div>

      {/* Lot rail */}
      <aside data-map-rail aria-label="All lots" className="text-paper">
        {[2, 1].map((phase) => (
          <div key={phase} className="mb-6 last:mb-0">
            <p className="eyebrow mb-3 flex items-center justify-between text-sage">
              <span>Phase 0{phase}</span>
              <span className={`h-[2px] w-10 ${phase === 1 ? "border-t-2 border-dashed border-[#5b8cff]" : "border-t-2 border-dashed border-[#ff4d57]"}`} />
            </p>
            <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-1">
              {lots
                .filter((l) => l.phase === phase)
                .map((lot) => {
                  const href = hrefFor(lot);
                  const isActive = activeLot?.id === lot.id;
                  const body = (
                    <>
                      <span className="flex items-center gap-3">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: TINT[lot.status] }} />
                        <span className="font-display text-[0.9rem] whitespace-nowrap sm:text-[0.95rem]">{lot.label}</span>
                      </span>
                      <span className={`text-[0.62rem] tracking-[0.1em] whitespace-nowrap uppercase ${lot.status === "sold" ? "text-[#ff8a90]" : "text-sage"}`}>
                        {lot.bedrooms ? `${lot.bedrooms} bed` : lot.status === "design-stage" ? "Design" : STATUS_LABEL[lot.status]}
                      </span>
                    </>
                  );
                  const cls = `flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 sm:gap-3 sm:px-3.5 transition-colors duration-300 ${
                    isActive ? "border-paper/40 bg-paper/10" : "border-paper/10 hover:border-paper/30"
                  } ${lot.status === "sold" ? "cursor-not-allowed opacity-70" : ""}`;
                  return (
                    <li
                      key={lot.id}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse") setActive({ kind: "lot", id: lot.id });
                      }}
                      onPointerLeave={(e) => {
                        if (e.pointerType === "mouse") setActive(null);
                      }}
                    >
                      {href ? (
                        <Link href={href as Route} className={cls}>{body}</Link>
                      ) : (
                        <div className={cls} aria-label={`${lot.label} — sold`}>{body}</div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
        <p className="mt-6 text-[0.75rem] leading-relaxed text-sage">
          <span className="pointer-coarse:hidden">Hover</span>
          <span className="hidden pointer-coarse:inline">Tap</span> a lot for details. Available villas open their full catalogue; sold
          lots are shown in red.
        </p>
      </aside>
    </div>
  );
}

// A zoomed crop of the site plan around one lot — the preview for lots without renders.
function PlanPreview({ lot }: { lot: MapLot }) {
  const xs = lot.polygon.map((p) => p[0]);
  const ys = lot.polygon.map((p) => p[1]);
  const pad = 60;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const sold = lot.status === "sold";
  const tint = sold ? "#b3262e" : "#b98a52";
  return (
    <div className="relative aspect-[16/9] overflow-hidden">
      <svg viewBox={`${minX} ${minY} ${w} ${h}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <image href="/images/map/site-plan.png" width={MAP_SIZE.width} height={MAP_SIZE.height} />
        <rect x={minX} y={minY} width={w} height={h} fill={sold ? "#3a0508" : "#2a1a05"} opacity={0.45} />
        <polygon points={toPoints(lot.polygon)} fill={tint} fillOpacity={0.55} stroke={sold ? "#ff4d57" : "#f0c070"} strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-md border-2 px-3 py-1 font-display text-2xl font-medium tracking-[0.2em] uppercase ${
          sold ? "border-[#ff8a90] text-[#ffd9db]" : "border-[#f0c070] text-[#fff1d6]"
        }`}
      >
        {sold ? "Sold" : "In design"}
      </span>
    </div>
  );
}

function LotCard({ lot, armed }: { lot: MapLot; armed: boolean }) {
  const sold = lot.status === "sold";
  const href = hrefFor(lot);
  return (
    <div className={`overflow-hidden rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] ${sold ? "bg-[#2a0f12] text-paper" : "bg-paper text-forest"}`}>
      {!lot.hero && <PlanPreview lot={lot} />}
      {lot.hero && (
        <div className="relative aspect-[16/9]">
          <Image src={lot.hero} alt="" fill sizes="270px" className="object-cover" />
          <span
            className="absolute top-3 left-0 py-1 pr-3 pl-3 font-display text-[0.62rem] font-medium tracking-[0.18em] uppercase"
            style={{ background: TINT[lot.status], color: "#12231a" }}
          >
            {STATUS_LABEL[lot.status]}
          </span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-2xl leading-none">{lot.label}</p>
          <p className={`text-[0.7rem] tracking-[0.12em] uppercase ${sold ? "text-paper/60" : "text-ink-2"}`}>Phase 0{lot.phase}</p>
        </div>
        {lot.perches ? (
          <>
            <p className="mt-2 text-[0.8rem] leading-snug text-ink-2">{lot.tagline}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-forest/10 pt-3 text-center">
              <div>
                <dt className="text-[0.6rem] tracking-[0.12em] text-ink-2 uppercase">Land</dt>
                <dd className="font-display text-base">{lot.perches} p</dd>
              </div>
              <div>
                <dt className="text-[0.6rem] tracking-[0.12em] text-ink-2 uppercase">Beds</dt>
                <dd className="font-display text-base">{lot.bedrooms}</dd>
              </div>
              <div>
                <dt className="text-[0.6rem] tracking-[0.12em] text-ink-2 uppercase">Sq ft</dt>
                <dd className="font-display text-base">{lot.areas ? formatSqft(lot.areas.total) : "—"}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className={`mt-2 text-[0.8rem] leading-snug ${sold ? "text-paper/70" : "text-ink-2"}`}>
            {sold ? "This villa has found its owner." : "Plans for this lot are being drawn up — register your interest."}
          </p>
        )}
        {href ? (
          armed ? (
            <Link href={href as Route} className="mt-4 flex items-center justify-between rounded-full bg-forest px-4 py-2.5 text-[0.8rem] font-semibold text-paper">
              {isOpen(lot.status) ? "View villa" : "Enquire"} <span aria-hidden>→</span>
            </Link>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[0.75rem] font-semibold text-leaf">
              {isOpen(lot.status) ? "Click to view the villa" : "Click to enquire"} <span aria-hidden>→</span>
            </p>
          )
        ) : (
          <p className="mt-3 flex items-center gap-2 text-[0.72rem] font-semibold tracking-[0.14em] text-[#ff8a90] uppercase">
            <span className="size-1.5 rounded-full bg-[#ff4d57]" /> Sold
          </p>
        )}
      </div>
    </div>
  );
}
