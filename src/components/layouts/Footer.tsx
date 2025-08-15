'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-token-3xl border-token-primary-light bg-token-primary-light/10 border-t">
      <div className="container-token text-token-secondary py-token-lg text-center">
        <p>&copy; {new Date().getFullYear()} HomeMatch. All rights reserved.</p>
        <div className="mt-token-sm gap-token-lg text-token-sm flex justify-center">
          <Link
            href="/terms"
            className="transition-token-colors hover:text-token-primary"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="transition-token-colors hover:text-token-primary"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
