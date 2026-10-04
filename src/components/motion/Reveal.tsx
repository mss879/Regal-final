"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, REDUCED, MOTION_OK } from "@/lib/gsap";

type Props = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** "self" fades the wrapper; "children" staggers every descendant marked data-reveal. */
  mode?: "self" | "children";
  y?: number;
  delay?: number;
  stagger?: number;
  start?: string;
  id?: string;
};

// Fade + rise on scroll. Elements are hidden by CSS ([data-reveal]) until this runs.
export function Reveal({
  as: Tag = "div",
  children,
  className,
  mode = "self",
  y = 36,
  delay = 0,
  stagger = 0.09,
  start = "top 86%",
  id,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const targets = mode === "self" ? [root] : gsap.utils.toArray<HTMLElement>("[data-reveal]", root);
      if (!targets.length) return;
      const mm = gsap.matchMedia();
      mm.add({ reduce: REDUCED, motion: MOTION_OK }, (ctx) => {
        if (ctx.conditions?.reduce) {
          gsap.set(targets, { autoAlpha: 1, y: 0 });
          return;
        }
        gsap.fromTo(
          targets,
          { autoAlpha: 0, y },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.1,
            delay,
            stagger,
            ease: "power3.out",
            scrollTrigger: { trigger: root, start, once: true },
          },
        );
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} className={className} data-reveal={mode === "self" ? "" : undefined}>
      {children}
    </Tag>
  );
}
