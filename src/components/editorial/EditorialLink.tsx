import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const isExternalHref = (href: string) => /^(https?:|mailto:|tel:)/.test(href)

type EditorialLinkProps = {
  href: string
  children: ReactNode
  className?: string
  /** Drop the persistent underline (for nav-style links); underline on hover only. */
  plain?: boolean
  'aria-label'?: string
}

/**
 * Warm editorial link primitive. Replaces raw `text-sky-600 underline` links
 * and browser-default link styling across public surfaces. Routes internal
 * hrefs through next/link and opens external links safely in a new tab.
 */
export function EditorialLink({
  href,
  children,
  className,
  plain = false,
  'aria-label': ariaLabel,
}: EditorialLinkProps) {
  const classes = cn(
    'rounded-sm text-hm-link underline-offset-2 transition-colors hover:text-hm-link-hover',
    'focus-visible:ring-2 focus-visible:ring-hm-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hm-canvas focus-visible:outline-none',
    plain
      ? 'no-underline hover:underline'
      : 'underline decoration-hm-link/40 hover:decoration-hm-link-hover',
    className
  )

  if (isExternalHref(href)) {
    const webProps = href.startsWith('http')
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {}
    return (
      <a href={href} className={classes} aria-label={ariaLabel} {...webProps}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}
