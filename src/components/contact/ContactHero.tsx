"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, SplitText, useGSAP, REDUCED } from "@/lib/gsap";
import { IMAGES } from "@/lib/images";

// Contact hero: forest card over a faint lake image, with the form panel sliding in.
export function ContactHero({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const q = gsap.utils.selector(el);
      if (window.matchMedia(REDUCED).matches) {
        gsap.set(q("[data-reveal]"), { autoAlpha: 1 });
        return;
      }
      const run = contextSafe(() => {
        gsap.set(q("[data-reveal]"), { autoAlpha: 1 });
        const split = SplitText.create(q("[data-ch-title]"), { type: "lines,words", mask: "lines", aria: "auto" });
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(q("[data-ch-card]"), { clipPath: "inset(4% 4% 4% 4% round 48px)" }, { clipPath: "inset(0% 0% 0% 0% round 36px)", duration: 1.5, ease: "expo.inOut" })
          .fromTo(q("[data-ch-bg]"), { scale: 1.3 }, { scale: 1, duration: 2.4 }, 0)
          .from(split.words, { yPercent: 115, duration: 1.3, stagger: 0.06 }, 0.5)
          .from(q("[data-ch-up]"), { y: 30, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.8)
          .from(q("[data-ch-form]"), { y: 80, autoAlpha: 0, duration: 1.4 }, 0.7);
      });
      if (document.fonts) document.fonts.ready.then(run);
      else run();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="p-3 md:p-4">
      <div data-ch-card data-reveal className="grain relative overflow-hidden rounded-[36px] bg-forest">
        <div data-ch-bg className="absolute inset-0 opacity-30">
          <Image src={IMAGES.contactTexture} alt="" fill sizes="100vw" loading="eager" className="object-cover" />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-forest via-forest/90 to-forest/60" />
        <div className="relative px-5 pt-32 pb-6 md:px-10 md:pt-40 md:pb-10">{children}</div>
      </div>
    </section>
  );
}
