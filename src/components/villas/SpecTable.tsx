import type { LotAreas } from "@/lib/lots";
import { formatSqft } from "@/lib/lots";
import { Counter } from "@/components/motion/Counter";

// Floor-area schedule, as printed in the brochure's plan pages.
export function SpecTable({ areas }: { areas: LotAreas }) {
  const rows = [
    { label: "Internal", value: areas.internal },
    { label: "Verandahs & external corridors", value: areas.verandahs },
    ...(areas.parking ? [{ label: "Covered parking", value: areas.parking }] : []),
    ...(areas.steps ? [{ label: "Access steps", value: areas.steps }] : []),
  ];
  return (
    <div className="rounded-[26px] bg-sage-2/60 p-6 md:p-8">
      <p className="eyebrow text-forest">Floor areas</p>
      <table className="mt-5 w-full text-left">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-forest/15">
              <th scope="row" className="py-3.5 pr-6 text-[0.85rem] font-medium tracking-wide text-ink-2 uppercase">{r.label}</th>
              <td className="py-3.5 text-right font-display text-lg text-forest tabular-nums">
                {formatSqft(r.value)} <span className="text-sm text-ink-2">ft²</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pt-5 text-[0.85rem] font-semibold tracking-wide text-forest uppercase">Total</th>
            <td className="pt-5 text-right font-display text-4xl font-light text-forest">
              <Counter value={areas.total} format /> <span className="text-base text-ink-2">ft²</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
