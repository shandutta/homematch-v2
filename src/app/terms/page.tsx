import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | HomeMatch',
  description:
    'Understand the terms that govern the use of HomeMatch for collaborative home search.',
}

export default function TermsPage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Terms of service
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Welcome to HomeMatch
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            These terms govern your use of HomeMatch. By accessing or using the
            service, you agree to them.
          </p>
          <p className="text-sm text-slate-500">
            Last updated: January 4, 2026
          </p>
        </header>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Eligibility and account</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>You must be at least 13 years old to use HomeMatch.</li>
            <li>
              Provide accurate information and keep your login credentials
              secure.
            </li>
            <li>
              If you use HomeMatch on behalf of an organization, you represent
              that you have authority to bind that organization to these terms.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Acceptable use</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Do not misuse the service (scraping, data harvesting, reverse
              engineering, or attempting to access private systems).
            </li>
            <li>
              Do not use HomeMatch to violate laws or the rights of others.
            </li>
            <li>
              Do not copy, download, or redistribute listing data or photos
              outside of the HomeMatch experience.
            </li>
            <li>
              We may update or suspend features to keep the service reliable and
              secure.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">
            Listings and third-party data
          </h2>
          <p className="text-slate-700">
            HomeMatch provides listing information sourced from third-party data
            providers via RapidAPI (US Housing Market Data and similar sources).
            Listings, photos, and pricing are provided for informational
            purposes only and may be incomplete, out of date, or inaccurate.
          </p>
          <p className="text-slate-700">
            HomeMatch is not a real estate broker, agent, or MLS and is not
            affiliated with Zillow or listing brokers. You should verify listing
            details directly with the listing source before making decisions.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Your content and feedback</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              You own your content, but you grant us a worldwide, non-exclusive
              license to host, store, and display it to operate the service.
            </li>
            <li>
              If you submit feedback or suggestions, you grant us the right to
              use them without restriction or compensation.
            </li>
            <li>
              You are responsible for the content you provide and for ensuring
              you have the rights to share it.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Third-party services</h2>
          <p className="text-slate-700">
            The service may include integrations with third-party services such
            as Google Maps and RapidAPI. Those services are governed by their
            own terms and privacy policies, and HomeMatch is not responsible for
            them.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Disclaimers</h2>
          <p className="text-slate-700">
            HomeMatch is provided &quot;as is&quot; and &quot;as
            available&quot;. To the maximum extent permitted by law, we disclaim
            warranties of merchantability, fitness for a particular purpose, and
            non-infringement. We do not guarantee that listings are accurate,
            current, or available, and we do not provide legal, financial, or
            real estate advice.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Limitation of liability</h2>
          <p className="text-slate-700">
            To the maximum extent permitted by law, HomeMatch and its affiliates
            will not be liable for indirect, incidental, special, consequential,
            or punitive damages, or any loss of profits, data, or goodwill. Our
            total liability for any claim is limited to the greater of $100 or
            the amount you paid to us in the 12 months before the claim.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Indemnification</h2>
          <p className="text-slate-700">
            You agree to indemnify and hold HomeMatch harmless from any claims,
            liabilities, damages, losses, and expenses (including reasonable
            attorneys&apos; fees) arising from your use of the service or your
            violation of these terms.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Termination</h2>
          <p className="text-slate-700">
            You can stop using HomeMatch at any time. We may suspend or
            terminate access for violations of these terms or to protect the
            service and its users.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Changes</h2>
          <p className="text-slate-700">
            We may update these terms as we launch new features or to meet legal
            requirements. Continued use after updates means you accept the new
            terms.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-slate-700">
            For questions, reach out to{' '}
            <Link
              href="mailto:legal@homematch.pro"
              className="text-sky-600 underline"
            >
              legal@homematch.pro
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
