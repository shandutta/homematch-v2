'use client'

import { motion } from 'framer-motion'
import { Heart, Clock, Star } from 'lucide-react'

const stats = [
  {
    icon: Heart,
    value: '10,000+',
    label: 'Happy Couples Matched',
    color: 'text-teal-600',
  },
  {
    icon: Clock,
    value: '85%',
    label: 'Faster Decision Making',
    color: 'text-blue-600',
  },
  {
    icon: Star,
    value: '4.8/5',
    label: 'Couple Satisfaction Rate',
    color: 'text-yellow-600',
  },
]

export function SocialProofSection() {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.h2
            className="mb-4 text-3xl font-bold text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Loved by Couples Everywhere
          </motion.h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </div>
                <div className="mb-2 text-4xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <p className="text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
