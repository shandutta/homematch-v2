'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-purple-500/20 bg-purple-900/10">
      <div className="container mx-auto px-4 py-6 text-center text-purple-300 sm:px-6 lg:px-8">
        <p>&copy; {new Date().getFullYear()} HomeMatch. All rights reserved.</p>
        <div className="mt-2 flex justify-center space-x-4 text-sm">
          <Link href="/terms" className="transition-colors hover:text-white">
            Terms of Service
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
