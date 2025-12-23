import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About | HomeMatch',
  description:
    'Learn what HomeMatch is building for households who want a calmer way to find a home together.',
}

export default function AboutPage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            About
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Home search, together
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            HomeMatch helps households shortlist, compare, and agree faster—
            with a shared flow that feels more like collaboration than chaos.
          </p>
        </header>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">What HomeMatch does</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Keeps everyone aligned with shared likes, passes, and viewed
              homes.
            </li>
            <li>
              Highlights what matters (price, layout, neighborhood vibe) so you
              can decide with less back-and-forth.
            </li>
            <li>
              Aims for clarity over clutter: fewer pop-ups, fewer dark patterns,
              more signal.
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">How we think about trust</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Privacy-first by default. Read our{' '}
              <Link href="/privacy" className="text-sky-600 underline">
                Privacy Policy
              </Link>
              .
            </li>
            <li>
              Clear labeling when something is sponsored, with ad placements
              designed to stay out of the way.
            </li>
            <li>
              Transparent rules for using the product in our{' '}
              <Link href="/terms" className="text-sky-600 underline">
                Terms of Service
              </Link>
              .
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Not a brokerage</h2>
          <p className="text-slate-700">
            HomeMatch is a software product to help you organize your home
            search. We are not a real estate broker or agent, and we don’t
            provide financial, legal, or investment advice.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-slate-700">
            Questions, feedback, or partnership ideas? Visit{' '}
            <Link href="/contact" className="text-sky-600 underline">
              Contact
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
