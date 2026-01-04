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
            Your data, your choices
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            HomeMatch helps you organize and collaborate on a home search. This
            policy explains what we collect, how we use it, and the choices you
            have.
          </p>
          <p className="text-sm text-slate-500">
            Last updated: January 4, 2026
          </p>
        </header>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Information we collect</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
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
              Device and usage data (IP address, browser type, device
              identifiers, log data, and timestamps).
            </li>
            <li>
              Approximate location inferred from IP. We only use precise
              location if you choose to share it or use map features.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">
            Information from third parties
          </h2>
          <p className="text-slate-700">
            We source property listings, details, and photos from third-party
            data providers via RapidAPI (US Housing Market Data and similar
            sources). We also use Google Maps and Places to power address search
            and map results. These providers receive your search queries and may
            process data under their own privacy policies.
          </p>
          <p className="text-slate-700">
            Listing data can be incomplete or out of date. HomeMatch is not
            affiliated with Zillow, MLSs, or listing brokers, and we do not
            guarantee the accuracy or availability of any listing.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">How we use information</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
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
              first-party metrics and Vercel Speed Insights; PostHog if
              enabled).
            </li>
            <li>Comply with legal obligations and protect our rights.</li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Sharing and disclosures</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Service providers who help us run the app (for example, hosting on
              Vercel, database and authentication via Supabase, analytics and
              performance tooling).
            </li>
            <li>
              RapidAPI and its data partners to fulfill listing-data requests
              and return property photos and details.
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
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Cookies and tracking</h2>
          <p className="text-slate-700">
            We use cookies and similar technologies for authentication,
            security, preferences, and analytics. See the{' '}
            <Link href="/cookies" className="text-sky-600 underline">
              Cookie Policy
            </Link>{' '}
            for details.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Your choices and rights</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Request access, correction, or deletion by emailing{' '}
              <Link
                href="mailto:privacy@homematch.pro"
                className="text-sky-600 underline"
              >
                privacy@homematch.pro
              </Link>
              .
            </li>
            <li>
              Manage cookies through your browser settings and any opt-out tools
              described in the Cookie Policy.
            </li>
            <li>
              You can opt out of marketing emails if we send them; we will still
              send account or service-related messages.
            </li>
            <li>
              Disabling certain data uses may limit features like
              recommendations.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Data retention and security</h2>
          <p className="text-slate-700">
            We retain data only as long as needed for the purposes described in
            this policy and to meet legal obligations. We use administrative,
            technical, and physical safeguards to protect information, but no
            system is 100% secure.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">International transfers</h2>
          <p className="text-slate-700">
            We operate in the United States and may process data in the US or
            other countries where our service providers operate.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Children&apos;s privacy</h2>
          <p className="text-slate-700">
            HomeMatch is not intended for children under 13, and we do not
            knowingly collect personal information from children.
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
