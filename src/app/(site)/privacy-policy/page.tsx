import Link from "next/link";
import { SITE, TEAM } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";

// Review with a lawyer before launch. Keep this in step with what the site actually collects:
// the enquiry form (src/app/(site)/contact/actions.ts), the cookieless page-view counter
// (src/app/api/track/route.ts) and the retention jobs in supabase/migrations.
const UPDATED = "2026-10-04";

export const metadata = pageMetadata({
  title: "Privacy policy",
  description: `How ${SITE.name} collects, uses and protects personal data from enquiries, site-visit requests and visits to this website, and the rights you have.`,
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      path="/privacy-policy"
      updated={UPDATED}
      title={
        <>
          Privacy <em>policy</em>
        </>
      }
      intro={`How we collect, use and protect your personal data when you visit this website, send us an enquiry or ask to visit ${SITE.name}.`}
    >
      <h2>Who we are</h2>
      <p>
        This website is operated by <strong>{TEAM.developer.name}</strong>, the developer of {SITE.name} (“we”, “us”).
        We are the controller of the personal data described in this policy. You can contact us at{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, by phone on <a href={SITE.phoneHref}>{SITE.phone}</a> or by post at{" "}
        {SITE.address}, Sri Lanka.
      </p>
      <p>
        We process personal data in line with Sri Lanka&apos;s Personal Data Protection Act, No. 9 of 2022, and, where it
        applies to visitors from the European Economic Area or the United Kingdom, the General Data Protection Regulation.
      </p>

      <h2>What we collect</h2>
      <h3>When you send an enquiry</h3>
      <ul>
        <li>your name and email address, and your phone number if you give it;</li>
        <li>the villa you are interested in, the type of enquiry and your message;</li>
        <li>if you ask to visit the site, your preferred date and time.</li>
      </ul>
      <p>
        To protect the form from spam and abuse we also create a one-way, salted hash of your IP address. The hash cannot
        be turned back into your IP address; it is used only to limit repeated submissions and is deleted after seven days.
      </p>

      <h3>When you browse the website</h3>
      <p>
        We count page views with our own cookieless analytics. For each page view we record the page, the website that
        referred you, any campaign tags in the link (such as utm_source), your device type and browser family, and the
        country your connection comes from (provided by our hosting network). We do <strong>not</strong> store your IP
        address, do not use cookies or similar identifiers for analytics, and do not track you across other websites. To
        count unique visitors we use a random-looking identifier derived from a salted hash that changes every day, so
        visits on different days cannot be linked to each other or to you.
      </p>
      <p>
        If your browser sends a <strong>Global Privacy Control</strong> or <strong>Do Not Track</strong> signal, we do not
        record your page views at all.
      </p>

      <h2>How we use your data</h2>
      <ul>
        <li>
          <strong>To reply to your enquiry</strong> and send you the information you asked for, such as plans,
          specifications and pricing — to take steps at your request before any agreement, and with your consent.
        </li>
        <li>
          <strong>To arrange and manage site visits</strong> you have asked for.
        </li>
        <li>
          <strong>To manage our relationship with prospective buyers</strong>, including keeping a record of our
          conversations in our sales system — in our legitimate interest in selling the villas.
        </li>
        <li>
          <strong>To understand how the website is used</strong> and improve it, using the anonymous statistics described
          above — in our legitimate interest.
        </li>
        <li>
          <strong>To keep the website and our systems secure</strong> and to meet our legal obligations.
        </li>
      </ul>
      <p>
        We do not sell your personal data, use it for automated decision-making, or add you to marketing mailing lists. If
        we would ever like to send you marketing, we will ask for your consent first.
      </p>

      <h2>Who we share it with</h2>
      <p>We share personal data only with people who need it to help us, under appropriate confidentiality and data-protection terms:</p>
      <ul>
        <li>our sales team and the staff who handle enquiries;</li>
        <li>
          service providers who host and run the website and its database (including Supabase, which stores enquiries and
          our sales records, and our website hosting provider);
        </li>
        <li>professional advisers such as lawyers and notaries, if you go on to buy;</li>
        <li>authorities, where the law requires us to.</li>
      </ul>

      <h2>International transfers</h2>
      <p>
        Our service providers may store or process data on servers outside Sri Lanka. Where that happens we rely on
        providers that offer appropriate safeguards for the protection of personal data, as required by law.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Enquiries and sales records:</strong> for as long as we are in contact with you about a villa, and
          generally for no more than three years after our last contact. If you buy a villa, we keep the records the law
          requires for as long as it requires them.
        </li>
        <li>
          <strong>Spam-protection hashes:</strong> seven days.
        </li>
        <li>
          <strong>Page-view statistics:</strong> up to 25 months, after which they are deleted.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        All traffic to this website is encrypted with HTTPS. Enquiries and sales records are stored in a database protected
        by row-level security, and only authorised staff who sign in can see them. No method of transmission or storage is
        completely secure, but we work hard to protect your data and will tell you and the authorities about a breach where
        the law requires.
      </p>

      <h2>Your rights</h2>
      <p>Depending on the law that applies to you, you have the right to:</p>
      <ul>
        <li>ask for a copy of the personal data we hold about you;</li>
        <li>ask us to correct or complete it;</li>
        <li>ask us to erase it, or to stop or restrict using it;</li>
        <li>withdraw your consent at any time, where we rely on consent;</li>
        <li>object to processing based on our legitimate interests;</li>
        <li>receive your data in a portable format (where the GDPR applies).</li>
      </ul>
      <p>
        To use any of these rights, email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. We will reply within the time
        the law allows. If you are unhappy with how we have handled your data, you can complain to the Data Protection
        Authority of Sri Lanka or, in the EEA or UK, to your local data protection authority.
      </p>

      <h2>Cookies</h2>
      <p>
        We only use storage that is strictly necessary for the site to work. See our <Link href="/cookie-policy">cookie policy</Link>{" "}
        for details.
      </p>

      <h2>Children</h2>
      <p>This website is intended for adults. We do not knowingly collect personal data from children.</p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. The date at the top of the page shows when it was last changed. Please
        also read our <Link href="/terms-of-use">terms of use</Link>.
      </p>
    </LegalPage>
  );
}
