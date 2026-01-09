import type { vi as vitest } from 'vitest'
import type { LatLng } from '@/lib/utils/coordinates'

declare global {
  var vi: typeof vitest | undefined

  interface Window {
    __supabaseReady?: boolean
    supabase?: {
      auth?: {
        getSession?: () => Promise<{ data: { session: unknown } }>
      }
    }
    __homematchMapTestHooks?: {
      selectCity?: (key: string) => void
      drawSelection?: (ring: LatLng[]) => void
    }
    React?: unknown
  }

  var mockUserAgent: string | undefined
}

export {}
