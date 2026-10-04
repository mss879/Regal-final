"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, SplitText, useGSAP, REDUCED } from "@/lib/gsap";

type Props = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** "lines" slides whole lines up out of a mask; "chars" staggers letters. */
  by?: "lines" | "words" | "chars";
  delay?: number;
  start?: string;
  /** Play immediately on mount instead of on scroll (hero headlines). */
  immediate?: boolean;
  /** Colour-sweep nested <em> accents from ink to leaf once revealed. */
  accent?: boolean;
  id?: string;
};

// Masked text reveal using GSAP SplitText. Waits for web fonts so line breaks
// are measured correctly; autoSplit re-splits on resize.
export function SplitHeading({
  as: Tag = "h2",
  children,
  className,
  by = "lines",
  delay = 0,
  start = "top 85%",
  immediate = false,
  accent = false,
  id,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = ref.current;
      if (!el || !contextSafe) return;
      if (window.matchMedia(REDUCED).matches) {
        gsap.set(el, { autoAlpha: 1 });
        return;
      }
      const run = contextSafe(() => {
        gsap.set(el, { autoAlpha: 1 });
        SplitText.create(el, {
          type: by === "lines" ? "lines" : by === "words" ? "lines,words" : "lines,words,chars",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          aria: "auto",
          onSplit: (self) => {
            const parts = by === "lines" ? self.lines : by === "words" ? self.words : self.chars;
            const tl = gsap.timeline({
              delay,
              scrollTrigger: immediate ? undefined : { trigger: el, start, once: true },
            });
            tl.from(parts, {
              yPercent: 115,
              rotate: by === "chars" ? 4 : 0,
              duration: by === "chars" ? 1.1 : 1.25,
              stagger: by === "chars" ? 0.028 : by === "words" ? 0.045 : 0.1,
              ease: "expo.out",
            });
            if (accent) {
              const ems = el.querySelectorAll("em");
              if (ems.length) tl.from(ems, { color: "var(--color-ink)", duration: 1.2, stagger: 0.15, ease: "power2.inOut" }, "-=0.6");
            }
            return tl;
          },
        });
      });
      if (document.fonts) document.fonts.ready.then(run);
      else run();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} className={className} data-reveal="">
      {children}
    </Tag>
  );
}
