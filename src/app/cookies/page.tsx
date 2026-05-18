import { CookiePreferencesPanel } from '@/components/legal/CookiePreferencesPanel'
import { createPublicRouteMetadata } from '@/lib/seo/route-metadata'
import { MarketingPageHeader } from '@/components/marketing/MarketingPageHeader'
import { EditorialPageShell } from '@/components/editorial/EditorialPageShell'
import { EditorialPageHeader } from '@/components/editorial/EditorialPageHeader'
import { EditorialSection } from '@/components/editorial/EditorialSection'
import { EditorialLink } from '@/components/editorial/EditorialLink'

export const metadata = createPublicRouteMetadata({
  title: 'Cookie Policy | HomeMatch',
  description:
    'Understand how cookies and similar technologies are used by HomeMatch and how you can manage preferences.',
  path: '/cookies',
})

export default function CookiesPage() {
  return (
    <EditorialPageShell header={<MarketingPageHeader />}>
      <EditorialPageHeader
        eyebrow="Cookie policy"
        title="How we use cookies"
        lead="We use cookies and similar technologies to keep you signed in, secure your account, and measure product performance."
        meta="Last updated: May 13, 2026"
      />

      <section id="cookie-settings" className="space-y-6">
        <CookiePreferencesPanel />
      </section>

      <EditorialSection title="What are cookies?">
        <p className="text-hm-ink-soft">
          Cookies are small text files stored on your device. We may also use
          similar technologies like local storage, SDKs, and pixels to remember
          settings, authenticate sessions, and understand how the service
          performs.
        </p>
      </EditorialSection>

      <EditorialSection title="How we use cookies today">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>
            Essential: authentication (Supabase session cookies), security, load
            balancing, and fraud prevention.
          </li>
          <li>
            Preferences: remembering settings such as saved filters or interface
            choices.
          </li>
          <li>
            Analytics and performance: first-party metrics and Vercel Speed
            Insights (when enabled) to understand feature usage and improve
            reliability.
          </li>
          <li>
            Advertising (if enabled): partners like Google AdSense may use
            cookies to serve and measure ads. You can manage ad personalization
            at{' '}
            <EditorialLink href="https://adssettings.google.com/">
              adssettings.google.com
            </EditorialLink>
            .
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Managing cookies">
        <ul className="text-hm-ink-soft list-disc space-y-3 pl-5">
          <li>You can block or delete cookies via your browser settings.</li>
          <li>
            Use the cookie settings above to opt in or out of optional cookie
            categories. Opting out of non-essential cookies may limit
            personalization or analytics insights, but essential cookies are
            required for core functionality.
          </li>
          <li>
            California residents can opt out of cross-context behavioral
            advertising by disabling Advertising cookies or emailing{' '}
            <EditorialLink href="mailto:privacy@homematch.pro">
              privacy@homematch.pro
            </EditorialLink>
            .
          </li>
        </ul>
      </EditorialSection>

      <EditorialSection title="Updates">
        <p className="text-hm-ink-soft">
          We may update this policy as our use of cookies changes. Material
          changes will be announced in-app or via email where required.
        </p>
      </EditorialSection>

      <EditorialSection title="Contact">
        <p className="text-hm-ink-soft">
          Questions about cookies? Email{' '}
          <EditorialLink href="mailto:privacy@homematch.pro">
            privacy@homematch.pro
          </EditorialLink>
          .
        </p>
      </EditorialSection>
    </EditorialPageShell>
  )
}
