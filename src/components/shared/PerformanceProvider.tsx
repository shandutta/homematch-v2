'use client'

import { ReactNode, useEffect } from 'react'

export function PerformanceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
    return () => {
      delete document.documentElement.dataset.hydrated
    }
  }, [])

  return <>{children}</>
}
