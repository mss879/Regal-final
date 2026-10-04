import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { LEGAL_LINKS, SITE } from "@/lib/site";
import { formatDate } from "@/lib/time";
import { breadcrumbs } from "@/lib/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { SectionLabel } from "@/components/ui/SectionLabel";

// Policy pages: a compact forest header card (same card as PageHero, so the light navbar stays
// legible) and the text set in .rvl-prose. Fully server-rendered — no animation needed here.
export function LegalPage({
  title,
  path,
  updated,
  intro,
  children,
}: {
  title: ReactNode;
  path: (typeof LEGAL_LINKS)[number]["href"];
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  const label = LEGAL_LINKS.find((l) => l.href === path)!.label;
  return (
    <main>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: label, path }])} />
      <section className="p-3 md:p-4">
        <div className="grain relative overflow-hidden rounded-[36px] bg-forest text-paper">
          <div aria-hidden className="pointer-events-none absolute -bottom-48 -left-40 size-[560px] rounded-full bg-leaf/25 blur-[140px]" />
          <div className="relative px-5 pt-36 pb-12 md:px-10 md:pt-44 md:pb-16">
            <p className="eyebrow mb-6 flex items-center gap-3 text-lime">
              <span className="size-1.5 rounded-full bg-lime" />
              Legal
            </p>
            <h1 className="font-display text-display font-light tracking-[-0.035em] uppercase [&_em]:font-serif [&_em]:tracking-normal [&_em]:text-lime [&_em]:normal-case">
              {title}
            </h1>
            <p className="mt-8 max-w-2xl text-[0.98rem] leading-relaxed text-sage-2">{intro}</p>
            <p className="mt-8 text-[0.8rem] text-sage">
              Last updated <time dateTime={updated}>{formatDate(updated)}</time>
            </p>
          </div>
        </div>
      </section>

      <div className="container-x py-20 md:py-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionLabel>Policies</SectionLabel>
              <ul className="mt-6 space-y-3">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href as Route}
                      aria-current={l.href === path ? "page" : undefined}
                      className="text-[0.95rem] text-ink-2 transition-colors hover:text-forest aria-[current=page]:font-semibold aria-[current=page]:text-forest"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-10 border-t border-forest/15 pt-6 text-[0.9rem] leading-relaxed text-ink-2">
                <p className="eyebrow text-ink-2">Questions?</p>
                <p className="mt-3">
                  Email{" "}
                  <a href={`mailto:${SITE.email}`} className="text-forest underline decoration-leaf-2 underline-offset-4 hover:text-leaf">
                    {SITE.email}
                  </a>{" "}
                  or call{" "}
                  <a href={SITE.phoneHref} className="text-forest underline decoration-leaf-2 underline-offset-4 hover:text-leaf">
                    {SITE.phone}
                  </a>
                  .
                </p>
              </div>
            </div>
          </aside>
          <div className="rvl-prose max-w-3xl lg:col-span-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
