export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="h-3 w-24 rounded-full bg-forest/10" />
      <div className="h-9 w-72 rounded-full bg-forest/10" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-[24px] bg-forest/[0.06]" />
        ))}
      </div>
      <div className="h-80 rounded-[24px] bg-forest/[0.06]" />
    </div>
  );
}
