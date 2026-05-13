import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

// Lazy-loading Supabase browser client: @supabase/ssr + realtime-js are
// bundled into a separate async chunk. Routes that never call createClient()
// (landing / static pages) never download the realtime payload.

let _clientPromise: Promise<SupabaseClient<AppDatabase>> | null = null

async function _createRealClient(): Promise<SupabaseClient<AppDatabase>> {
  // Phase 1 (dual-auth elimination, 2026-05-13): dropped the
  // withRefreshRecovery overlay and the dynamic cookie-name machinery.
  // Clerk is the sole identity provider; Supabase has no session to
  // refresh and no per-host auth cookies to keep distinct. This client
  // remains for direct DB queries via the anon key.
  const { createBrowserClient } = await import('@supabase/ssr')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase browser configuration (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  return createBrowserClient<AppDatabase>(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: false,
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function createClient(): Promise<SupabaseClient<AppDatabase>> {
  if (!_clientPromise) {
    _clientPromise = _createRealClient()
  }
  return _clientPromise
}

declare global {
  interface Window {
    createSupabaseClient?: () => Promise<SupabaseClient<AppDatabase>>
  }
}

if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_TEST_MODE === 'true'
) {
  window.createSupabaseClient = createClient
}
