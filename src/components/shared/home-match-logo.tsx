import { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

type LogoSize = 'sm' | 'md' | 'lg'
type LogoVariant = 'light' | 'dark'

const iconDimensions: Record<LogoSize, number> = {
  sm: 28,
  md: 36,
  lg: 44,
}

const textSizes: Record<LogoSize, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
}

const variantTextClasses: Record<LogoVariant, string> = {
  light: 'text-white',
  dark: 'text-slate-900',
}

interface HomeMatchLogoProps extends ComponentPropsWithoutRef<'span'> {
  withText?: boolean
  size?: LogoSize
  variant?: LogoVariant
  textClassName?: string
  iconClassName?: string
  label?: string
}

/**
 * Shared HomeMatch wordmark for use across marketing + in-product surfaces.
 * The SVG is inlined for fast rendering and avoids an extra image request.
 */
export function HomeMatchLogo({
  className,
  withText = true,
  size = 'md',
  variant = 'light',
  textClassName,
  iconClassName,
  label = 'HomeMatch',
  ...rest
}: HomeMatchLogoProps) {
  const dimension = iconDimensions[size]
  const wrapperLabel = !withText ? label : undefined

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-semibold tracking-tight',
        withText ? 'leading-tight' : 'leading-none',
        className
      )}
      aria-label={wrapperLabel}
      role={wrapperLabel ? 'img' : undefined}
      {...rest}
    >
      <svg
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={withText ? true : undefined}
        className={cn('flex-shrink-0 drop-shadow-lg', iconClassName)}
        style={{ width: dimension, height: dimension }}
      >
        <defs>
          <linearGradient
            id="hm-logo-surface"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient
            id="hm-logo-heart"
            x1="20%"
            y1="15%"
            x2="80%"
            y2="90%"
          >
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="45%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#FBCFE8" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#hm-logo-surface)" />
        <path
          d="M24 13.1c-4.08-4.24-11.5-1.92-11.5 4.46 0 6.76 7.4 12.53 11.5 15.82 4.1-3.29 11.5-9.06 11.5-15.82 0-6.38-7.42-8.7-11.5-4.46z"
          fill="url(#hm-logo-heart)"
        />
        <path
          d="M17.75 26.25 24 20.6l6.25 5.65"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <rect
          x="19.5"
          y="25.5"
          width="9"
          height="8.75"
          rx="1.6"
          fill="rgba(15,23,42,0.55)"
        />
        <rect x="22.5" y="28.75" width="3" height="5" rx="0.8" fill="white" />
      </svg>
      {withText ? (
        <span
          className={cn(
            variantTextClasses[variant],
            textSizes[size],
            'font-semibold tracking-tight',
            textClassName
          )}
        >
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  )
}
