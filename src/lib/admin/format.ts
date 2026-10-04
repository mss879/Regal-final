import { LOTS } from "@/lib/lots";

export const lotLabel = (id: string | null | undefined) => (id ? (LOTS.find((l) => l.id === id)?.label ?? `Lot ${id}`) : null);

const lkr = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** "LKR 85,000,000" */
export const formatLkr = (n: number) => lkr.format(n);
/** "85M" */
export const formatCompact = (n: number) => compact.format(n);
