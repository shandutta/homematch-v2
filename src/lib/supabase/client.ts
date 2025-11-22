import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: true,
        // Force storage to use browser cookies instead of localStorage
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined') return null
            return (
              document.cookie
                .split('; ')
                .find((row) => row.startsWith(`${key}=`))
                ?.split('=')[1] || null
            )
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return
            // Set cookie with proper flags for OAuth flow
            // SameSite=Lax allows cookie to be sent on redirect from Google
            // Max age of 10 minutes is enough for OAuth flow
            document.cookie = `${key}=${value}; path=/; max-age=600; SameSite=Lax; ${
              window.location.protocol === 'https:' ? 'Secure;' : ''
            }`
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
          },
        },
      },
    }
  )
}
