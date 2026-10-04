import Link from "next/link";
import { SITE } from "@/lib/site";
import { INTRO_PLAYED_KEY } from "@/lib/intro";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";

// Keep in step with what the site stores. Public pages use no cookies at all; the admin area
// sets Supabase auth cookies for signed-in staff only.
const UPDATED = "2026-10-04";

export const metadata = pageMetadata({
  title: "Cookie policy",
  description: `${SITE.name} uses no advertising or analytics cookies. This policy explains the strictly necessary storage the website uses.`,
  path: "/cookie-policy",
});

export default function CookiePolicyPage() {
  return (
    <LegalPage
      path="/cookie-policy"
      updated={UPDATED}
      title={
        <>
          Cookie <em>policy</em>
        </>
      }
      intro="We keep this simple: no advertising cookies, no analytics cookies and no third-party trackers. Here is the small amount of storage the website does use, and why."
    >
      <h2>What are cookies?</h2>
      <p>
        Cookies are small files a website saves in your browser. Similar technologies, such as your browser&apos;s session
        storage, work in much the same way. Some are essential for a website to work; others are used to track you or show
        advertising. We only use the first kind.
      </p>

      <h2>What we use</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">Purpose</th>
            <th scope="col">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>{INTRO_PLAYED_KEY}</code>
            </td>
            <td>Session storage</td>
            <td>Remembers that you have seen the animated introduction on the home page, so it doesn&apos;t replay on every visit.</td>
            <td>Until you close the tab</td>
          </tr>
          <tr>
            <td>
              <code>sb-…-auth-token</code>
            </td>
            <td>Cookie (staff only)</td>
            <td>Keeps authorised staff signed in to the private admin area. Never set for visitors to the public website.</td>
            <td>Until sign-out or expiry</td>
          </tr>
        </tbody>
      </table>
      <p>
        Both are strictly necessary, so the law does not require us to ask for your consent and you won&apos;t see a cookie
        banner on this site.
      </p>

      <h2>Analytics without cookies</h2>
      <p>
        We count page views with our own privacy-friendly analytics, which uses no cookies and stores no IP addresses. If
        your browser sends a Global Privacy Control or Do Not Track signal, we don&apos;t count your visit at all. The{" "}
        <Link href="/privacy-policy">privacy policy</Link> explains exactly what is recorded.
      </p>

      <h2>Third parties</h2>
      <p>
        Our fonts, images and video are served from our own domain, and we don&apos;t embed third-party maps, videos or
        social media widgets. Links to other websites — such as Google Maps for directions, or our social media pages — take
        you to those sites, which have their own cookie policies.
      </p>

      <h2>Managing storage in your browser</h2>
      <p>
        You can delete or block cookies and site data in your browser settings at any time. Blocking session storage simply
        means the home-page introduction may play again on each visit.
      </p>

      <h2>Changes</h2>
      <p>
        If we ever add non-essential cookies, we will update this policy and ask for your consent before setting them.
        Questions? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </LegalPage>
  );
}
