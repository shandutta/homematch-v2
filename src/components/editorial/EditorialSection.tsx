import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EditorialSectionProps = {
  /** Optional section heading; rendered as an <h2> in the display font. */
  title?: ReactNode
  children: ReactNode
  className?: string
  /** Heading id for in-page anchors (e.g. /cookies#cookie-settings). */
  id?: string
}

/**
 * Warm editorial section card. Replaces the slate `bg-white ring-slate-200`
 * section blocks used across the public and legal pages with a single
 * ivory-surface, warm-bordered primitive.
 */
export function EditorialSection({
  title,
  children,
  className,
  id,
}: EditorialSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'bg-hm-surface ring-hm-border space-y-5 rounded-2xl p-6 shadow-[0_1px_3px_rgba(52,43,37,0.05)] ring-1 sm:p-8',
        className
      )}
    >
      {title ? (
        <h2 className="text-hm-ink text-xl font-semibold text-balance">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  )
}
