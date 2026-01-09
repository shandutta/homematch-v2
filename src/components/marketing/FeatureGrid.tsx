'use client'

import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'
import { Card } from '@/components/ui/card'
import {
  Brain,
  Users,
  Heart,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI That Gets Everyone',
    description:
      'Our ML learns what matters to your household, finding homes that check the shared boxes.',
    iconAnimation: 'pulse',
  },
  {
    icon: Users,
    title: 'Swipe Together, Decide Together',
    description:
      'Real-time collaboration means no more screenshot chains. See what they see, when they see it.',
    iconAnimation: 'bounce',
  },
  {
    icon: Heart,
    title: 'Match on What Matters',
    description:
      'Beyond bedrooms and bathrooms—we match on vibe, neighborhood feel, and future potential.',
    iconAnimation: 'heartbeat',
  },
  {
    icon: MessageSquare,
    title: 'Talk Like Humans, Search Like Pros',
    description:
      '"Walking distance to coffee, big kitchen, room for a dog" becomes your perfect property list.',
    iconAnimation: 'typing',
  },
]

// Spotlight card with mouse-following effect
function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  const styleVars: CSSProperties & Record<string, MotionValue<number>> = {
    '--mouse-x': mouseX,
    '--mouse-y': mouseY,
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      style={styleVars}
    >
      {/* Spotlight overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) =>
              `radial-gradient(400px circle at ${x}px ${y}px, rgba(56,189,248,0.1), transparent 40%)`
          ),
        }}
      />
      {children}
    </div>
  )
}

// Icon with micro-animation
function AnimatedIcon({
  Icon,
  animation,
  isHovered,
}: {
  Icon: LucideIcon
  animation: string
  isHovered: boolean
}) {
  const getAnimationProps = () => {
    if (!isHovered) return {}

    switch (animation) {
      case 'pulse':
        return {
          animate: {
            scale: [1, 1.15, 1],
            filter: [
              'drop-shadow(0 0 0px rgba(56,189,248,0))',
              'drop-shadow(0 0 8px rgba(56,189,248,0.6))',
              'drop-shadow(0 0 0px rgba(56,189,248,0))',
            ],
          },
          transition: { duration: 1, repeat: Infinity },
        }
      case 'bounce':
        return {
          animate: { y: [0, -4, 0] },
          transition: { duration: 0.6, repeat: Infinity },
        }
      case 'heartbeat':
        return {
          animate: { scale: [1, 1.2, 1, 1.15, 1] },
          transition: { duration: 0.8, repeat: Infinity },
        }
      case 'typing':
        return {
          animate: { rotate: [0, -5, 5, 0] },
          transition: { duration: 0.3, repeat: Infinity },
        }
      default:
        return {}
    }
  }

  return (
    <motion.div {...getAnimationProps()}>
      <Icon className="h-6 w-6" />
    </motion.div>
  )
}

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
          className="mx-auto text-center"
          style={{ maxWidth: '48rem' }}
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
            We turned the most stressful part of adulting into a shared game
          </p>
        </MotionDiv>

        {/* Feature cards container with stagger */}
        <motion.div
          className="mt-4 grid gap-6 sm:mt-8 sm:gap-8 md:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.12,
              },
            },
          }}
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function FeatureCard({ feature }: { feature: (typeof features)[0] }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, rotateX: -10 },
        visible: {
          opacity: 1,
          y: 0,
          rotateX: 0,
          transition: {
            type: 'spring',
            stiffness: 100,
            damping: 15,
          },
        },
      }}
      style={{ perspective: 1000 }}
    >
      <SpotlightCard className="h-full">
        <Card
          className="group relative h-full overflow-hidden border-gray-200 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Animated border gradient on hover */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background:
                'linear-gradient(135deg, rgba(56,189,248,0.3) 0%, rgba(14,165,233,0.1) 50%, rgba(56,189,248,0.3) 100%)',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              padding: '2px',
            }}
          />

          <div className="relative z-10">
            {/* Icon with gradient background and micro-animation */}
            <motion.div
              className="mb-4 inline-flex rounded-lg p-3 text-white"
              style={{
                background: 'linear-gradient(135deg, #021A44 0%, #063A9E 100%)',
              }}
              animate={
                isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <AnimatedIcon
                Icon={feature.icon}
                animation={feature.iconAnimation}
                isHovered={isHovered}
              />
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
      </SpotlightCard>
    </motion.div>
  )
}
