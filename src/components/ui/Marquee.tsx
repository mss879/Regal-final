// CSS-only infinite marquee (paused for reduced motion in globals.css).
export function Marquee({
  items,
  className = "",
  duration = 38,
  separator = "✦",
}: {
  items: readonly string[];
  className?: string;
  duration?: number;
  separator?: string;
}) {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-8 whitespace-nowrap">{item}</span>
          <span className="text-[0.5em] opacity-60">{separator}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className="marquee-track flex w-max"
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
