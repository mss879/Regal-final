export function SectionLabel({
  children,
  index,
  tone = "dark",
  className = "",
}: {
  children: React.ReactNode;
  index?: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const color = tone === "dark" ? "text-ink-2" : "text-sage-2";
  return (
    <p className={`eyebrow flex items-center gap-3 ${color} ${className}`}>
      {index && <span className={tone === "dark" ? "text-leaf" : "text-lime"}>{index}</span>}
      <span aria-hidden className={`h-px w-8 ${tone === "dark" ? "bg-ink/25" : "bg-paper/35"}`} />
      {children}
    </p>
  );
}
