import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        primary:
          'bg-sky-600 text-white shadow-sm hover:bg-sky-700 focus-visible:ring-sky-400/60 dark:focus-visible:ring-sky-500/50',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        prime:
          // Dopamine CTA variant (clean border ring, dark fill) — toned to brand blue, no rainbow
          'relative overflow-hidden rounded-full text-white px-9 py-7 text-base font-semibold ' +
          // base fill + depth (slightly bluer)
          'before:content-[""] before:absolute before:inset-0 before:rounded-full before:[background:linear-gradient(180deg,#0c1426_0%,#0a0f1d_100%)] before:[box-shadow:0_2px_8px_rgba(0,0,0,0.35)] ' +
          // gradient border ring (masked) — brand blue sweep
          'after:content-[""] after:absolute after:-inset-[2px] after:rounded-full after:[padding:2px] ' +
          'after:[background:linear-gradient(135deg,rgba(59,130,246,0.8),rgba(30,64,175,0.7),rgba(56,189,248,0.7))] ' +
          'after:[background-size:200%_200%] after:opacity-85 ' +
          'after:[-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] ' +
          'after:[-webkit-mask-composite:xor] after:[mask-composite:exclude] ' +
          // interaction: hover pulse halo + scale
          'hover:scale-[1.02] active:scale-[0.99] active:translate-y-[1px] ' +
          // subtle focus ring
          'focus-visible:ring-2 focus-visible:ring-sky-300/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1d]',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        xl: 'h-12 rounded-full px-7 text-[15px]',
      },
    },
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
