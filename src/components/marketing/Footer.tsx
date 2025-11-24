import Link from 'next/link'
import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gradient-marketing-primary px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="container mx-auto max-w-5xl px-1 sm:px-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 mb-6 flex flex-col items-center lg:col-span-1 lg:items-start">
            <h3
              className="text-token-3xl text-center font-bold lg:text-left"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              HomeMatch
            </h3>
            <div className="mt-1 flex gap-3">
              <a
                href="https://twitter.com/homematch"
                className="rounded-token-md transition-token-colors inline-flex min-h-[40px] min-w-[40px] items-center justify-center p-2 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="X (formerly Twitter)"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/homematch"
                className="rounded-token-md p-token-md transition-token-colors inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="text-center lg:text-left">
            <h4
              className="text-token-sm mb-0 font-semibold tracking-wider uppercase lg:mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Product
            </h4>
            <ul
              className="text-token-sm space-y-0 leading-none text-white/70 lg:space-y-3 lg:leading-normal"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <li>
                <Link
                  href="/signup"
                  className="transition-token-colors hover:text-white"
                >
                  Get Started
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="transition-token-colors hover:text-white"
                >
                  Sign In
                </Link>
              </li>
              {/* TODO: Implement these sections on the landing page */}
              <li>
                <Link
                  href="#features"
                  className="transition-token-colors hover:text-white"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#how-it-works"
                  className="transition-token-colors hover:text-white"
                >
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="text-center lg:text-left">
            <h4
              className="text-token-sm mb-0 font-semibold tracking-wider uppercase lg:mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Company
            </h4>
            <ul
              className="text-token-sm space-y-0 leading-none text-white/70 lg:space-y-3 lg:leading-normal"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <li>
                <Link
                  href="/about"
                  className="transition-token-colors hover:text-white"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-token-colors hover:text-white"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="transition-token-colors hover:text-white"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="transition-token-colors hover:text-white"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="mt-4 text-center lg:mt-0 lg:text-left">
            <h4
              className="text-token-sm mb-0 font-semibold tracking-wider uppercase lg:mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Legal
            </h4>
            <ul
              className="text-token-sm space-y-0 leading-none text-white/70 lg:space-y-3 lg:leading-normal"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <li>
                <Link
                  href="/privacy"
                  className="transition-token-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition-token-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="transition-token-colors hover:text-white"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 text-center sm:mt-8 sm:pt-6">
          <p
            className="text-token-xs sm:text-token-sm flex items-center justify-center gap-1 text-white/70"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Built with
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            in the Bay Area
          </p>
          <p
            className="text-token-xs mt-1 text-white/50 sm:mt-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            © 2024 HomeMatch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
