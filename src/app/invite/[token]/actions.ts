'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerUserContext } from '@/lib/auth/server-context'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'

// @service-role-capability: authenticated invite acceptance; delegates the
// transactional accept to the accept_household_invite RPC so both row updates
// (user_profiles.household_id + household_invitations.status) commit together.
// Email-match enforcement is a product decision tracked in the 2026-05-13
// audit (Q3); when added, it gates the RPC call upstream.
export async function acceptInviteAction(token: string) {
  const userCtx = await getServerUserContext()

  if (!userCtx) {
    redirect(`/login?redirectTo=/invite/${token}`)
  }

  // HOUSEHOLD-001: for brand-new Clerk users whose webhook hasn't fired yet,
  // bootstrap the profile row just-in-time rather than failing. Previously
  // this returned an "Your profile is still being set up" error and left the
  // user stuck on the invite landing page.
  let profileId = userCtx.profileId
  if (!profileId && userCtx.source === 'clerk') {
    profileId = await ensureUserProfileForCurrentClerkUser()
  }
  if (!profileId) {
    return {
      success: false,
      error:
        'Your profile is still being set up. Please refresh in a moment and try again.',
    }
  }

  const serviceClient = await getServiceRoleClient()

  type AcceptInviteRow = {
    success: boolean
    error: string | null
    household_id: string | null
  }

  // The RPC is declared in 20260513020100; until types/database.ts is
  // regenerated (`supabase gen types`), bypass the generated Functions
  // union with a narrow cast that preserves the response shape.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const rpc = serviceClient.rpc as unknown as (
    fn: 'accept_household_invite',
    args: { p_token: string; p_profile_id: string }
  ) => Promise<{
    data: AcceptInviteRow[] | null
    error: { message: string } | null
  }>

  const { data, error } = await rpc('accept_household_invite', {
    p_token: token,
    p_profile_id: profileId,
  })

  if (error) {
    console.error('[acceptInviteAction] RPC error:', error)
    return { success: false, error: 'Failed to accept invitation.' }
  }

  // Postgres functions returning TABLE come back as an array of rows.
  const row = Array.isArray(data) ? data[0] : null
  if (!row) {
    return { success: false, error: 'Failed to accept invitation.' }
  }

  if (!row.success) {
    return {
      success: false,
      error: row.error ?? 'Failed to accept invitation.',
    }
  }

  revalidatePath('/profile')

  return { success: true }
}
