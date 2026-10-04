import Link from "next/link";
import { villasInOrder, formatSqft, STATUS_LABEL } from "@/lib/lots";

// The released villas as a compact table, used inside guide articles.
export function VillaTable() {
  return (
    <div className="not-prose overflow-x-auto rounded-[22px] border border-forest/10">
      <table className="w-full min-w-[520px] text-left text-[0.9rem]">
        <caption className="sr-only">Villas released at Regal Victoria Lakeside</caption>
        <thead className="bg-cream text-[0.66rem] tracking-[0.16em] text-ink-2 uppercase">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">Villa</th>
            <th scope="col" className="px-5 py-3 font-semibold">Bedrooms</th>
            <th scope="col" className="px-5 py-3 font-semibold">Land</th>
            <th scope="col" className="px-5 py-3 font-semibold">Total area</th>
            <th scope="col" className="px-5 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-forest/10">
          {villasInOrder().map((v) => (
            <tr key={v.slug}>
              <th scope="row" className="px-5 py-3.5 font-display text-base font-normal text-forest">
                <Link href={`/villas/${v.slug}`} className="underline decoration-forest/20 underline-offset-4 transition-colors hover:text-leaf">
                  {v.label}
                </Link>
              </th>
              <td className="px-5 py-3.5">{v.bedrooms}</td>
              <td className="px-5 py-3.5">{v.perches} perches</td>
              <td className="px-5 py-3.5">{formatSqft(v.areas!.total)} ft²</td>
              <td className="px-5 py-3.5">{STATUS_LABEL[v.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
