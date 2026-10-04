import { villasInOrder } from "@/lib/lots";
import { COPY } from "@/lib/site";
import { VillaCard } from "@/components/villas/VillaCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ButtonLink } from "@/components/ui/Button";
import { VillaRail } from "./VillaRail";

export function VillaCollection() {
  const villas = villasInOrder();
  return (
    <section aria-labelledby="collection-title" className="bg-paper">
      <VillaRail
        count={villas.length}
        header={
          <div className="container-x grid gap-8 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <SectionLabel index="03">Villa collection · Current offerings</SectionLabel>
              <h2 id="collection-title" className="mt-6 font-display text-display font-light tracking-[-0.03em] text-forest uppercase">
                Released <span className="text-leaf">now</span>
              </h2>
            </div>
            <div className="flex flex-col gap-6 md:col-span-5 md:items-end md:text-right">
              <p className="max-w-md text-[0.95rem] leading-relaxed text-ink-2">
                {COPY.release} {COPY.releaseDetail}
              </p>
              <ButtonLink href="/villas" variant="outline">All villas</ButtonLink>
            </div>
          </div>
        }
      >
        {villas.map((v, i) => (
          <div key={v.slug} className="w-[82vw] shrink-0 snap-center sm:w-[56vw] lg:w-[31vw] xl:w-[27vw]">
            <VillaCard villa={v} index={i} sizes="(min-width: 1024px) 30vw, 82vw" />
          </div>
        ))}
      </VillaRail>
    </section>
  );
}
