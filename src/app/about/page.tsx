import { createPublicRouteMetadata } from '@/lib/seo/route-metadata'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { EditorialPageHeader } from '@/components/editorial/EditorialPageHeader'
import { EditorialSection } from '@/components/editorial/EditorialSection'
import { EditorialLink } from '@/components/editorial/EditorialLink'

export const metadata = createPublicRouteMetadata({
  title: 'About HomeMatch | Collaborative Home Search for Households',
  description:
    'Learn how HomeMatch makes home search a calmer, collaborative experience — couples and households shortlist properties, agree faster, and find a home together with AI-powered matching.',
  path: '/about',
})

export default function AboutPage() {
  return (
    <EditorialPageShell header={<MarketingPageHeader />}>
      <EditorialPageHeader
        eyebrow="About"
        title="Home search, together"
        lead="HomeMatch helps households shortlist, compare, and agree faster — with a shared flow that feels more like collaboration than chaos."
      />

      <EditorialSection title="What HomeMatch does">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            Keeps everyone aligned with shared likes, passes, and viewed homes.
          </li>
          <li>
            Highlights the evidence that matters — price, layout, and
            neighborhood fit — so you can decide with less back-and-forth.
          </li>
          <li>
            Aims for clarity over clutter: fewer pop-ups, fewer dark patterns,
            more signal.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="How we think about trust">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            Privacy-first by default. Read our{' '}
            <EditorialLink href="/privacy">Privacy Policy</EditorialLink>.
          </li>
          <li>
            Clear labeling when something is sponsored, with ad placements
            designed to stay out of the way.
          </li>
          <li>
            Transparent rules for using the product in our{' '}
            <EditorialLink href="/terms">Terms of Service</EditorialLink>.
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Not a brokerage">
        <p className="text-hm-ink-soft">
          HomeMatch is a software product to help you organize your home search.
          We are not a real estate broker or agent, and we don’t provide
          financial, legal, or investment advice.
        </p>
      </EditorialSection>

      <EditorialSection title="Contact">
        <p className="text-hm-ink-soft">
          Questions, feedback, or partnership ideas? Visit{' '}
          <EditorialLink href="/contact">Contact</EditorialLink>.
        </p>
      </EditorialSection>
    </EditorialPageShell>
  )
}
