'use client'

import { motion } from 'framer-motion'
import { Heart, X, MapPin } from 'lucide-react'

export function PhoneMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="relative"
    >
      <div className="bg-gray-900 rounded-3xl p-4 mx-auto max-w-sm shadow-2xl">
        <div className="bg-white rounded-2xl overflow-hidden">
          {/* Phone Status Bar */}
          <div className="bg-white px-4 pt-2 pb-1 flex justify-between items-center text-xs text-gray-600">
            <span>9:41 AM</span>
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-gray-400 rounded"></div>
              <div className="w-1 h-3 bg-gray-400 rounded"></div>
              <div className="w-1 h-3 bg-gray-400 rounded"></div>
            </div>
          </div>
          
          {/* Property Card */}
          <div className="swipe-card bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Modern home" 
              className="w-full h-64 object-cover"
            />
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">$450,000</h3>
                  <p className="text-gray-600 text-sm">3 bed • 2 bath • 1,850 sq ft</p>
                </div>
                <div className="text-right">
                  <div className="bg-teal-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    92% Match
                  </div>
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-3">Modern family home in quiet neighborhood with great schools</p>
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-1" />
                1234 Oak Street, Portland, OR
              </div>
            </div>
          </div>
          
          {/* Swipe Actions */}
          <div className="flex justify-center space-x-8 py-6">
            <motion.button 
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-8 h-8" />
            </motion.button>
            <motion.button 
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-green-600 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart className="w-8 h-8" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
