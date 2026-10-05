"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, REDUCED } from "@/lib/gsap";
import { introExit } from "@/lib/intro";
import { NAV, SITE } from "@/lib/site";
import { Logo } from "@/components/ui/Logo";
import { Arrow } from "@/components/ui/Button";

// Sits inside the hero card at the top of every page (light on photography), then
// turns into a floating cream pill once scrolled, hiding on scroll-down.
export function Nav() {
  const pathname = usePathname();
  const bar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    (_, contextSafe) => {
      const el = bar.current;
      if (!el || !contextSafe) return;
      // Enters with the hero: straight away, or as the home intro dissolves.
      const enter = contextSafe(() => {
        gsap.fromTo(el, { autoAlpha: 0, y: -16 }, { autoAlpha: 1, y: 0, duration: 1, delay: 0.9, ease: "power3.out" });
      });
      introExit().then(enter);
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const y = self.scroll();
          el.dataset.scrolled = String(y > 60);
          el.dataset.hidden = String(y > 480 && self.direction === 1);
        },
      });
    },
    { scope: bar },
  );

  const toggle = (next: boolean) => {
    setOpen(next);
    const m = menu.current;
    if (!m) return;
    if (next) {
      window.__lenis?.stop();
      const reduce = window.matchMedia(REDUCED).matches;
      gsap.set(m, { display: "flex" });
      gsap.fromTo(m, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: reduce ? 0 : 0.8, ease: "expo.inOut" });
      gsap.fromTo(
        m.querySelectorAll("[data-menu-item]"),
        { yPercent: 110 },
        { yPercent: 0, duration: reduce ? 0 : 0.9, stagger: 0.06, delay: reduce ? 0 : 0.3, ease: "expo.out" },
      );
    } else {
      window.__lenis?.start();
      gsap.to(m, {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.6,
        ease: "expo.inOut",
        onComplete: () => void gsap.set(m, { display: "none" }),
      });
    }
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));

  return (
    <>
      <header
        ref={bar}
        data-scrolled="false"
        data-hidden="false"
        className="group/nav fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-transform duration-500 ease-[var(--ease-out-expo)] data-[hidden=true]:-translate-y-[130%] md:px-4 md:pt-4"
        data-reveal=""
      >
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 rounded-full px-5 py-4 text-paper transition-[background-color,color,box-shadow,padding,max-width] duration-500 ease-[var(--ease-out-expo)] md:px-8 md:py-5 group-data-[scrolled=true]/nav:max-w-[1180px] group-data-[scrolled=true]/nav:bg-paper/85 group-data-[scrolled=true]/nav:py-3 group-data-[scrolled=true]/nav:text-forest group-data-[scrolled=true]/nav:shadow-[0_10px_40px_-12px_rgba(18,35,26,0.35)] group-data-[scrolled=true]/nav:backdrop-blur-xl"
        >
          <Link href="/" className="shrink-0" aria-label={`${SITE.name} — home`}>
            <Logo className="w-[118px] md:w-[138px] group-data-[scrolled=true]/nav:w-[112px] transition-[width] duration-500" />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href as Route}
                  className="group/link relative block rounded-full px-4 py-2 text-[0.86rem] font-medium"
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <span className="relative block overflow-hidden">
                    <span className="block transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/link:-translate-y-full">
                      {item.label}
                    </span>
                    <span aria-hidden className="absolute inset-0 block translate-y-full text-lime transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/link:translate-y-0 group-data-[scrolled=true]/nav:text-leaf">
                      {item.label}
                    </span>
                  </span>
                  {isActive(item.href) && (
                    <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <a href={SITE.phoneHref} className="hidden text-[0.86rem] font-medium opacity-90 hover:opacity-100 xl:block">
              {SITE.phone}
            </a>
            <Link
              href="/contact"
              className="group/btn hidden items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-[0.86rem] font-semibold text-forest transition-colors hover:bg-lime sm:inline-flex group-data-[scrolled=true]/nav:bg-forest group-data-[scrolled=true]/nav:text-paper group-data-[scrolled=true]/nav:hover:bg-leaf"
            >
              Enquire <Arrow />
            </Link>
            <button
              type="button"
              onClick={() => toggle(!open)}
              className="relative flex size-11 items-center justify-center rounded-full border border-current/30 lg:hidden"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              <span className="flex w-4 flex-col gap-1.5">
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <div
        ref={menu}
        id="site-menu"
        data-lenis-prevent
        className="fixed inset-0 z-[60] hidden flex-col justify-between gap-8 overflow-y-auto overscroll-contain bg-forest px-6 pt-6 pb-10 text-paper"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between">
          <Logo className="w-[118px]" />
          <button
            type="button"
            onClick={() => toggle(false)}
            className="flex size-11 items-center justify-center rounded-full border border-paper/30"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 20 20" className="size-4"><path d="m4 4 12 12M16 4 4 16" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {NAV.map((item, i) => (
            <li key={item.href} className="overflow-hidden">
              <Link
                data-menu-item
                href={item.href as Route}
                onClick={() => toggle(false)}
                className="flex items-baseline gap-4 font-display text-[clamp(2.6rem,11vw,4.5rem)] leading-[1.05] font-light uppercase [@media(max-height:560px)]:text-[clamp(1.6rem,7.5svh,2.6rem)]"
              >
                <span className="font-sans text-xs tracking-[0.2em] text-lime">0{i + 1}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="space-y-1 text-sm text-sage-2">
          <a href={SITE.phoneHref} className="block text-paper">{SITE.phone}</a>
          <a href={`mailto:${SITE.email}`} className="block">{SITE.email}</a>
          <p>{SITE.address}</p>
        </div>
      </div>
    </>
  );
}
