'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-purple-900/10 border-t border-purple-500/20 mt-12">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-purple-300">
        <p>&copy; {new Date().getFullYear()} HomeMatch. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2 text-sm">
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
