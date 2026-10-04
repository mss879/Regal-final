"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, REDUCED, MOTION_OK } from "@/lib/gsap";

type Props = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  imgClassName?: string;
  /** Scrubbed vertical drift of the image inside its frame (percent). 0 disables. */
  parallax?: number;
  /** Wipe the frame open with clip-path when it enters the viewport. */
  reveal?: "up" | "left" | "right" | false;
  eager?: boolean;
  quality?: 75 | 90;
  delay?: number;
  children?: React.ReactNode;
};

// A framed next/image with optional clip-path reveal and scroll parallax.
export function MotionImage({
  src,
  alt,
  sizes,
  className = "",
  imgClassName = "",
  parallax = 4,
  reveal = "up",
  eager = false,
  quality = 75,
  delay = 0,
  children,
}: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const f = frame.current;
      const i = inner.current;
      if (!f || !i) return;
      const mm = gsap.matchMedia();
      mm.add({ reduce: REDUCED, motion: MOTION_OK }, (ctx) => {
        if (ctx.conditions?.reduce) {
          gsap.set(f, { autoAlpha: 1 });
          return;
        }
        if (reveal) {
          const from =
            reveal === "up" ? "inset(100% 0% 0% 0%)" : reveal === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
          gsap
            .timeline({ delay, scrollTrigger: { trigger: f, start: "top 88%", once: true } })
            .fromTo(f, { autoAlpha: 1, clipPath: from }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" })
            .from(i, { scale: 1.2, duration: 1.8, ease: "expo.out" }, 0.1);
        } else {
          gsap.set(f, { autoAlpha: 1 });
        }
        if (parallax) {
          gsap.fromTo(
            i,
            { yPercent: -parallax },
            { yPercent: parallax, ease: "none", scrollTrigger: { trigger: f, start: "top bottom", end: "bottom top", scrub: true } },
          );
        }
      });
    },
    { scope: frame },
  );

  // Just enough overscan to hide the edges while the image drifts ±parallax% — any more
  // enlarges the image past its native resolution for no benefit.
  const scale = parallax ? 1 + (2 * parallax + 1) / 100 : 1;

  return (
    <div ref={frame} className={`relative overflow-hidden ${className}`} data-reveal="">
      <div ref={inner} className="absolute inset-0" style={{ scale }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          loading={eager ? "eager" : undefined}
          fetchPriority={eager ? "high" : undefined}
          className={`object-cover ${imgClassName}`}
        />
      </div>
      {children}
    </div>
  );
}
