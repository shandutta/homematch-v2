import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        primary:
          'bg-token-primary text-white shadow-sm hover:bg-token-primary-dark focus-visible:ring-token-primary-light/60 dark:focus-visible:ring-token-primary/50',
        destructive:
          'bg-token-error text-white shadow-sm hover:bg-token-error-dark focus-visible:ring-token-error-light/20 dark:focus-visible:ring-token-error-light/40',
        outline:
          'border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        prime:
          // Dopamine CTA variant (clean border ring, warm espresso fill).
          // Padding + text sizing are intentionally NOT hardcoded here; they live in
          // compoundVariants below so that `<Button variant="prime" size="lg" />` and
          // `<Button variant="prime" size="default" />` get consistent, predictable heights.
          // Hardcoded `px-9 py-7` in the base variant collided with size variants and
          // caller-provided `className` overrides — a single `cn(px-4)` could only catch
          // px-* and would leave the variant's `py-7` intact, producing inconsistent
          // heights on the same `size="lg"` prop across Hero and CtaBand. See H7.
          'relative overflow-hidden rounded-full text-white font-semibold ' +
          // base fill + depth (warm espresso)
          'before:content-[""] before:absolute before:inset-0 before:rounded-full before:[background:linear-gradient(180deg,#3a2a1c_0%,#2b1e12_100%)] before:[box-shadow:0_2px_8px_rgba(43,30,18,0.4)] ' +
          // gradient border ring (masked) — warm burnished-amber sweep
          'after:content-[""] after:absolute after:-inset-[2px] after:rounded-full after:[padding:2px] ' +
          'after:[background:linear-gradient(135deg,rgba(210,154,53,0.85),rgba(146,95,22,0.7),rgba(183,121,31,0.75))] ' +
          'after:[background-size:200%_200%] after:opacity-85 ' +
          'after:[-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] ' +
          'after:[-webkit-mask-composite:xor] after:[mask-composite:exclude] ' +
          // interaction: hover pulse halo + scale
          'hover:scale-[1.02] active:scale-[0.99] active:translate-y-[1px] ' +
          // subtle focus ring
          'focus-visible:ring-2 focus-visible:ring-hm-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2b1e12]',
      },
      size: {
        default: 'min-h-[44px] h-11 p-4 has-[>svg]:px-3',
        sm: 'min-h-[44px] h-11 rounded-md gap-1 p-2 has-[>svg]:px-2.5',
        lg: 'min-h-[48px] h-12 rounded-md p-6 has-[>svg]:p-4',
        icon: 'min-h-[44px] min-w-[44px] h-11 w-11',
        xl: 'min-h-[48px] h-12 rounded-full p-8 text-lg',
      },
    },
    compoundVariants: [
      // Prime variant uses a fully-rounded pill shape and bumped text size at every
      // size. Padding is set per-size so callers can rely on `size` alone to control
      // the button's height — and caller-provided `className="px-X py-Y"` cleanly
      // overrides both axes via Tailwind's class merging. See H7.
      {
        variant: 'prime',
        size: 'default',
        className: 'px-6 py-3 text-base',
      },
      {
        variant: 'prime',
        size: 'sm',
        className: 'px-4 py-2 text-sm',
      },
      {
        variant: 'prime',
        size: 'lg',
        className: 'px-8 py-4 text-base',
      },
      {
        variant: 'prime',
        size: 'xl',
        className: 'px-10 py-5 text-lg',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
