import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Small uppercase label that sits above an editorial heading.
 */
export function EditorialEyebrow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-hm-accent-strong text-xs font-semibold tracking-[0.2em] uppercase',
        className
      )}
    >
      {children}
    </p>
  )
}
