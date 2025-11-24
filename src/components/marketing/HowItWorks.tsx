'use client'

import { MotionDiv } from '@/components/ui/motion-components'
import { Card } from '@/components/ui/card'
import { Heart, MapPin, Sparkles } from 'lucide-react'

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
    <section
      className="relative bg-transparent pt-0 pb-8 sm:pt-0 sm:pb-12"
      id="how-it-works"
    >
      <div className="container mx-auto px-4">
        <MotionDiv
          className="mx-auto text-center"
          style={{ maxWidth: '48rem' }}
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
            className="mt-3 text-lg text-gray-600 sm:text-xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Three simple steps to go from scrolling to moving in.
          </p>
        </MotionDiv>

        <div className="mt-3 grid gap-4 sm:mt-3 sm:grid-cols-3 sm:gap-5">
          {steps.map((step, i) => (
            <MotionDiv
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
            >
              <Card className="relative h-full overflow-hidden border-white/60 bg-white p-5 shadow-[0_6px_22px_rgba(2,6,23,0.06)] transition-shadow hover:shadow-[0_10px_30px_rgba(2,6,23,0.1)] sm:p-6">
                <div className="mb-2 inline-flex rounded-xl bg-gradient-to-br from-[#021A44] to-[#063A9E] p-3 text-white shadow-[0_6px_18px_rgba(2,26,68,0.15)]">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3
                  className="text-xl font-semibold text-gray-900"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {i + 1}. {step.title}
                </h3>
                <p
                  className="mt-1.5 text-gray-600"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {step.description}
                </p>
              </Card>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  )
}
