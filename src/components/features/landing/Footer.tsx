'use client'

import { motion } from 'framer-motion'

export function Footer() {
  return (
    <footer className="bg-gray-900 py-12 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="grid gap-8 md:grid-cols-4"
        >
          <div>
            <h3 className="mb-4 text-xl font-bold">HomeMatch</h3>
            <p className="text-sm text-gray-400">
              Find your dream home together.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="transition hover:text-white">
                  How it Works
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="transition hover:text-white">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Careers
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#" className="transition hover:text-white">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-400"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <p>&copy; 2025 HomeMatch. All rights reserved.</p>
        </motion.div>
      </div>
    </footer>
  )
}
