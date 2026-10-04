"use client";

import { useRef } from "react";
import { gsap, useGSAP, REDUCED } from "@/lib/gsap";

// Footer entrance: columns rise, the giant logo wipes up from its baseline.
export function FooterReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", root);
      const logo = root.querySelector<HTMLElement>("[data-footer-logo]");
      if (window.matchMedia(REDUCED).matches) {
        gsap.set(items, { autoAlpha: 1 });
        return;
      }
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, stagger: 0.12, duration: 1.1, scrollTrigger: { trigger: root, start: "top 80%", once: true } },
      );
      if (logo) {
        gsap.fromTo(
          logo,
          { clipPath: "inset(100% 0 0 0)", yPercent: 30 },
          {
            clipPath: "inset(0% 0 0 0)",
            yPercent: 0,
            ease: "none",
            scrollTrigger: { trigger: logo, start: "top bottom", end: "bottom bottom", scrub: 0.8 },
          },
        );
      }
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
