'use client'

import { motion, type Variants, type Transition } from 'framer-motion'
import { forwardRef } from 'react'

// Enhanced motion components with React 19 optimization and performance
export const MotionDiv = motion.div
export const MotionSpan = motion.span
export const MotionSection = motion.section
export const MotionArticle = motion.article
export const MotionH1 = motion.h1
export const MotionH2 = motion.h2
export const MotionH3 = motion.h3
export const MotionP = motion.p
export const MotionUl = motion.ul
export const MotionLi = motion.li

// Common animation variants using design tokens
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
}

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

// Performance-optimized transitions using CSS design tokens
export const fastTransition: Transition = {
  duration: 0.15, // --duration-fast: 150ms
  ease: 'easeOut'
}

export const normalTransition: Transition = {
  duration: 0.3, // --duration-normal: 300ms
  ease: 'easeInOut'
}

export const smoothTransition: Transition = {
  duration: 0.5, // --duration-smooth: 500ms
  ease: 'easeInOut'
}

// Pre-built motion components with design system integration
export const FadeInContainer = forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof MotionDiv>
>(({ children, ...props }, ref) => (
  <MotionDiv
    ref={ref}
    variants={fadeIn}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={normalTransition}
    {...props}
  >
    {children}
  </MotionDiv>
))

FadeInContainer.displayName = 'FadeInContainer'

export const SlideUpContainer = forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof MotionDiv>
>(({ children, ...props }, ref) => (
  <MotionDiv
    ref={ref}
    variants={fadeInUp}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={normalTransition}
    {...props}
  >
    {children}
  </MotionDiv>
))

SlideUpContainer.displayName = 'SlideUpContainer'