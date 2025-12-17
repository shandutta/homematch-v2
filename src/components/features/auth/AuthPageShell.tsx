import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const authLinkClassName =
  'font-medium text-amber-400 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function AuthLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={cn(authLinkClassName, className)} />
}

interface AuthPageShellProps {
  title: string
  subtitle: string
  children: ReactNode
  maxWidthClassName?: string
}

export function AuthPageShell({
  title,
  subtitle,
  children,
  maxWidthClassName = 'max-w-lg',
}: AuthPageShellProps) {
  return (
    <div className="gradient-grid-bg dark text-foreground relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 h-[380px] w-[520px] -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className={cn('relative w-full space-y-8', maxWidthClassName)}>
        <div className="space-y-3 text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          </Link>
          <p className="text-muted-foreground text-sm sm:text-base">
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
