import { createPublicRouteMetadata } from '@/lib/seo/route-metadata'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { EditorialPageHeader } from '@/components/editorial/EditorialPageHeader'
import { EditorialSection } from '@/components/editorial/EditorialSection'
import { EditorialLink } from '@/components/editorial/EditorialLink'

export const metadata = createPublicRouteMetadata({
  title: 'Contact | HomeMatch',
  description:
    'Get in touch with HomeMatch for support, privacy requests, or legal questions.',
  path: '/contact',
})

export default function ContactPage() {
  return (
    <EditorialPageShell header={<MarketingPageHeader />}>
      <EditorialPageHeader
        eyebrow="Contact"
        title="Reach HomeMatch"
        lead="We’re a small team and we read every message. Choose the right inbox below and we’ll get back as soon as we can."
      />

      <EditorialSection title="Email">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            Support &amp; feedback:{' '}
            <EditorialLink href="mailto:hello@homematch.pro">
              hello@homematch.pro
            </EditorialLink>
          </li>
          <li>
            Privacy requests (access, deletion, correction):{' '}
            <EditorialLink href="mailto:privacy@homematch.pro">
              privacy@homematch.pro
            </EditorialLink>
          </li>
          <li>
            Legal notices:{' '}
            <EditorialLink href="mailto:legal@homematch.pro">
              legal@homematch.pro
            </EditorialLink>
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Policies">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            <EditorialLink href="/privacy">Privacy Policy</EditorialLink>
          </li>
          <li>
            <EditorialLink href="/terms">Terms of Service</EditorialLink>
          </li>
          <li>
            <EditorialLink href="/cookies">Cookie Policy</EditorialLink>
          </li>
        </ul>
      </EditorialSection>
    </EditorialPageShell>
  )
}
