import type { CSSProperties } from "react";

// The brochure logo, stored as an alpha mask so it takes the current text colour.
const LOGO = { src: "/images/brand/logo-mask.png", ratio: 1200 / 513 };
const EMBLEM = { src: "/images/brand/emblem-mask.png", ratio: 1200 / 1409 };

type Props = { variant?: "full" | "emblem"; className?: string; style?: CSSProperties };

export function Logo({ variant = "full", className = "", style }: Props) {
  const { src, ratio } = variant === "full" ? LOGO : EMBLEM;
  return (
    <span
      role="img"
      aria-label="Regal Victoria Lakeside"
      className={`block bg-current ${className}`}
      style={{
        aspectRatio: ratio,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "left center",
        WebkitMaskPosition: "left center",
        ...style,
      }}
    />
  );
}
