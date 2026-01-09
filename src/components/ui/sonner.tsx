'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import type { CSSProperties } from 'react'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  type ToasterTheme = NonNullable<ToasterProps['theme']>
  const isToasterTheme = (value: string): value is ToasterTheme =>
    value === 'light' || value === 'dark' || value === 'system'
  const resolvedTheme = isToasterTheme(theme) ? theme : 'system'
  const toasterStyle: CSSProperties & Record<string, string> = {
    '--normal-bg': 'var(--popover)',
    '--normal-text': 'var(--popover-foreground)',
    '--normal-border': 'var(--border)',
  }

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      style={toasterStyle}
      {...props}
    />
  )
}

export { Toaster }
