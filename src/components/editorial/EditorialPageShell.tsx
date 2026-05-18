import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EditorialPageShellProps = {
  children: ReactNode
  /** Optional header rendered full-bleed above the centered content column. */
  header?: ReactNode
  className?: string
  contentClassName?: string
}

/**
 * Warm editorial page shell — ivory canvas and a centered content column.
 * Replaces the `bg-slate-50` <main> wrappers on the public and legal pages.
 */
export function EditorialPageShell({
  children,
  header,
  className,
  contentClassName,
}: EditorialPageShellProps) {
  return (
    <main className={cn('bg-hm-canvas text-hm-ink min-h-screen', className)}>
      {header}
      <div
        className={cn(
          'mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16',
          contentClassName
        )}
      >
        {children}
      </div>
    </main>
  )
}
