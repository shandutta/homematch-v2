import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact | HomeMatch',
  description:
    'Get in touch with HomeMatch for support, privacy requests, or legal questions.',
}

export default function ContactPage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <header className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Contact
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Reach HomeMatch</h1>
          <p className="max-w-3xl text-lg text-slate-600">
            We’re a small team and we read every message. Choose the right inbox
            below and we’ll get back as soon as we can.
          </p>
        </header>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Email</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              Support & feedback:{' '}
              <Link
                href="mailto:privacy@homematch.pro"
                className="text-sky-600 underline"
              >
                privacy@homematch.pro
              </Link>
            </li>
            <li>
              Privacy requests (access, deletion, correction):{' '}
              <Link
                href="mailto:privacy@homematch.pro"
                className="text-sky-600 underline"
              >
                privacy@homematch.pro
              </Link>
            </li>
            <li>
              Legal notices:{' '}
              <Link
                href="mailto:legal@homematch.pro"
                className="text-sky-600 underline"
              >
                legal@homematch.pro
              </Link>
            </li>
          </ul>
        </section>

        <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-xl font-semibold">Policies</h2>
          <ul className="list-disc space-y-3 pl-5 text-slate-700">
            <li>
              <Link href="/privacy" className="text-sky-600 underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-sky-600 underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="text-sky-600 underline">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
