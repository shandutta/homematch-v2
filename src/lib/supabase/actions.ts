'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createClient } from './server'

/**
 * Server-side sign-out. Phase C coexistence:
 * - If a Clerk session is active, redirect to Clerk's sign-out URL.
 *   Clerk's client-side <SignOutButton> / useClerk().signOut() is the
 *   preferred path; this server action exists for forms.
 * - Otherwise, fall through to Supabase sign-out (legacy users).
 */
export async function signOut() {
  // Check Clerk first.
  try {
    const { userId } = await auth()
    if (userId) {
      // Clerk's server-side session can't be ended here (it's managed via
      // cookies set by the client SDK). Redirect to Clerk's sign-out path
      // which clears the session cookie via Clerk's middleware.
      redirect('/sign-out')
    }
  } catch {
    // Fall through.
  }

  // Legacy Supabase sign-out path.
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
