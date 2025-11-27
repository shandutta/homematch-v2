'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { Card } from '@/components/ui/card'
import { Heart, MapPin, Sparkles } from 'lucide-react'

const HOW_IT_WORKS_STEPS = [
  {
    icon: Sparkles,
    title: 'Tell Us Your Vibe',
    description:
      'Cozy craftsman or sleek modern? Walkable cafés or quiet cul‑de‑sac? We learn what you both love.',
    iconAnimation: 'sparkle',
  },
  {
    icon: Heart,
    title: 'Swipe Together',
    description:
      'Make fast decisions with side‑by‑side swiping, instant alignment signals, and AI‑powered tie‑breakers.',
    iconAnimation: 'heartbeat',
  },
  {
    icon: MapPin,
    title: 'Match With Neighborhoods',
    description:
      'Beyond bedrooms—discover areas that fit your lifestyle, commute, and weekend plans.',
    iconAnimation: 'bounce',
  },
] as const

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const [activeStep, setActiveStep] = useState(-1)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  const steps = HOW_IT_WORKS_STEPS

  // Activate steps sequentially when in view
  useEffect(() => {
    if (!isInView) return

    const timers: NodeJS.Timeout[] = []
    steps.forEach((_, i) => {
      timers.push(
        setTimeout(
          () => {
            setActiveStep(i)
          },
          i * 300 + 200
        )
      )
    })

    return () => timers.forEach(clearTimeout)
  }, [isInView, steps])

  return (
    <section
      ref={sectionRef}
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

        <div className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {steps.map((step, i) => (
            <StepCard
              key={step.title}
              step={step}
              index={i}
              isActive={activeStep >= i}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function StepCard({
  step,
  index,
  isActive,
}: {
  step: {
    icon: typeof Sparkles
    title: string
    description: string
    iconAnimation: string
  }
  index: number
  isActive: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)

  const getIconAnimation = () => {
    if (!isHovered) return {}

    switch (step.iconAnimation) {
      case 'sparkle':
        return {
          animate: {
            rotate: [0, 15, -15, 0],
            scale: [1, 1.1, 1],
          },
          transition: { duration: 0.6, repeat: Infinity },
        }
      case 'heartbeat':
        return {
          animate: { scale: [1, 1.2, 1, 1.15, 1] },
          transition: { duration: 0.8, repeat: Infinity },
        }
      case 'bounce':
        return {
          animate: { y: [0, -4, 0] },
          transition: { duration: 0.5, repeat: Infinity },
        }
      default:
        return {}
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={
        isActive
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0.5, y: 24, scale: 0.95 }
      }
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 15,
        delay: index * 0.1,
      }}
    >
      <Card
        className="group relative h-full overflow-hidden border-white/60 bg-white p-5 shadow-[0_6px_22px_rgba(2,6,23,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(2,6,23,0.1)] sm:p-6"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glow effect on active */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: isActive ? 0.5 : 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.15), transparent 60%)',
          }}
        />

        <div className="relative z-10">
          {/* Icon with animation */}
          <motion.div
            className="mb-2 inline-flex rounded-xl bg-gradient-to-br from-[#021A44] to-[#063A9E] p-3 text-white shadow-[0_6px_18px_rgba(2,26,68,0.15)]"
            animate={
              isActive ? { scale: 1, rotate: 0 } : { scale: 0.9, rotate: -5 }
            }
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <motion.div {...getIconAnimation()}>
              <step.icon className="h-6 w-6" />
            </motion.div>
          </motion.div>

          <h3
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {index + 1}. {step.title}
          </h3>

          <motion.p
            className="mt-1.5 text-gray-600"
            style={{ fontFamily: 'var(--font-body)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isActive ? 1 : 0.6 }}
            transition={{ duration: 0.3 }}
          >
            {step.description}
          </motion.p>
        </div>
      </Card>
    </motion.div>
  )
}
