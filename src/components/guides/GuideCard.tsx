import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { readingMinutes, type Guide } from "@/lib/guides";
import { Arrow } from "@/components/ui/Button";

// Guide teaser in the style of VillaCard: a rounded photo with the title over a gradient.
export function GuideCard({ guide, index, sizes }: { guide: Guide; index?: number; sizes: string }) {
  return (
    <Link href={`/guides/${guide.slug}` as Route} className="group/card block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[26px] bg-cream-2">
        <Image
          src={guide.hero}
          alt={guide.heroAlt}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover/card:scale-[1.07]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/10 to-transparent opacity-80 transition-opacity duration-500 group-hover/card:opacity-100" />
        {index !== undefined && (
          <span className="absolute top-5 left-5 font-display text-sm text-paper/90">{String(index + 1).padStart(2, "0")}</span>
        )}
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-paper">
          <div>
            <p className="eyebrow text-lime">{guide.eyebrow}</p>
            <p className="mt-2 font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.05] font-light uppercase">
              {guide.title.lead} {guide.title.accent}
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper text-forest transition-transform duration-500 group-hover/card:rotate-[-45deg]">
            <Arrow />
          </span>
        </div>
      </div>
      <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-2">{guide.excerpt}</p>
      <p className="mt-2 text-[0.72rem] tracking-[0.16em] text-leaf uppercase">{readingMinutes(guide)} min read</p>
    </Link>
  );
}
