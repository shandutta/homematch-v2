'use client'

import { motion } from 'framer-motion'
import { PhoneMockup } from './PhoneMockup'
import { Users, Heart, MessageCircle } from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Invite Your Partner',
    description: 'Share the search with your significant other or roommates',
    color: 'text-teal-600',
  },
  {
    icon: Heart,
    title: 'Swipe Right on Love',
    description:
      'Both swipe right on properties you love - matches appear when you both agree',
    color: 'text-red-500',
  },
  {
    icon: MessageCircle,
    title: 'Chat & Decide',
    description: 'Discuss matches in real-time and schedule viewings together',
    color: 'text-blue-500',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <motion.h2
            className="mb-4 text-4xl font-bold text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>
          <p className="text-xl text-gray-600">
            Like Tinder, but for finding your dream home together
          </p>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Phone Mockup */}
          <PhoneMockup />

          {/* Features List */}
          <div>
            <div className="space-y-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="flex items-start"
                >
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-500">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
