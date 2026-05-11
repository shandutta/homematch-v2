'use client'

import { LazyMotion, domMax } from 'framer-motion'
import type { ReactNode } from 'react'

export function MotionMaxProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domMax}>{children}</LazyMotion>
}
