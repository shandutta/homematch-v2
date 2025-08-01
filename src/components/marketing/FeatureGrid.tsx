'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Brain, Users, Heart, MessageSquare } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI That Gets You Both',
    description:
      'Our ML learns what makes you and your partner tick, finding homes that check both your boxes.',
  },
  {
    icon: Users,
    title: 'Swipe Together, Decide Together',
    description:
      'Real-time collaboration means no more screenshot chains. See what they see, when they see it.',
  },
  {
    icon: Heart,
    title: 'Match on What Matters',
    description:
      'Beyond bedrooms and bathrooms—we match on vibe, neighborhood feel, and future potential.',
  },
  {
    icon: MessageSquare,
    title: 'Talk Like Humans, Search Like Pros',
    description:
      '"Walking distance to coffee, big kitchen, room for a dog" becomes your perfect property list.',
  },
]

export function FeatureGrid() {
  return (
    <section className="bg-gray-50 py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2
            className="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl lg:text-6xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            House Hunting, But Make It{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                background: 'linear-gradient(135deg, #021A44 0%, #063A9E 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Actually Fun
            </span>
          </h2>
          <p
            className="mt-4 text-lg text-gray-600 sm:text-xl md:text-2xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            We turned the most stressful part of adulting into date night
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:mt-16 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="group relative h-full overflow-hidden border-gray-200 bg-white p-4 transition-all duration-300 hover:shadow-xl sm:p-6">
                {/* Hover Glow Effect */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(41, 227, 255, 0) 0%, rgba(41, 227, 255, 0.1) 100%)',
                    opacity: 0,
                  }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />

                {/* Neon Ring on Focus */}
                <motion.div
                  className="absolute inset-0 rounded-lg transition-all duration-300"
                  whileHover={{
                    boxShadow: '0 0 0 2px rgba(41, 227, 255, 0.5)',
                  }}
                />

                <div className="relative z-10">
                  <motion.div
                    className="mb-4 inline-flex rounded-lg p-3 text-white"
                    style={{
                      background:
                        'linear-gradient(135deg, #021A44 0%, #063A9E 100%)',
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <feature.icon className="h-6 w-6" />
                  </motion.div>

                  <h3
                    className="mb-2 text-lg font-semibold text-gray-900 sm:text-xl"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {feature.title}
                  </h3>

                  <p
                    className="text-sm text-gray-600 sm:text-base"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {feature.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
