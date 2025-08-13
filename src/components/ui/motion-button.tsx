'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type MotionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * Framer Motion props for animation
   */
  motionProps?: Omit<HTMLMotionProps<'div'>, 'children' | 'className' | 'style'>
}

/**
 * MotionButton - A button component that supports Framer Motion animations
 * without passing motion props to DOM elements (which causes React warnings).
 *
 * This component wraps a regular HTML button inside a motion.div to provide
 * animation capabilities while maintaining semantic button behavior.
 */
export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, className, motionProps, ...buttonProps }, ref) => {
    return (
      <motion.div {...motionProps}>
        <button ref={ref} className={cn(className)} {...buttonProps}>
          {children}
        </button>
      </motion.div>
    )
  }
)

MotionButton.displayName = 'MotionButton'
