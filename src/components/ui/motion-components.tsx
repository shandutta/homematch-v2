'use client'

import { m, type Variants, type Transition } from 'framer-motion'
import { forwardRef } from 'react'

// React 19 compatible prop filtering for motion components
const filterMotionProps = (props: Record<string, unknown>) => {
  const {
    // React 19 server component props that should be filtered
    ref: _ref,
    suppressHydrationWarning: _suppressHydrationWarning,
    ...motionProps
  } = props
  // Note: 'key' is handled by React internally and shouldn't be accessed
  return motionProps
}

// Enhanced motion components with React 19 optimization and performance
export const MotionDiv = forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof m.div>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.div ref={ref} {...filteredProps} />
})
MotionDiv.displayName = 'MotionDiv'

export const MotionSpan = forwardRef<
  HTMLSpanElement,
  React.ComponentProps<typeof m.span>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.span ref={ref} {...filteredProps} />
})
MotionSpan.displayName = 'MotionSpan'

export const MotionSection = forwardRef<
  HTMLElement,
  React.ComponentProps<typeof m.section>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.section ref={ref} {...filteredProps} />
})
MotionSection.displayName = 'MotionSection'

export const MotionArticle = forwardRef<
  HTMLElement,
  React.ComponentProps<typeof m.article>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.article ref={ref} {...filteredProps} />
})
MotionArticle.displayName = 'MotionArticle'

export const MotionH1 = forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof m.h1>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.h1 ref={ref} {...filteredProps} />
})
MotionH1.displayName = 'MotionH1'

export const MotionH2 = forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof m.h2>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.h2 ref={ref} {...filteredProps} />
})
MotionH2.displayName = 'MotionH2'

export const MotionH3 = forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof m.h3>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.h3 ref={ref} {...filteredProps} />
})
MotionH3.displayName = 'MotionH3'

export const MotionP = forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<typeof m.p>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.p ref={ref} {...filteredProps} />
})
MotionP.displayName = 'MotionP'

export const MotionUl = forwardRef<
  HTMLUListElement,
  React.ComponentProps<typeof m.ul>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.ul ref={ref} {...filteredProps} />
})
MotionUl.displayName = 'MotionUl'

export const MotionLi = forwardRef<
  HTMLLIElement,
  React.ComponentProps<typeof m.li>
>((props, ref) => {
  const filteredProps = filterMotionProps(props)
  return <m.li ref={ref} {...filteredProps} />
})
MotionLi.displayName = 'MotionLi'

// Common animation variants using design tokens
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
}

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

// Performance-optimized transitions using CSS design tokens
export const fastTransition: Transition = {
  duration: 0.15, // --duration-fast: 150ms
  ease: 'easeOut',
}

export const normalTransition: Transition = {
  duration: 0.3, // --duration-normal: 300ms
  ease: 'easeInOut',
}

export const smoothTransition: Transition = {
  duration: 0.5, // --duration-smooth: 500ms
  ease: 'easeInOut',
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
