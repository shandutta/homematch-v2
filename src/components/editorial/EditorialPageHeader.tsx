import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EditorialEyebrow } from '@/components/editorial/EditorialEyebrow'

type EditorialPageHeaderProps = {
  eyebrow?: ReactNode
  title: ReactNode
  lead?: ReactNode
  /** Secondary line, e.g. "Last updated: May 13, 2026". */
  meta?: ReactNode
  className?: string
}

/**
 * Standard editorial page header: eyebrow + display heading + lead paragraph.
 * The <h1> inherits the Fraunces display face from the base layer.
 */
export function EditorialPageHeader({
  eyebrow,
  title,
  lead,
  meta,
  className,
}: EditorialPageHeaderProps) {
  return (
    <header className={cn('space-y-4', className)}>
      {eyebrow ? <EditorialEyebrow>{eyebrow}</EditorialEyebrow> : null}
      <h1 className="text-hm-ink text-3xl font-bold text-balance sm:text-4xl">
        {title}
      </h1>
      {lead ? (
        <p className="text-hm-muted max-w-3xl text-lg leading-relaxed">
          {lead}
        </p>
      ) : null}
      {meta ? <p className="text-hm-faint text-sm">{meta}</p> : null}
    </header>
  )
}
