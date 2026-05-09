import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

// Lazy-loading Supabase browser client: @supabase/ssr + realtime-js are
// bundled into a separate async chunk. Routes that never call createClient()
// (landing / static pages) never download the realtime payload.

let _clientPromise: Promise<SupabaseClient<AppDatabase>> | null = null

async function _createRealClient(): Promise<SupabaseClient<AppDatabase>> {
  const [{ createBrowserClient }, { getSupabaseAuthStorageKey }, { withRefreshRecovery }] =
    await Promise.all([
      import('@supabase/ssr'),
      import('./storage-keys'),
      import('./refresh-recovery'),
    ])

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase browser configuration (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }

  const hostname =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost'
  const storageKey = getSupabaseAuthStorageKey(hostname)

  const supabase = createBrowserClient<AppDatabase>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        name: storageKey,
        path: '/',
        sameSite: 'lax',
      },
      auth: {
        detectSessionInUrl: true,
        storageKey,
        autoRefreshToken: true,
        persistSession: true,
      },
    }
  )

  withRefreshRecovery(supabase)
  return supabase
}

export function preloadSupabaseClient(): void {
  if (!_clientPromise) {
    _clientPromise = _createRealClient()
  }
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
