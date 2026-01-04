import { Metadata } from 'next'
import Link from 'next/link'
import { CookiePreferencesPanel } from '@/components/legal/CookiePreferencesPanel'

export const metadata: Metadata = {
  title: 'Cookie Policy | HomeMatch',
  description:
    'Understand how cookies and similar technologies are used by HomeMatch and how you can manage preferences.',
}

export default function CookiesPage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Cookie policy
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">How we use cookies</h1>
          <p className="max-w-3xl text-lg text-slate-600">
            We use cookies and similar technologies to keep you signed in,
            secure your account, and measure product performance.
          </p>
          <p className="text-sm text-slate-500">
            Last updated: January 4, 2026
          </p>
        </header>

        <section id="cookie-settings" className="space-y-6">
          <CookiePreferencesPanel />
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">What are cookies?</h2>
          <p className="text-slate-700">
            Cookies are small text files stored on your device. We may also use
            similar technologies like local storage, SDKs, and pixels to
            remember settings, authenticate sessions, and understand how the
            service performs.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">How we use cookies today</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Essential: authentication (Supabase session cookies), security,
              load balancing, and fraud prevention.
            </li>
            <li>
              Preferences: remembering settings such as saved filters or
              interface choices.
            </li>
            <li>
              Analytics and performance: first-party metrics and Vercel Speed
              Insights (when enabled) to understand feature usage and improve
              reliability.
            </li>
            <li>
              Advertising (if enabled): partners like Google AdSense may use
              cookies to serve and measure ads. You can manage ad
              personalization at{' '}
              <Link
                href="https://adssettings.google.com/"
                className="text-sky-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                adssettings.google.com
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Managing cookies</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
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
              <Link
                href="mailto:privacy@homematch.pro"
                className="text-sky-600 underline"
              >
                privacy@homematch.pro
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Updates</h2>
          <p className="text-slate-700">
            We may update this policy as our use of cookies changes. Material
            changes will be announced in-app or via email where required.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-slate-700">
            Questions about cookies? Email{' '}
            <Link
              href="mailto:privacy@homematch.pro"
              className="text-sky-600 underline"
            >
              privacy@homematch.pro
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
