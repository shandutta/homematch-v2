'use client'

import { motion } from 'framer-motion'
import { Heart, X, MapPin } from 'lucide-react'
import Image from 'next/image'

export function PhoneMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="relative"
    >
      <div className="mx-auto max-w-sm rounded-3xl bg-gray-900 p-4 shadow-2xl">
        <div className="overflow-hidden rounded-2xl bg-white">
          {/* Phone Status Bar */}
          <div className="flex items-center justify-between bg-white px-4 pt-2 pb-1 text-xs text-gray-600">
            <span>9:41 AM</span>
            <div className="flex gap-1">
              <div className="h-3 w-1 rounded bg-gray-400"></div>
              <div className="h-3 w-1 rounded bg-gray-400"></div>
              <div className="h-3 w-1 rounded bg-gray-400"></div>
            </div>
          </div>

          {/* Property Card */}
          <div className="swipe-card overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <Image
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="Modern home"
              className="h-64 w-full object-cover"
              width={800}
              height={256}
            />
            <div className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">$450,000</h3>
                  <p className="text-sm text-gray-600">
                    3 bed • 2 bath • 1,850 sq ft
                  </p>
                </div>
                <div className="text-right">
                  <div className="rounded-full bg-teal-500 px-2 py-1 text-xs font-semibold text-white">
                    92% Match
                  </div>
                </div>
              </div>
              <p className="mb-3 text-sm text-gray-700">
                Modern family home in quiet neighborhood with great schools
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="mr-1 h-4 w-4" />
                1234 Oak Street, Portland, OR
              </div>
            </div>
          </div>

          {/* Swipe Actions */}
          <div className="flex justify-center space-x-8 py-6">
            <motion.button
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-8 w-8" />
            </motion.button>
            <motion.button
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-colors hover:bg-green-600"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart className="h-8 w-8" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
