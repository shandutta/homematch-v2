import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | HomeMatch',
  description:
    'Learn how HomeMatch collects, uses, and protects your data while helping you find the right home together.',
}

export default function PrivacyPage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Privacy policy
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Your data, your control
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            We use your data to power collaborative home search, never to sell
            your personal information. This page explains what we collect, why,
            and how you can manage it.
          </p>
        </header>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">What we collect</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Account details you provide (name, email) for authentication.
            </li>
            <li>
              Preference inputs and interactions (likes, saved homes) to tailor
              recommendations.
            </li>
            <li>
              Usage and device info (IP, browser, coarse location) for security,
              analytics, and fraud prevention.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">How we use it</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Operate the app, sync households, and improve matching quality.
            </li>
            <li>
              Protect accounts, detect abuse, and comply with legal obligations.
            </li>
            <li>
              Run analytics to understand product performance; we do not sell
              your personal data.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Sharing</h2>
          <p className="text-slate-700">
            We share data with trusted processors (e.g., hosting, analytics,
            customer support) under data protection agreements. We may share
            aggregated, de-identified insights that cannot be tied back to you.
            We do not sell your personal information.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Advertising</h2>
          <p className="text-slate-700">
            If we show ads, they may be served by Google AdSense and other
            advertising partners. These partners may use cookies or similar
            technologies to provide, measure, and personalize ads. You can
            manage ad personalization in your Google account at{' '}
            <Link
              href="https://adssettings.google.com/"
              className="text-sky-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              adssettings.google.com
            </Link>
            .
          </p>
          <p className="text-slate-700">
            For more on how Google uses information from sites that use its
            services, see{' '}
            <Link
              href="https://policies.google.com/technologies/partner-sites"
              className="text-sky-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              policies.google.com/technologies/partner-sites
            </Link>
            .
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Your choices</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              You can request access, correction, or deletion of your data by
              emailing
              <Link
                href="mailto:privacy@homematch.pro"
                className="text-sky-600 underline"
              >
                {' '}
                privacy@homematch.pro
              </Link>
              .
            </li>
            <li>
              You can opt out of non-essential cookies/analytics where offered
              and adjust browser settings to limit tracking.
            </li>
            <li>
              If you disable certain data uses, some features (like
              recommendations) may be limited.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Data retention & security</h2>
          <p className="text-slate-700">
            We retain data only as long as necessary for the purposes above or
            as required by law. We use encryption in transit and at rest, access
            controls, and monitoring to protect your information.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Changes</h2>
          <p className="text-slate-700">
            We may update this policy as we launch new features or to comply
            with regulations. Material changes will be announced in-app or via
            email where required.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-slate-700">
            Questions or requests? Email{' '}
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
