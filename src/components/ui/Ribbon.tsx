import { STATUS_LABEL, type LotStatus } from "@/lib/lots";

const TONE: Record<LotStatus, string> = {
  available: "bg-leaf text-paper",
  "nearing-completion": "bg-lime text-forest",
  "design-stage": "bg-design text-paper",
  sold: "bg-sold text-paper",
};

// Status tag in the brochure's ribbon style (notched left edge).
export function Ribbon({ status, className = "" }: { status: LotStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 py-1.5 pr-3.5 pl-4 font-display text-[0.7rem] font-medium tracking-[0.18em] uppercase ${TONE[status]} ${className}`}
      style={{ clipPath: "polygon(8px 0, 100% 0, 100% 100%, 8px 100%, 0 50%)" }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
