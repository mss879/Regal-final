// Shared between the public form, its Server Action and the admin.
export const INTERESTS = [
  { key: "prebook", label: "Pre-booking a villa" },
  { key: "site_visit", label: "Arranging a site visit" },
  { key: "pricing", label: "Floor plans & pricing" },
  { key: "other", label: "Something else" },
] as const;

export type InterestKey = (typeof INTERESTS)[number]["key"];

export const INTEREST_KEYS = INTERESTS.map((i) => i.key) as [InterestKey, ...InterestKey[]];

export const interestLabel = (key: string | null | undefined) => INTERESTS.find((i) => i.key === key)?.label ?? "—";

/** Viewing slots offered on the form, in Sri Lanka time. */
export const VISIT_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const minutes = 9 * 60 + i * 30; // 09:00 … 17:00
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
  return { value, label };
});
