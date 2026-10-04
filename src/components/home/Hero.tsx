"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, SplitText, useGSAP, REDUCED } from "@/lib/gsap";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import { introHandoff, introPlaying } from "@/lib/intro";
import { SITE } from "@/lib/site";
import { lotCounts } from "@/lib/lots";

const AVATARS = ["/images/lots/lot-10/hero.jpg", "/images/lots/lot-11/hero.jpg", "/images/lots/lot-14-15/hero.jpg"];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const counts = lotCounts();

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const q = gsap.utils.selector(el);
      const reveal = q("[data-reveal]");
      if (window.matchMedia(REDUCED).matches) {
        gsap.set(reveal, { autoAlpha: 1 });
        return;
      }

      const intro = contextSafe(() => {
        gsap.set(reveal, { autoAlpha: 1 });
        const split = SplitText.create(q("[data-hero-title]"), { type: "chars", mask: "chars", aria: "auto" });
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.fromTo(q("[data-hero-card]"), { clipPath: "inset(6% 5% 6% 5% round 48px)" }, { clipPath: "inset(0% 0% 0% 0% round 36px)", duration: 1.6, ease: "expo.inOut" })
          .fromTo(q("[data-hero-img]"), { scale: 1.35 }, { scale: 1, duration: 2.4 }, 0)
          .from(split.chars, { yPercent: 115, duration: 1.4, stagger: 0.035 }, 0.55)
          .from(q("[data-hero-up]"), { y: 40, autoAlpha: 0, duration: 1.2, stagger: 0.08 }, 1.0)
          .from(q("[data-hero-thumb]"), { x: 60, autoAlpha: 0, duration: 1.2, stagger: 0.12 }, 1.1)
          .from(q("[data-hero-line]"), { scaleX: 0, transformOrigin: "left center", duration: 1.4 }, 1.2);
      });
      // Fonts first (SplitText measures them). Then, if the home intro is covering the page,
      // have the photograph decoded before telling it the hero is ready; the entrance starts
      // as the overlay dissolves. With no intro this all resolves straight away.
      let alive = true;
      const photo = introPlaying() ? el.querySelector<HTMLImageElement>("[data-hero-img] img") : null;
      (document.fonts ? document.fonts.ready : Promise.resolve())
        .then(() => photo?.decode().catch(() => {}))
        .then(introHandoff)
        .then(() => {
          if (alive) intro();
        });

      // Scroll: image drifts, headline lifts away, card eases back.
      const st = { trigger: el, start: "top top", end: "bottom top", scrub: true };
      gsap.to(q("[data-hero-img]"), { yPercent: 14, ease: "none", scrollTrigger: st });
      gsap.to(q("[data-hero-title-wrap]"), { yPercent: -35, autoAlpha: 0.2, ease: "none", scrollTrigger: st });
      gsap.to(q("[data-hero-card]"), { scale: 0.94, ease: "none", scrollTrigger: st });

      return () => {
        alive = false;
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-[100svh] min-h-[680px] p-[7px]" aria-labelledby="hero-title">
      <div data-hero-card data-reveal className="relative h-full overflow-hidden rounded-[36px] bg-forest text-paper">
        <div data-hero-img className="absolute inset-0 will-change-transform">
          <Image
            src="/images/brochure/hero-villa.jpg"
            alt="A four-bedroom Regal Victoria Lakeside villa with floor-to-ceiling glazing, set in landscaped lawns beneath tall pines"
            fill
            sizes="100vw"
            quality={90}
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[50%_62%]"
          />
        </div>
        <div aria-hidden className="absolute inset-0 bg-black/35" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-forest/75 via-forest/10 to-transparent" style={{ height: "55%" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-forest/90 via-forest/45 to-transparent" />

        {/* Mega headline */}
        <div data-hero-title-wrap className="absolute inset-x-0 top-[116px] px-5 md:top-[132px] md:px-10">
          <h1 id="hero-title" className="font-display text-mega font-light tracking-[-0.045em] uppercase">
            <span className="sr-only">Regal </span>
            <span data-hero-title className="block">Victoria</span>
            <span data-hero-title className="block pl-[14vw] md:pl-[21vw]">Lakeside</span>
          </h1>
        </div>

        {/* Bottom-left copy */}
        <div className="absolute inset-x-0 bottom-0 grid gap-8 px-5 pb-6 md:px-10 md:pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div data-hero-up className="mb-5 flex items-center gap-3 text-[0.72rem] font-semibold tracking-[0.22em] text-lime uppercase">
              <span className="size-1.5 rounded-full bg-lime" />
              {SITE.location}
            </div>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:gap-8">
              <p data-hero-up className="max-w-xl font-display text-[clamp(1.5rem,2.6vw,2.4rem)] leading-[1.02] font-normal tracking-[-0.01em] uppercase">
                Your private retreat where paradise begins
              </p>
              <p data-hero-up className="max-w-[17rem] text-[0.82rem] leading-relaxed text-paper/75">
                Fully furnished contemporary villas on an elevated lakefront bordering the Victoria Reservoir.
              </p>
            </div>
            <div data-hero-line className="my-6 h-px w-full max-w-xl bg-paper/25" />
            <div data-hero-up className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/#master-plan" variant="light">Explore the villas</ButtonLink>
              <ButtonLink href="/brochure" variant="outline-light" arrow={false}>View brochure</ButtonLink>
            </div>
          </div>

          <div className="hidden items-end gap-8 lg:flex">
            {/* "Residents" style badge — here: sales progress */}
            <div data-hero-up className="flex items-center gap-3 pb-1">
              <div className="flex -space-x-3">
                {AVATARS.map((a) => (
                  <span key={a} className="relative size-11 overflow-hidden rounded-full border-2 border-paper/80">
                    <Image src={a} alt="" fill sizes="44px" className="object-cover" />
                  </span>
                ))}
              </div>
              <div>
                <p className="font-display text-2xl leading-none font-light">
                  {counts.sold} / {counts.total}
                </p>
                <p className="mt-1 text-[0.72rem] text-paper/70">Villas already sold</p>
              </div>
            </div>

            <div className="w-[230px]">
              <Link
                href="/villas"
                data-hero-thumb
                className="group/card flex items-end justify-between rounded-2xl bg-paper p-4 text-forest transition-colors hover:bg-lime"
              >
                <span>
                  <span className="block font-display text-4xl leading-none font-light">0{counts.released}</span>
                  <span className="mt-2 block text-[0.72rem] leading-snug text-ink-2">Villas released,<br />pre-booking open</span>
                </span>
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
