import Link from "next/link";
import { SITE, TEAM } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/LegalPage";

// Review with a lawyer before launch.
const UPDATED = "2026-10-04";

export const metadata = pageMetadata({
  title: "Terms of use",
  description: `The terms that apply when you use the ${SITE.name} website, including how to read the information, images and specifications it contains.`,
  path: "/terms-of-use",
});

export default function TermsPage() {
  return (
    <LegalPage
      path="/terms-of-use"
      updated={UPDATED}
      title={
        <>
          Terms <em>of use</em>
        </>
      }
      intro={`These terms apply to your use of ${SITE.url.replace("https://", "")}. By using the website you agree to them, so please read them carefully.`}
    >
      <h2>About us</h2>
      <p>
        This website is operated by {TEAM.developer.name}, the developer of {SITE.name}, {SITE.address}, Sri Lanka. You can
        contact us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or on <a href={SITE.phoneHref}>{SITE.phone}</a>.
      </p>

      <h2>Information on this website</h2>
      <p>
        The website gives general information about {SITE.name}. We take care to keep it accurate and up to date, but:
      </p>
      <ul>
        <li>
          <strong>all artists&apos; impressions, photographs, renders, plans and illustrations are indicative</strong> and
          presented for illustration only. Finishes, furnishings, landscaping and views may differ from what is shown;
        </li>
        <li>
          areas, measurements and specifications are approximate and may change as designs are developed or approved;
        </li>
        <li>availability and status of villas can change at any time and are confirmed only in writing;</li>
        <li>
          our guides are general information and are not legal, tax, financial or investment advice. Always take
          independent professional advice before you buy.
        </li>
      </ul>
      <p>
        Nothing on this website is an offer, a contract or part of a contract. Any sale, lease or reservation is governed
        only by a separate written agreement signed by both parties.
      </p>

      <h2>Enquiries and site visits</h2>
      <p>
        When you send an enquiry or ask to visit, please give accurate information. A requested viewing date is a request,
        not a booking; our team will contact you to confirm a time. How we handle your details is explained in our{" "}
        <Link href="/privacy-policy">privacy policy</Link>.
      </p>

      <h2>AI assistant</h2>
      <p>
        The chat on this website is an automated AI assistant. Its answers are generated automatically and may be incomplete
        or wrong; they are not an offer, advice or a commitment by us. Please confirm anything important with our team, and
        don&apos;t share sensitive personal information in the chat.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The content of this website — including text, photographs, renders, plans, videos, the {SITE.name} name and logo — is
        owned by us, the project architects or our licensors and is protected by copyright and other laws. You may view it
        and print or download extracts for your own personal, non-commercial use. You may not copy, republish, sell or use it
        in any other way without our written permission.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the website in any way that is unlawful, fraudulent or harmful;</li>
        <li>try to gain unauthorised access to the website, its admin area, servers or databases;</li>
        <li>introduce viruses or other harmful code, or interfere with the website&apos;s security or performance;</li>
        <li>scrape, harvest or collect content or data from the website by automated means without our permission;</li>
        <li>submit false enquiries, spam or content that is offensive or infringes anyone&apos;s rights.</li>
      </ul>

      <h2>Links to other websites</h2>
      <p>
        The website links to other sites, such as Google Maps, our architects&apos; website and social media. We don&apos;t
        control those sites and aren&apos;t responsible for their content or privacy practices.
      </p>

      <h2>Availability</h2>
      <p>
        We aim to keep the website available, but we don&apos;t guarantee it will always be available or free of errors, and
        we may change, suspend or withdraw it at any time.
      </p>

      <h2>Our liability</h2>
      <p>
        To the extent permitted by law, we are not liable for any loss or damage arising from your use of, or reliance on,
        the website or its content. Nothing in these terms limits liability that cannot be limited by law.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the Democratic Socialist Republic of Sri Lanka, and the courts of Sri Lanka
        have jurisdiction over any dispute arising from them.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. The date at the top of the page shows when they were last changed.
        Please also see our <Link href="/cookie-policy">cookie policy</Link>.
      </p>
    </LegalPage>
  );
}
