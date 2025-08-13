'use client'

import { MotionDiv } from '@/components/ui/motion-components'
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
    <section className="relative py-14 sm:py-16">
      {/* Clean break from Hero; align background with How It Works refined light grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            'radial-gradient(1200px 600px at 50% -10%, rgba(2,26,68,0.06) 0%, rgba(2,26,68,0.03) 35%, rgba(255,255,255,1) 65%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-20"
        aria-hidden
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(2,26,68,0.08) 0px, rgba(2,26,68,0.08) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(2,26,68,0.08) 0px, rgba(2,26,68,0.08) 1px, transparent 1px, transparent 28px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(600px 300px at 80% 0%, rgba(41,227,255,0.12) 0%, rgba(41,227,255,0) 60%), radial-gradient(700px 320px at 15% 0%, rgba(6,58,158,0.10) 0%, rgba(6,58,158,0) 60%)',
        }}
      />

      <div className="container mx-auto px-4">
        <MotionDiv
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
        </MotionDiv>

        <div className="mt-12 grid gap-6 sm:mt-16 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <MotionDiv
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="group relative h-full overflow-hidden border-gray-200 bg-white p-4 transition-all duration-300 hover:shadow-xl sm:p-6">
                {/* Hover Glow Effect */}
                <MotionDiv
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
                <MotionDiv
                  className="absolute inset-0 rounded-lg transition-all duration-300"
                  whileHover={{
                    boxShadow: '0 0 0 2px rgba(41, 227, 255, 0.5)',
                  }}
                />

                <div className="relative z-10">
                  <MotionDiv
                    className="mb-4 inline-flex rounded-lg p-3 text-white"
                    style={{
                      background:
                        'linear-gradient(135deg, #021A44 0%, #063A9E 100%)',
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <feature.icon className="h-6 w-6" />
                  </MotionDiv>

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
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  )
}
