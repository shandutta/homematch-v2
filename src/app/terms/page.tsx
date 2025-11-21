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
            These terms explain how you can use HomeMatch to collaborate on your
            home search. By using the product, you agree to them.
          </p>
        </header>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Using HomeMatch</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              You must provide accurate account information and keep credentials
              secure.
            </li>
            <li>
              You may not misuse the service (e.g., scraping, abuse,
              unauthorized access, or violating others’ rights).
            </li>
            <li>
              We may update or suspend features to keep the service reliable and
              secure.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Content and data</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              You retain rights to your content; you grant us a license to use
              it to operate and improve the service.
            </li>
            <li>
              We respect intellectual property. If you believe your rights are
              infringed, contact{' '}
              <Link
                href="mailto:legal@homematch.pro"
                className="text-sky-600 underline"
              >
                legal@homematch.pro
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Disclaimers & liability</h2>
          <p className="text-slate-700">
            HomeMatch is provided “as is.” To the extent permitted by law, we
            disclaim warranties of merchantability, fitness for a particular
            purpose, and non-infringement. Our liability is limited to the
            maximum extent permitted by law.
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
