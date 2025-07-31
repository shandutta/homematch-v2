import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Enhanced session persistence settings for cross-browser compatibility
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        
        // Use a consistent storage key across all browsers
        storageKey: 'homematch-auth-token',
        
        // Explicit storage configuration for reliability
        storage: {
          getItem: (key: string) => {
            try {
              // Try localStorage first, fallback to sessionStorage
              return window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || null
            } catch {
              return null
            }
          },
          setItem: (key: string, value: string) => {
            try {
              // Store in both localStorage and sessionStorage for redundancy
              window.localStorage?.setItem(key, value)
              window.sessionStorage?.setItem(key, value)
            } catch {
              // Silently fail if storage is not available
            }
          },
          removeItem: (key: string) => {
            try {
              window.localStorage?.removeItem(key)
              window.sessionStorage?.removeItem(key)
            } catch {
              // Silently fail if storage is not available
            }
          },
        },
        
        // Improved flow type for better auth handling
        flowType: 'pkce',
        
        // Add debug mode for development
        debug: process.env.NODE_ENV === 'development',
      },
    }
  )
}

// Singleton client instance to prevent multiple initializations
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function getClient() {
  if (!clientInstance) {
    clientInstance = createClient()
  }
  return clientInstance
}

// Helper function to check if we're in a browser environment
export function isBrowser() {
  return typeof window !== 'undefined'
}
