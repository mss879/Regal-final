import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { CREDIT, FOOTER_EXPLORE, LEGAL_LINKS, SITE, SOCIAL, TEAM } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { villasInOrder } from "@/lib/lots";
import { Logo } from "@/components/ui/Logo";
import { FooterReveal } from "./FooterReveal";

// Evaluated at build time (the footer is static) — redeploys keep it current.
const YEAR = new Date().getFullYear();
const [MAIL_USER, MAIL_DOMAIN] = SITE.email.split("@");

const ICONS: Record<(typeof SOCIAL)[number]["id"], React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path
        d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3.1Z"
        fill="currentColor"
      />
    </svg>
  ),
};

export function Footer() {
  return (
    <footer className="grain relative overflow-hidden bg-forest text-paper">
      <FooterReveal>
        {/* Bottom padding keeps the last line clear of the floating chat button. */}
        <div className="container-x pt-24 pb-24 md:pt-32">
          <div className="grid gap-14 border-b border-paper/10 pb-16 lg:grid-cols-12">
            <div className="lg:col-span-4" data-reveal>
              <p className="font-serif text-[clamp(2rem,3.6vw,3.2rem)] leading-[1.05] font-light italic text-lime">
                {SITE.tagline}
              </p>
              <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-sage-2">
                Bespoke contemporary villas bordering the Victoria Reservoir, Digana, Kandy.
              </p>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:col-span-8" data-reveal>
              <div>
                <p className="eyebrow text-sage">Explore</p>
                <ul className="mt-5 space-y-2.5 text-[0.95rem]">
                  {FOOTER_EXPLORE.map((n) => (
                    <li key={n.href}>
                      <Link href={n.href as Route} className="transition-colors hover:text-lime">{n.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow text-sage">Villas</p>
                <ul className="mt-5 space-y-2.5 text-[0.95rem]">
                  {villasInOrder().map((v) => (
                    <li key={v.slug}>
                      <Link href={`/villas/${v.slug}`} className="transition-colors hover:text-lime">{v.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow text-sage">Guides</p>
                <ul className="mt-5 space-y-2.5 text-[0.95rem]">
                  {GUIDES.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/guides/${g.slug}` as Route} className="transition-colors hover:text-lime">{g.shortTitle}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow text-sage">Visit</p>
                <address className="mt-5 space-y-2.5 text-[0.95rem] not-italic">
                  <p>{SITE.address}</p>
                  <p><a href={SITE.phoneHref} className="transition-colors hover:text-lime">{SITE.phone}</a></p>
                  {/* Phones wrap the address after the @ rather than mid-domain */}
                  <p>
                    <a href={`mailto:${SITE.email}`} className="break-words transition-colors hover:text-lime md:break-all">
                      {MAIL_USER}@<wbr />
                      {MAIL_DOMAIN}
                    </a>
                  </p>
                </address>
                <ul className="mt-6 flex gap-2.5" aria-label="Follow us">
                  {SOCIAL.map((s) => (
                    <li key={s.id}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${SITE.name} on ${s.label}`}
                        className="flex size-10 items-center justify-center rounded-full border border-paper/20 transition-colors hover:border-lime hover:bg-lime hover:text-forest"
                      >
                        {ICONS[s.id]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>

          <div className="py-8 md:py-10" data-footer-logo>
            <Logo className="w-56 text-paper sm:w-64 md:w-72 lg:w-80" />
          </div>

          <div className="grid gap-6 border-t border-paper/10 pt-8 text-xs text-sage md:grid-cols-3 md:items-start md:gap-8">
            <div className="space-y-3">
              <p>© {YEAR} {TEAM.developer.name}. Architecture by {TEAM.architect.name}.</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href as Route} className="transition-colors hover:text-lime">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            {/* Site credit: a plain followed link so it passes search value to ARC AI. */}
            <a
              href={CREDIT.url}
              target="_blank"
              rel="noopener"
              title={CREDIT.title}
              className="group order-last flex items-center gap-2.5 justify-self-start transition-colors hover:text-paper md:order-none md:justify-self-center"
            >
              <span>Designed and built by</span>
              <Image
                src={CREDIT.logoLight.src}
                alt={CREDIT.name}
                width={84}
                height={20}
                className="h-5 w-auto opacity-90 transition-opacity group-hover:opacity-100"
              />
            </a>
            <p className="max-w-xl md:justify-self-end md:text-right">* {SITE.disclaimer}</p>
          </div>
        </div>
      </FooterReveal>
    </footer>
  );
}
