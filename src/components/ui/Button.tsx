import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps, ReactNode } from "react";

type Variant = "light" | "dark" | "outline" | "outline-light" | "leaf";

const VARIANTS: Record<Variant, string> = {
  light: "bg-paper text-forest hover:bg-lime",
  dark: "bg-forest text-paper hover:bg-forest-3",
  leaf: "bg-leaf text-paper hover:bg-forest",
  outline: "border border-forest/25 text-forest hover:bg-forest hover:text-paper hover:border-forest",
  "outline-light": "border border-paper/40 text-paper hover:bg-paper hover:text-forest hover:border-paper",
};

const BASE =
  "group/btn relative inline-flex items-center justify-center gap-3 rounded-full px-7 py-3.5 text-[0.92rem] font-semibold tracking-[0.01em] transition-colors duration-300 ease-out whitespace-nowrap";

export const buttonClass = (variant: Variant = "dark", className = "") => `${BASE} ${VARIANTS[variant]} ${className}`;

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex size-5 items-center justify-center overflow-hidden ${className}`}
    >
      <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-5 group-hover/card:translate-x-5">
        <path d="M3 10h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 20 20" className="absolute size-4 -translate-x-5 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-0 group-hover/card:translate-x-0">
        <path d="M3 10h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

type LinkProps = {
  href: Route | URL | string;
  variant?: Variant;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
  external?: boolean;
};

export function ButtonLink({ href, variant = "dark", arrow = true, className = "", children, external }: LinkProps) {
  const cls = `${BASE} ${VARIANTS[variant]} ${className}`;
  if (external || typeof href === "string" && /^(https?:|mailto:|tel:)/.test(href)) {
    return (
      <a href={String(href)} className={cls} target={String(href).startsWith("http") ? "_blank" : undefined} rel="noreferrer">
        {children}
        {arrow && <Arrow />}
      </a>
    );
  }
  return (
    <Link href={href as Route} className={cls}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  variant = "dark",
  arrow = false,
  className = "",
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; arrow?: boolean }) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} disabled:opacity-60 ${className}`} {...rest}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}
