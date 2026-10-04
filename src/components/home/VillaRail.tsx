"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, REDUCED } from "@/lib/gsap";

// Desktop: pins the section and scrubs the card track sideways.
// Below lg (or with reduced motion): a native, snap-scrolling horizontal track.
export function VillaRail({ header, children, count }: { header: ReactNode; children: ReactNode; count: number }) {
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023.98px)", reduce: REDUCED }, (ctx) => {
        const t = track.current;
        const s = section.current;
        if (!t || !s) return;
        const cards = gsap.utils.toArray<HTMLElement>("[data-villa-card]", t);
        if (!ctx.conditions?.desktop || ctx.conditions.reduce) {
          gsap.set(cards, { autoAlpha: 1 });
          return;
        }
        const dist = () => Math.max(0, t.scrollWidth - t.clientWidth);
        gsap.to(t, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: {
            trigger: s,
            pin: true,
            scrub: 1,
            start: "top top",
            end: () => `+=${dist()}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: (self) => gsap.set(bar.current, { scaleX: self.progress }),
          },
        });
        gsap.from(cards, {
          y: 80,
          rotate: 2,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 1.2,
          ease: "expo.out",
          scrollTrigger: { trigger: s, start: "top 70%", once: true },
        });
      });
    },
    { scope: section },
  );

  return (
    <div ref={section} className="flex min-h-[100svh] flex-col justify-center overflow-hidden py-20 lg:py-10">
      {header}
      <div
        ref={track}
        data-lenis-prevent-wheel=""
        className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[max(1rem,calc((100vw-1480px)/2+2.5rem))] pb-4 lg:mt-14 lg:snap-none lg:gap-7 lg:overflow-visible"
      >
        {children}
        <div aria-hidden className="w-2 shrink-0 lg:w-[4vw]" />
      </div>
      <div className="container-x mt-8 flex items-center gap-6">
        <div className="relative h-px flex-1 bg-forest/15">
          <div ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-forest" />
        </div>
        <p className="font-display text-sm text-ink-2 tabular-nums">{String(count).padStart(2, "0")} villas</p>
      </div>
    </div>
  );
}
