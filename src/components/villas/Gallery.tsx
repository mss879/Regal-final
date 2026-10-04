"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, REDUCED } from "@/lib/gsap";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/counter.css";

export type GallerySlide = { src: string; width: number; height: number; alt?: string };

const STYLES = {
  container: { backgroundColor: "rgba(12, 24, 17, 0.97)" },
  thumbnailsContainer: { backgroundColor: "rgba(12, 24, 17, 0.97)" },
};

function useLightbox(slides: GallerySlide[], autoplay: boolean) {
  const [index, setIndex] = useState(-1);
  const lightbox = (
    <Lightbox
      open={index >= 0}
      index={Math.max(index, 0)}
      close={() => setIndex(-1)}
      slides={slides.map((s) => ({ src: s.src, width: s.width, height: s.height, alt: s.alt }))}
      plugins={[Zoom, Thumbnails, Slideshow, Counter]}
      slideshow={{ autoplay, delay: 3200 }}
      thumbnails={{ width: 110, height: 72, border: 0, borderRadius: 6, gap: 10, padding: 0 }}
      zoom={{ maxZoomPixelRatio: 2.5 }}
      carousel={{ finite: false }}
      animation={{ fade: 400, swipe: 450 }}
      on={{ entering: () => window.__lenis?.stop(), exited: () => window.__lenis?.start() }}
      styles={STYLES}
    />
  );
  return { open: setIndex, lightbox };
}

// A button (or any trigger) that opens a lightbox on the given slides.
export function LightboxButton({
  slides,
  children,
  className,
  label,
  autoplay = false,
  start = 0,
}: {
  slides: GallerySlide[];
  children: ReactNode;
  className?: string;
  label: string;
  autoplay?: boolean;
  start?: number;
}) {
  const { open, lightbox } = useLightbox(slides, autoplay);
  return (
    <>
      <button type="button" className={className} onClick={() => open(start)} aria-label={label}>
        {children}
      </button>
      {lightbox}
    </>
  );
}

// A staggered grid of thumbnails, each opening the lightbox at its slide.
export function GalleryGrid({
  slides,
  className = "",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  captions = false,
  ratio,
}: {
  slides: GallerySlide[];
  className?: string;
  sizes?: string;
  captions?: boolean;
  /** Give every thumbnail the same frame (e.g. "4 / 3"); the lightbox still shows the whole image. */
  ratio?: string;
}) {
  const { open, lightbox } = useLightbox(slides, false);
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", root.current);
      if (window.matchMedia(REDUCED).matches) {
        gsap.set(items, { autoAlpha: 1 });
        return;
      }
      ScrollTrigger.batch(items, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(batch, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 1, ease: "power3.out" }),
      });
    },
    { scope: root },
  );

  return (
    <>
      <div ref={root} className={className}>
        {slides.map((s, i) => (
          <button
            key={s.src}
            type="button"
            data-reveal
            onClick={() => open(i)}
            className="group/g block w-full text-left"
            aria-label={`Open image ${i + 1} of ${slides.length}${s.alt ? `: ${s.alt}` : ""}`}
          >
            <span className="relative block overflow-hidden rounded-[18px] bg-cream-2" style={{ aspectRatio: ratio ?? `${s.width} / ${s.height}` }}>
              <Image
                src={s.src}
                alt={s.alt ?? ""}
                fill
                sizes={sizes}
                className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover/g:scale-[1.04]"
              />
              <span className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-forest/60 via-transparent to-transparent p-4 text-paper opacity-0 transition-opacity duration-500 group-hover/g:opacity-100">
                <span className="font-display text-sm">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex size-9 items-center justify-center rounded-full bg-paper/90 text-forest">
                  <svg viewBox="0 0 20 20" className="size-4"><path d="M8.5 3.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2.5v5M6 8.5h5m1.5 3.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </span>
              </span>
            </span>
            {captions && s.alt && <span className="mt-3 block text-[0.8rem] tracking-wide text-ink-2 uppercase">{s.alt}</span>}
          </button>
        ))}
      </div>
      {lightbox}
    </>
  );
}
