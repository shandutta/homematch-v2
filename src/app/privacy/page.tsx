import { createPublicRouteMetadata } from '@/lib/seo/route-metadata'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { EditorialPageHeader } from '@/components/editorial/EditorialPageHeader'
import { EditorialSection } from '@/components/editorial/EditorialSection'
import { EditorialLink } from '@/components/editorial/EditorialLink'

export const metadata = createPublicRouteMetadata({
  title: 'Privacy Policy | HomeMatch',
  description:
    'Learn how HomeMatch collects, uses, and protects your data while helping you find the right home together.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <EditorialPageShell header={<MarketingPageHeader />}>
      <EditorialPageHeader
        eyebrow="Privacy policy"
        title="Your data, your choices"
        lead="HomeMatch helps you organize and collaborate on a home search. This policy explains what we collect, how we use it, and the choices you have."
        meta="Last updated: May 13, 2026"
      />

      <EditorialSection title="Information we collect">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>Account details (name, email, authentication credentials).</li>
          <li>
            Household and collaboration data (invites, shared lists, notes,
            likes, and saved homes).
          </li>
          <li>
            Search preferences and interactions (filters, clicks, and
            recommendations you engage with).
          </li>
          <li>
            Device and usage data (IP address, browser type, device identifiers,
            log data, and timestamps).
          </li>
          <li>
            Approximate location inferred from IP. We only use precise location
            if you choose to share it or use map features.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Information from third parties">
        <p className="text-hm-ink-soft">
          We source property listings, details, and photos from third-party data
          providers via RapidAPI (US Housing Market Data and similar sources).
          We also use Google Maps and Places to power address search and map
          results. These providers receive your search queries and may process
          data under their own privacy policies.
        </p>
        <p className="text-hm-ink-soft">
          Listing data can be incomplete or out of date. HomeMatch is not
          affiliated with Zillow, MLSs, or listing brokers, and we do not
          guarantee the accuracy or availability of any listing.
        </p>
      </EditorialSection>

      <EditorialSection title="How we use information">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            Provide the service, sync households, and personalize
            recommendations.
          </li>
          <li>
            Operate features such as search, notifications, and customer
            support.
          </li>
          <li>Protect users, prevent fraud, and enforce our terms.</li>
          <li>
            Measure performance and improve reliability (for example, via
            first-party metrics and Vercel Speed Insights; PostHog if enabled).
          </li>
          <li>Comply with legal obligations and protect our rights.</li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Sharing and disclosures">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            Service providers who help us run the app (for example, hosting on
            Vercel, database and authentication via Supabase, analytics and
            performance tooling).
          </li>
          <li>
            RapidAPI and its data partners to fulfill listing-data requests and
            return property photos and details.
          </li>
          <li>
            Google Maps Platform to provide address autocomplete and mapping
            features.
          </li>
          <li>
            Advertising partners (if enabled, such as Google AdSense) may use
            cookies or device identifiers to serve and measure ads. We do not
            share your account profile for advertising.
          </li>
          <li>
            Legal or regulatory requests, and in connection with a business
            transfer or acquisition.
          </li>
          <li>We do not sell personal information.</li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Cookies and tracking">
        <p className="text-hm-ink-soft">
          We use cookies and similar technologies for authentication, security,
          preferences, and analytics. See the{' '}
          <EditorialLink href="/cookies">Cookie Policy</EditorialLink> for
          details.
        </p>
      </EditorialSection>

      <EditorialSection title="Your choices and rights">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            Request access, correction, or deletion by emailing{' '}
            <EditorialLink href="mailto:privacy@homematch.pro">
              privacy@homematch.pro
            </EditorialLink>
            .
          </li>
          <li>
            Manage cookies through your browser settings and the Cookie Settings
            in our{' '}
            <EditorialLink href="/cookies#cookie-settings">
              Cookie Policy
            </EditorialLink>
            .
          </li>
          <li>
            You can opt out of marketing emails if we send them; we will still
            send account or service-related messages.
          </li>
          <li>
            Disabling certain data uses may limit features like recommendations.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="California privacy rights">
        <p className="text-hm-ink-soft">
          If you are a California resident, you have rights to know, access,
          correct, and delete personal information, and to opt out of the sale
          or sharing of personal information for cross-context behavioral
          advertising. We do not sell personal information.
        </p>
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            You can opt out of advertising-related sharing by disabling
            Advertising cookies in the Cookie Settings or emailing{' '}
            <EditorialLink href="mailto:privacy@homematch.pro">
              privacy@homematch.pro
            </EditorialLink>
            .
          </li>
          <li>
            You may request access, deletion, or correction of your data using
            the contact methods above. We will verify your request before
            responding.
          </li>
          <li>
            We will not discriminate against you for exercising your privacy
            rights.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Data retention and security">
        <p className="text-hm-ink-soft">
          We retain data only as long as needed for the purposes described in
          this policy and to meet legal obligations. We use administrative,
          technical, and physical safeguards to protect information, but no
          system is 100% secure.
        </p>
      </EditorialSection>

      <EditorialSection title="International transfers">
        <p className="text-hm-ink-soft">
          We operate in the United States and may process data in the US or
          other countries where our service providers operate.
        </p>
      </EditorialSection>

      <EditorialSection title="Children’s privacy">
        <p className="text-hm-ink-soft">
          HomeMatch is not intended for children under 13, and we do not
          knowingly collect personal information from children.
        </p>
      </EditorialSection>

      <EditorialSection title="Changes">
        <p className="text-hm-ink-soft">
          We may update this policy as we launch new features or to comply with
          regulations. Material changes will be announced in-app or via email
          where required.
        </p>
      </EditorialSection>

      <EditorialSection title="Contact">
        <p className="text-hm-ink-soft">
          Questions or requests? Email{' '}
          <EditorialLink href="mailto:privacy@homematch.pro">
            privacy@homematch.pro
          </EditorialLink>
          .
        </p>
      </EditorialSection>
    </EditorialPageShell>
  )
}
