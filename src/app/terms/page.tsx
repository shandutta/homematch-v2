import { createPublicRouteMetadata } from '@/lib/seo/route-metadata'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { EditorialPageHeader } from '@/components/editorial/EditorialPageHeader'
import { EditorialSection } from '@/components/editorial/EditorialSection'
import { EditorialLink } from '@/components/editorial/EditorialLink'

export const metadata = createPublicRouteMetadata({
  title: 'Terms of Service | HomeMatch',
  description:
    'Understand the terms that govern the use of HomeMatch for collaborative home search.',
  path: '/terms',
})

export default function TermsPage() {
  return (
    <EditorialPageShell header={<MarketingPageHeader />}>
      <EditorialPageHeader
        eyebrow="Terms of service"
        title="Welcome to HomeMatch"
        lead="These terms govern your use of HomeMatch. By accessing or using the service, you agree to them."
        meta="Last updated: May 13, 2026"
      />

      <EditorialSection title="Eligibility and account">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>You must be at least 13 years old to use HomeMatch.</li>
          <li>
            Provide accurate information and keep your login credentials secure.
          </li>
          <li>
            If you use HomeMatch on behalf of an organization, you represent
            that you have authority to bind that organization to these terms.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Acceptable use">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            Do not misuse the service (scraping, data harvesting, reverse
            engineering, or attempting to access private systems).
          </li>
          <li>Do not use HomeMatch to violate laws or the rights of others.</li>
          <li>
            Do not copy, download, or redistribute listing data or photos
            outside of the HomeMatch experience.
          </li>
          <li>
            We may update or suspend features to keep the service reliable and
            secure.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Listings and third-party data">
        <p className="text-hm-ink-soft">
          HomeMatch provides listing information sourced from third-party data
          providers via RapidAPI (US Housing Market Data and similar sources).
          Listings, photos, and pricing are provided for informational purposes
          only and may be incomplete, out of date, or inaccurate.
        </p>
        <p className="text-hm-ink-soft">
          HomeMatch is not a real estate broker, agent, or MLS and is not
          affiliated with Zillow or listing brokers. You should verify listing
          details directly with the listing source before making decisions.
        </p>
      </EditorialSection>

      <EditorialSection title="Your content and feedback">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            You own your content, but you grant us a worldwide, non-exclusive
            license to host, store, and display it to operate the service.
          </li>
          <li>
            If you submit feedback or suggestions, you grant us the right to use
            them without restriction or compensation.
          </li>
          <li>
            You are responsible for the content you provide and for ensuring you
            have the rights to share it.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Third-party services">
        <p className="text-hm-ink-soft">
          The service may include integrations with third-party services such as
          Google Maps and RapidAPI. Those services are governed by their own
          terms and privacy policies, and HomeMatch is not responsible for them.
        </p>
      </EditorialSection>

      <EditorialSection title="Disclaimers">
        <p className="text-hm-ink-soft">
          HomeMatch is provided &quot;as is&quot; and &quot;as available&quot;.
          To the maximum extent permitted by law, we disclaim warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not guarantee that listings are accurate,
          current, or available, and we do not provide legal, financial, or real
          estate advice.
        </p>
      </EditorialSection>

      <EditorialSection title="Limitation of liability">
        <p className="text-hm-ink-soft">
          To the maximum extent permitted by law, HomeMatch and its affiliates
          will not be liable for indirect, incidental, special, consequential,
          or punitive damages, or any loss of profits, data, or goodwill. Our
          total liability for any claim is limited to the greater of $100 or the
          amount you paid to us in the 12 months before the claim.
        </p>
      </EditorialSection>

      <EditorialSection title="Indemnification">
        <p className="text-hm-ink-soft">
          You agree to indemnify and hold HomeMatch harmless from any claims,
          liabilities, damages, losses, and expenses (including reasonable
          attorneys’ fees) arising from your use of the service or your
          violation of these terms.
        </p>
      </EditorialSection>

      <EditorialSection title="Termination">
        <p className="text-hm-ink-soft">
          You can stop using HomeMatch at any time. We may suspend or terminate
          access for violations of these terms or to protect the service and its
          users.
        </p>
      </EditorialSection>

      <EditorialSection title="Changes">
        <p className="text-hm-ink-soft">
          We may update these terms as we launch new features or to meet legal
          requirements. Continued use after updates means you accept the new
          terms.
        </p>
      </EditorialSection>

      <EditorialSection title="Contact">
        <p className="text-hm-ink-soft">
          For questions, reach out to{' '}
          <EditorialLink href="mailto:legal@homematch.pro">
            legal@homematch.pro
          </EditorialLink>
          .
        </p>
      </EditorialSection>
    </EditorialPageShell>
  )
}
