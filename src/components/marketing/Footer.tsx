import Link from 'next/link'
import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer
      className="p-token-xl sm:p-token-2xl text-white bg-gradient-marketing-primary"
    >
      <div className="p-token-md container mx-auto">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <h3
              className="text-token-xl sm:text-token-2xl font-bold"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              HomeMatch
            </h3>
            <p
              className="mt-token-sm text-token-sm text-white/60"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Swipe. Match. Move In.
            </p>
            <div className="mt-token-md gap-token-md flex">
              <a
                href="https://twitter.com/homematch"
                className="rounded-token-md p-token-md transition-token-colors inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Twitter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
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
          <div>
            <h4
              className="mb-token-md text-token-sm sm:mb-token-md font-semibold tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Product
            </h4>
            <ul
              className="text-token-sm space-y-1.5 text-white/60 sm:space-y-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <li>
                <Link
                  href="/signup"
                  className="p-token-sm transition-token-colors inline-block min-h-[44px] hover:text-white"
                >
                  Get Started
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="p-token-sm transition-token-colors inline-block min-h-[44px] hover:text-white"
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
          <div>
            <h4
              className="mb-token-md text-token-sm sm:mb-token-md font-semibold tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Company
            </h4>
            <ul
              className="text-token-sm space-y-1.5 text-white/60 sm:space-y-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {/* TODO: Implement these pages */}
              <li>
                <Link
                  href="#"
                  className="transition-token-colors cursor-not-allowed opacity-50 hover:text-white"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="transition-token-colors cursor-not-allowed opacity-50 hover:text-white"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="transition-token-colors cursor-not-allowed opacity-50 hover:text-white"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="transition-token-colors cursor-not-allowed opacity-50 hover:text-white"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4
              className="mb-token-md text-token-sm sm:mb-token-md font-semibold tracking-wider uppercase"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Legal
            </h4>
            <ul
              className="text-token-sm space-y-1.5 text-white/60 sm:space-y-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {/* TODO: Implement these legal pages */}
              <li>
                <Link
                  href="#"
                  className="transition-token-colors cursor-not-allowed opacity-50 hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="transition-token-colors cursor-not-allowed opacity-50 hover:text-white"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="transition-token-colors cursor-not-allowed opacity-50 hover:text-white"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-token-xl pt-token-lg sm:mt-token-2xl sm:pt-token-xl border-t border-white/10 text-center">
          <p
            className="text-token-xs sm:text-token-sm flex items-center justify-center gap-1 text-white/60"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Built with
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            in the Bay Area
          </p>
          <p
            className="text-token-xs mt-1 text-white/40 sm:mt-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            © 2024 HomeMatch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
