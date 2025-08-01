'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function HowItWorks() {
  const steps = [
    {
      icon: Sparkles,
      title: 'Tell Us Your Vibe',
      description:
        'Cozy craftsman or sleek modern? Walkable cafés or quiet cul‑de‑sac? We learn what you both love.',
    },
    {
      icon: Heart,
      title: 'Swipe Together',
      description:
        'Make fast decisions with side‑by‑side swiping, instant alignment signals, and AI‑powered tie‑breakers.',
    },
    {
      icon: MapPin,
      title: 'Match With Neighborhoods',
      description:
        'Beyond bedrooms—discover areas that fit your lifestyle, commute, and weekend plans.',
    },
  ]

  return (
    <section className="bg-white py-16 sm:py-24" id="how-it-works">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2
            className="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            How It Works
          </h2>
          <p
            className="mt-4 text-lg text-gray-600 sm:text-xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Three simple steps to go from scrolling to moving in.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:mt-16 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
            >
              <Card className="relative h-full overflow-hidden border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg">
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-[#021A44] to-[#063A9E] p-3 text-white">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3
                  className="text-xl font-semibold text-gray-900"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {i + 1}. {step.title}
                </h3>
                <p
                  className="mt-2 text-gray-600"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {step.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button size="lg" asChild className="px-8">
            <Link href="/signup">Start Swiping</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
