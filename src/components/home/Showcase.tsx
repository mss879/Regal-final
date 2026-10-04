"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, REDUCED } from "@/lib/gsap";
import { LightboxButton, type GallerySlide } from "@/components/villas/Gallery";
import { SplitHeading } from "@/components/motion/SplitHeading";
import { Reveal } from "@/components/motion/Reveal";
import { introExit } from "@/lib/intro";
import { COPY } from "@/lib/site";

// Full-bleed aerial video that opens out from an inset card as it scrolls into view,
// and autoplays smoothly when the user arrives at this section.
export function Showcase({ brochure }: { brochure?: GallerySlide[] }) {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // The video is 13.8 MB. Leave the network to the hero (and the home intro) until the page
  // has loaded, then let it buffer; playing and pausing stay with the observers below.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let alive = true;
    const buffer = () => {
      if (alive) video.preload = "auto";
    };
    introExit().then(() => {
      if (document.readyState === "complete") buffer();
      else window.addEventListener("load", buffer, { once: true });
    });
    return () => {
      alive = false;
      window.removeEventListener("load", buffer);
    };
  }, []);

  // IntersectionObserver to guarantee play/pause sync when in/out of viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure muted property is set programmatically for strict browser policies
    video.muted = true;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => { });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);

      // Autoplay with ScrollTrigger when user reaches this section
      ScrollTrigger.create({
        trigger: q("[data-show-frame]")[0] ?? el,
        start: "top 80%",
        end: "bottom 15%",
        onEnter: () => {
          const v = videoRef.current;
          if (v && v.paused) v.play().catch(() => { });
        },
        onLeave: () => {
          videoRef.current?.pause();
        },
        onEnterBack: () => {
          const v = videoRef.current;
          if (v && v.paused) v.play().catch(() => { });
        },
        onLeaveBack: () => {
          videoRef.current?.pause();
        },
      });

      if (window.matchMedia(REDUCED).matches) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: q("[data-show-frame]")[0], start: "top 95%", end: "center 55%", scrub: 1 },
      });

      tl.fromTo(
        q("[data-show-frame]"),
        { clipPath: "inset(0% 4% 0% 4% round 28px)" },
        { clipPath: "inset(0% 0% 0% 0% round 36px)", ease: "none" },
      );
    },
    { scope: root },
  );

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => { });
    } else {
      v.pause();
    }
  };

  return (
    <section ref={root} className="pb-28 md:pb-40" aria-labelledby="showcase-title">
      <div className="px-3 sm:px-5 md:px-6">
        <div
          data-show-frame
          className="relative mx-auto w-full aspect-video max-w-[min(1440px,calc(80vh*16/9))] max-h-[80vh] overflow-hidden rounded-[24px] bg-forest sm:rounded-[30px] md:rounded-[36px]"
        >
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              src="/VIDEO-2026-09-17-00-58-05-smooth-slow-1080p.mp4"
              poster="/VIDEO-2026-09-17-00-58-05-smooth-poster.jpg"
              muted
              loop
              playsInline
              preload="none"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="size-full object-cover"
            />
          </div>

          {/* Minimal bottom gradient for button legibility without darkening the video */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Badges and Play/Pause control */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:gap-4 sm:p-6 md:p-7">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-forest/80 px-3.5 py-1.5 text-[0.7rem] font-medium tracking-[0.14em] text-paper uppercase backdrop-blur-md shadow-lg sm:px-4 sm:py-2 sm:text-[0.72rem]">
                <span className="size-2 rounded-full bg-leaf animate-pulse" />
                Victoria Reservoir · Aerial
              </span>
              {brochure && brochure.length > 0 && (
                <LightboxButton
                  slides={brochure}
                  label="View brochure pages"
                  className="inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-3 py-1.5 text-[0.7rem] font-medium tracking-[0.1em] text-forest uppercase backdrop-blur-md shadow-lg transition-all hover:bg-paper hover:scale-105 active:scale-95 sm:px-3.5 sm:py-2 sm:text-[0.72rem]"
                >
                  <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                  <span>Brochure ({brochure.length}p)</span>
                </LightboxButton>
              )}
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause video" : "Play video"}
                className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-paper/90 text-forest shadow-xl backdrop-blur-md transition-all duration-300 hover:bg-paper hover:scale-110 active:scale-95"
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="size-4 fill-current ml-0.5" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-x mt-10 grid gap-8 md:mt-14 md:grid-cols-12 md:items-end">
        <SplitHeading
          id="showcase-title"
          by="lines"
          className="font-display text-title font-normal tracking-[-0.02em] text-forest uppercase md:col-span-5 [&_em]:text-leaf [&_em]:not-italic"
        >
          <em>A rare</em> collection <br />
          <em>by the</em> lake
        </SplitHeading>
        <Reveal className="text-[0.92rem] leading-relaxed text-ink-2 md:col-span-4">
          <p>{COPY.collection}</p>
        </Reveal>
        <Reveal className="text-[0.8rem] leading-relaxed text-ink-2 md:col-span-3 md:text-right">
          <p className="font-semibold text-forest">Victoria Reservoir</p>
          <p>Digana, Kandy · Sri Lanka</p>
        </Reveal>
      </div>
    </section>
  );
}
