import Image from "next/image";
import Link from "next/link";
import type { Lot } from "@/lib/lots";
import { formatSqft } from "@/lib/lots";
import { Ribbon } from "@/components/ui/Ribbon";
import { Arrow } from "@/components/ui/Button";

export function VillaCard({ villa, index, sizes }: { villa: Lot; index?: number; sizes: string }) {
  return (
    <Link href={`/villas/${villa.slug}`} className="group/card block" data-villa-card>
      <div className="relative aspect-[4/4.6] overflow-hidden rounded-[26px] bg-cream-2">
        <Image
          src={villa.hero!}
          alt={`${villa.label} — ${villa.bedrooms} bedroom villa`}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover/card:scale-[1.07]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest/70 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover/card:opacity-100" />
        <Ribbon status={villa.status} className="absolute top-5 right-0" />
        {index !== undefined && (
          <span className="absolute top-5 left-5 font-display text-sm text-paper/90">{String(index + 1).padStart(2, "0")}</span>
        )}
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between text-paper">
          <div>
            <p className="font-display text-3xl leading-none font-light">{villa.label}</p>
            <p className="mt-2 text-[0.78rem] text-paper/80">{villa.tagline}</p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper text-forest transition-transform duration-500 group-hover/card:rotate-[-45deg]">
            <Arrow />
          </span>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-forest/10 rounded-2xl border border-forest/10 text-center">
        <div className="py-3">
          <dt className="text-[0.62rem] tracking-[0.16em] text-ink-2 uppercase">Land</dt>
          <dd className="mt-0.5 font-display text-lg text-forest">{villa.perches} perches</dd>
        </div>
        <div className="py-3">
          <dt className="text-[0.62rem] tracking-[0.16em] text-ink-2 uppercase">Bedrooms</dt>
          <dd className="mt-0.5 font-display text-lg text-forest">{villa.bedrooms}</dd>
        </div>
        <div className="py-3">
          <dt className="text-[0.62rem] tracking-[0.16em] text-ink-2 uppercase">Total</dt>
          <dd className="mt-0.5 font-display text-lg text-forest">{formatSqft(villa.areas!.total)} ft²</dd>
        </div>
      </dl>
    </Link>
  );
}
