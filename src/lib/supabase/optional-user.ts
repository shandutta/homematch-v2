import type { User } from '@supabase/supabase-js'
import { createClient } from './server'

const isMissingSupabaseConfigError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes('project') &&
  error.message.includes('URL') &&
  error.message.includes('Key')

export async function getOptionalServerUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user
  } catch (error) {
    if (isMissingSupabaseConfigError(error)) {
      console.warn(
        '[Supabase][Server] Missing public config; treating request as unauthenticated'
      )
      return null
    }

    throw error
  }
}
