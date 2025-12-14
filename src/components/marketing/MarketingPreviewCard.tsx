'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import {
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  motion,
} from 'framer-motion'
import { cn } from '@/lib/utils'
import { Bed, Bath, MapPin, Heart, X, ShieldCheck } from 'lucide-react'
import { MotionDiv } from '@/components/ui/motion-components'

interface MarketingPreviewCardProps {
  className?: string
}

export function MarketingPreviewCard({ className }: MarketingPreviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const { scrollY } = useScroll()

  // Mouse position for 3D tilt effect
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  // Smooth spring animation
  const springConfig = { stiffness: 150, damping: 20 }
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [8, -8]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-8, 8]), springConfig)

  // Parallax shifts for floating badges
  const couplesShift = useTransform(scrollY, [0, 600], [18, -48])
  const spotsShift = useTransform(scrollY, [0, 600], [12, -36])
  const listingsShift = useTransform(scrollY, [0, 600], [22, -58])

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    mouseX.set(0.5)
    mouseY.set(0.5)
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        'relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0f172a]/85 shadow-[0_18px_44px_rgba(0,0,0,0.3),0_0_40px_rgba(56,189,248,0.08)] backdrop-blur-xl transition-shadow duration-300',
        isHovered &&
          'shadow-[0_24px_60px_rgba(0,0,0,0.4),0_0_60px_rgba(56,189,248,0.12)]',
        className
      )}
      style={{
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Subtle glow effect on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[24px] opacity-0 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(56,189,248,0.1), transparent 40%)',
          opacity: isHovered ? 1 : 0,
        }}
      />

      <div className="relative aspect-[4/3]">
        <Image
          src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80"
          alt="Sample property interior"
          fill
          sizes="(max-width: 768px) 100vw, 540px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-black/20 to-transparent" />

        {/* Price badge */}
        <motion.div
          className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-lg font-bold text-slate-900 shadow-lg backdrop-blur-sm"
          animate={
            isHovered && !prefersReducedMotion
              ? { scale: 1.05, y: -2 }
              : { scale: 1, y: 0 }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          $975,000
        </motion.div>

        {/* Floating feature badges */}
        <div className="pointer-events-none absolute inset-0">
          {[
            {
              title: 'Built for couples',
              copy: 'Stay in sync on likes, tours, and moves.',
              icon: ShieldCheck,
              className: 'left-2 top-2 sm:left-4 sm:top-4',
              shift: couplesShift,
            },
            {
              title: 'See nearby spots',
              copy: 'Peek at parks and cafés without leaving the card.',
              icon: MapPin,
              className: 'hidden sm:flex right-4 top-30',
              shift: spotsShift,
            },
            {
              title: 'Real listings, quick swipes',
              copy: 'Decide together in one tap.',
              icon: Heart,
              className: 'right-2 bottom-20 sm:left-4 sm:bottom-25',
              shift: listingsShift,
            },
          ].map(({ title, copy, icon: Icon, className: pos, shift }) => (
            <MotionDiv
              key={title}
              className={cn(
                'absolute flex max-w-[210px] flex-col gap-1 rounded-2xl border border-white/20 bg-[#0f172a]/70 p-3 text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:max-w-[230px]',
                pos
              )}
              style={{ y: shift }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-slate-300 uppercase">
                <Icon className="h-4 w-4 text-sky-400" />
                {title}
              </div>
              <p className="text-sm text-slate-200">{copy}</p>
            </MotionDiv>
          ))}
        </div>
      </div>

      {/* Card content */}
      <div className="space-y-4 p-6 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
            Listing · Lake Merritt
          </p>
          <h3 className="text-xl font-semibold text-white">
            1200 Lakeview Dr, Oakland, CA 94610
          </h3>
        </div>

        {/* Property tags */}
        <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-200">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2">
            <Bed className="h-4 w-4 text-slate-400" />
            <span>3 beds</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2">
            <Bath className="h-4 w-4 text-slate-400" />
            <span>2 baths</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>Near parks</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <motion.button
            className="flex-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-400 shadow-sm transition-colors hover:border-rose-500/50 hover:bg-rose-500/20"
            whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
            whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <X className="h-4 w-4" />
              Pass
            </span>
          </motion.button>
          <motion.button
            className="flex-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-400 shadow-sm transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/30"
            whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
            whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Heart className="h-4 w-4" />
              Love
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
