import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use PKCE flow (default) for better security and SSR support
        detectSessionInUrl: true,
      },
      cookieOptions: {
        // Ensure cookies persist across OAuth redirects
        // CRITICAL: Without these settings, the PKCE code_verifier cookie
        // gets cleared during the Google OAuth redirect, causing auth to fail
        name: 'sb-auth-token',
        // Set maxAge to 10 minutes (enough time to complete OAuth flow)
        maxAge: 60 * 10,
        // SameSite=Lax allows cookies to be sent on redirect from Google
        sameSite: 'lax',
        // Ensure cookies work in production
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )
}
