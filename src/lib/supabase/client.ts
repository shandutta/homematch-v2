import { createBrowserClient } from '@supabase/ssr'
import type { AppDatabase } from '@/types/app-database'
import { getSupabaseAuthStorageKey } from './storage-keys'
import { withRefreshRecovery } from './refresh-recovery'

export function createClient() {
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
  // Keep cookie/storage key aligned with middleware expectations and Supabase project fingerprint
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

declare global {
  interface Window {
    createSupabaseClient?: typeof createClient
  }
}

if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_TEST_MODE === 'true'
) {
  window.createSupabaseClient = createClient
}
