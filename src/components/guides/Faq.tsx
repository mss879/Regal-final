// Accessible accordion with no JavaScript: native <details>/<summary>.
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="border-t border-forest/15">
      {items.map((f) => (
        <details key={f.q} className="group border-b border-forest/15 py-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-[clamp(1.15rem,1.8vw,1.5rem)] text-forest transition-colors hover:text-leaf">
            {f.q}
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-forest/20 transition-transform duration-500 ease-[var(--ease-out-expo)] group-open:rotate-45"
            >
              <svg viewBox="0 0 20 20" className="size-4">
                <path d="M10 4v12M4 10h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
