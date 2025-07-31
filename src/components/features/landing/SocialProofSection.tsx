'use client'

import { motion } from 'framer-motion'
import { Heart, Clock, Star } from 'lucide-react'

const stats = [
  {
    icon: Heart,
    value: "10,000+",
    label: "Happy Couples Matched",
    color: "text-teal-600"
  },
  {
    icon: Clock,
    value: "85%",
    label: "Faster Decision Making",
    color: "text-blue-600"
  },
  {
    icon: Star,
    value: "4.8/5",
    label: "Couple Satisfaction Rate",
    color: "text-yellow-600"
  }
]

export function SocialProofSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.h2 
            className="text-3xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Loved by Couples Everywhere
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <p className="text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
