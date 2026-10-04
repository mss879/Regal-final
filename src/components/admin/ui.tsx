import type { ReactNode } from "react";

// Admin UI kit: the site's palette and type (forest, cream, lime; Jost + Manrope), tuned for
// dense, functional screens. Server-safe — interactive pieces live in ./client.tsx.

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow flex items-center gap-3 text-leaf">
          <span className="size-1.5 rounded-full bg-leaf" />
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,3vw,2.8rem)] leading-none font-light tracking-[-0.02em] text-forest uppercase">
          {title}
        </h1>
        {description && <p className="mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={`rounded-[24px] border border-forest/10 bg-paper p-5 md:p-6 ${className}`}>{children}</Tag>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="eyebrow text-ink-2">{children}</h2>
      {action}
    </div>
  );
}

export const TONES = {
  lime: "bg-lime text-forest",
  sage: "bg-sage-2 text-forest",
  leaf: "bg-leaf text-paper",
  moss: "bg-moss text-paper",
  forest: "bg-forest text-paper",
  sand: "bg-sand text-forest",
  design: "bg-design text-paper",
  sold: "bg-sold text-paper",
  neutral: "bg-forest/[0.06] text-ink-2",
  outline: "border border-forest/20 text-ink-2",
} as const;

export type Tone = keyof typeof TONES;

export const DOTS: Record<string, string> = {
  lime: "bg-lime ring-1 ring-forest/15",
  sage: "bg-sage",
  leaf: "bg-leaf",
  moss: "bg-moss",
  forest: "bg-forest",
  sand: "bg-sand ring-1 ring-forest/15",
  design: "bg-design",
  sold: "bg-sold",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.04em] whitespace-nowrap ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

const BUTTON = {
  base: "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
  size: { sm: "px-3.5 py-1.5 text-[0.8rem]", md: "px-5 py-2.5 text-[0.86rem]" },
  variant: {
    primary: "bg-forest text-paper hover:bg-leaf",
    lime: "bg-lime text-forest hover:bg-leaf hover:text-paper",
    outline: "border border-forest/20 text-forest hover:border-forest hover:bg-forest hover:text-paper",
    ghost: "text-ink-2 hover:bg-forest/[0.06] hover:text-forest",
    danger: "border border-sold/30 text-sold hover:bg-sold hover:text-paper",
  },
} as const;

export type ButtonVariant = keyof typeof BUTTON.variant;

export const buttonClass = (variant: ButtonVariant = "primary", size: keyof typeof BUTTON.size = "md", extra = "") =>
  `${BUTTON.base} ${BUTTON.size[size]} ${BUTTON.variant[variant]} ${extra}`;

export const fieldClass =
  "mt-1.5 block w-full rounded-xl border border-forest/15 bg-white/70 px-3.5 py-2.5 text-[0.92rem] text-forest placeholder:text-ink-2/50 transition-colors focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20 disabled:opacity-60";

export function FieldLabel({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="flex items-baseline justify-between gap-3 text-[0.72rem] font-semibold tracking-[0.12em] text-ink-2 uppercase">
        {label}
        {hint && <span className="font-normal tracking-normal normal-case text-ink-2/70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-forest/15 px-6 py-12 text-center">
      <p className="font-display text-xl text-forest">{title}</p>
      {children && <div className="mt-2 max-w-sm text-[0.88rem] leading-relaxed text-ink-2">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous && !current) return <span className="text-[0.75rem] text-ink-2">—</span>;
  if (!previous) return <span className="text-[0.75rem] font-semibold text-leaf">New</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span className={`text-[0.75rem] font-semibold ${up ? "text-leaf" : "text-sold"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}
