import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        detectSessionInUrl: true,
        // Use implicit flow instead of PKCE to avoid cookie persistence issues
        // While PKCE is more secure, the code_verifier cookie keeps getting
        // deleted during OAuth redirects in production, causing auth failures
        flowType: 'implicit',
      },
    }
  )
}
