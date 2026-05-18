import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const authLinkClassName =
  'font-medium text-hm-link hover:text-hm-link-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hm-focus/40 focus-visible:ring-offset-2 focus-visible:ring-offset-hm-canvas'

export function AuthLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={cn(authLinkClassName, className)} />
}

interface AuthPageShellProps {
  title: string
  subtitle: string
  children: ReactNode
  maxWidthClassName?: string
  valueProp?: string
}

export function AuthPageShell({
  title,
  subtitle,
  children,
  maxWidthClassName = 'max-w-lg',
  valueProp,
}: AuthPageShellProps) {
  return (
    <div className="gradient-grid-bg text-hm-ink relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* A3: overflow-hidden contains the decorative blurs below — at w-[680px]
          centered with -translate-x-1/2, they extend ~150px past the 375px
          mobile viewport on each side, causing horizontal scrollbars
          otherwise. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-hm-accent/10 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 h-[380px] w-[520px] -translate-x-1/2 rounded-full bg-hm-accent/[0.07] blur-3xl" />
      </div>

      <div className={cn('relative w-full space-y-8', maxWidthClassName)}>
        <div className="space-y-3 text-center">
          <h1 className="text-hm-ink text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-hm-muted text-sm sm:text-base">{subtitle}</p>
        </div>

        {valueProp && (
          <div className="border-hm-border bg-hm-accent/5 text-hm-accent-strong mx-auto w-fit rounded-full border px-4 py-1.5 text-center text-xs">
            {valueProp}
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
