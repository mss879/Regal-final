"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { gsap, SplitText, useGSAP, REDUCED } from "@/lib/gsap";

type Props = {
  eyebrow: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  image: string;
  imageAlt: string;
  imagePosition?: string;
  children?: ReactNode;
  /** Extra content on the image (e.g. a status ribbon). */
  imageOverlay?: ReactNode;
};

// Inner-page hero: a forest card with the headline on the left and a tall image
// on the right, echoing the homepage hero card.
export function PageHero({ eyebrow, title, body, image, imageAlt, imagePosition = "50% 50%", children, imageOverlay }: Props) {
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
        const split = SplitText.create(q("[data-ph-title]"), { type: "lines,words", mask: "lines", aria: "auto" });
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(q("[data-ph-card]"), { clipPath: "inset(4% 4% 4% 4% round 48px)" }, { clipPath: "inset(0% 0% 0% 0% round 36px)", duration: 1.5, ease: "expo.inOut" })
          .fromTo(q("[data-ph-media]"), { clipPath: "inset(100% 0% 0% 0% round 26px)" }, { clipPath: "inset(0% 0% 0% 0% round 26px)", duration: 1.5, ease: "expo.inOut" }, 0.2)
          .fromTo(q("[data-ph-img]"), { scale: 1.4 }, { scale: 1, duration: 2.2 }, 0.3)
          .from(split.words, { yPercent: 115, duration: 1.3, stagger: 0.05 }, 0.55)
          .from(q("[data-ph-up]"), { y: 30, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.9);
      });
      if (document.fonts) document.fonts.ready.then(run);
      else run();
      gsap.to(q("[data-ph-img]"), {
        yPercent: 10,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="p-3 md:p-4">
      <div data-ph-card data-reveal className="grain relative overflow-hidden rounded-[36px] bg-forest text-paper">
        <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-40 size-[560px] rounded-full bg-leaf/25 blur-[140px]" />
        <div className="relative grid min-h-[88svh] gap-10 px-5 pt-32 pb-6 md:px-10 md:pt-36 md:pb-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col justify-end lg:col-span-7 lg:pb-6">
            <div data-ph-up className="eyebrow mb-6 flex items-center gap-3 text-lime">
              <span className="size-1.5 rounded-full bg-lime" />
              {eyebrow}
            </div>
            <h1 data-ph-title className="font-display text-display font-light tracking-[-0.035em] uppercase [&_em]:font-serif [&_em]:tracking-normal [&_em]:text-lime [&_em]:normal-case">
              {title}
            </h1>
            {body && <div data-ph-up className="mt-8 max-w-xl text-[0.98rem] leading-relaxed text-sage-2">{body}</div>}
            {children && <div data-ph-up className="mt-10">{children}</div>}
          </div>
          <div className="lg:col-span-5">
            <div data-ph-media className="relative h-[52svh] overflow-hidden rounded-[26px] lg:h-full lg:min-h-[520px]">
              <div data-ph-img className="absolute inset-0" style={{ scale: 1.1 }}>
                <Image
                  src={image}
                  alt={imageAlt}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  quality={90}
                  loading="eager"
                  fetchPriority="high"
                  className="object-cover"
                  style={{ objectPosition: imagePosition }}
                />
              </div>
              {imageOverlay}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
