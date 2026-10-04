"use client";

import { useRef } from "react";
import { gsap, useGSAP, REDUCED } from "@/lib/gsap";

// Counts up to `value` when scrolled into view. Server HTML shows the final value.
export function Counter({
  value,
  pad = 0,
  suffix = "",
  prefix = "",
  format = false,
  className,
}: {
  value: number;
  pad?: number;
  suffix?: string;
  prefix?: string;
  format?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const render = (n: number) => {
    const r = Math.round(n);
    const s = format ? r.toLocaleString("en-US") : String(r).padStart(pad, "0");
    return `${prefix}${s}${suffix}`;
  };

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || window.matchMedia(REDUCED).matches) return;
      const state = { n: 0 };
      el.textContent = render(0);
      gsap.to(state, {
        n: value,
        duration: 2.2,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: () => {
          el.textContent = render(state.n);
        },
      });
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {render(value)}
    </span>
  );
}
