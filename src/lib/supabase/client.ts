import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase browser configuration (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_TEST_MODE === 'true'

  const storageKey = isTestEnv
    ? `supabase-browser-${process.env.VITEST_POOL_ID || '1'}-${supabaseAnonKey.slice(0, 6)}`
    : undefined

  // Dynamic cookie configuration for dev/prod
  const cookieName =
    typeof window !== 'undefined' && window.location?.hostname
      ? `sb-${window.location.hostname.replace(/\./g, '-')}-auth-token`
      : 'sb-localhost-auth-token'

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: cookieName,
      path: '/',
      sameSite: 'lax',
    },
    auth: {
      detectSessionInUrl: true,
      storageKey,
      autoRefreshToken: true,
      persistSession: true,
    },
  })
}
