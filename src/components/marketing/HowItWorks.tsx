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
      className="relative bg-transparent py-12 sm:py-16"
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
            className="mt-4 text-lg text-gray-600 sm:text-xl"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Three simple steps to go from scrolling to moving in.
          </p>
        </MotionDiv>

        <div className="mt-12 grid gap-6 sm:mt-16 sm:grid-cols-3">
          {steps.map((step, i) => (
            <MotionDiv
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
            >
              <Card className="relative h-full overflow-hidden border-white/60 bg-white/80 p-6 shadow-[0_6px_28px_rgba(2,6,23,0.08)] backdrop-blur-[2px] transition-shadow hover:shadow-[0_10px_36px_rgba(2,6,23,0.12)]">
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-[#021A44] to-[#063A9E] p-3 text-white shadow-[0_8px_24px_rgba(2,26,68,0.18)]">
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
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  )
}
