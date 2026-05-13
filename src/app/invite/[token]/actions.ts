'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerUserContext } from '@/lib/auth/server-context'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'

// @service-role-capability: authenticated invite acceptance; validates token
// status/expiry and requester identity before household/profile mutations.
// TODO(D1 follow-up): replace with atomic accept_household_invite RPC.
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
  const { data: invite, error } = await serviceClient
    .from('household_invitations')
    .select(
      'accepted_at, accepted_by, created_at, created_by, expires_at, household_id, id, invited_email, invited_name, message, status, token, updated_at'
    )
    .eq('token', token)
    .single()

  if (error || !invite) {
    return { success: false, error: 'Invitation not found.' }
  }

  if (invite.status !== 'pending') {
    return { success: false, error: 'This invitation has already been used.' }
  }

  const now = new Date()
  if (new Date(invite.expires_at) < now) {
    await serviceClient
      .from('household_invitations')
      .update({ status: 'expired' })
      .eq('id', invite.id)
    return { success: false, error: 'This invitation has expired.' }
  }

  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('household_id')
    .eq('id', profileId)
    .single()

  if (profile?.household_id && profile.household_id !== invite.household_id) {
    return {
      success: false,
      error: 'Leave your current household before accepting a new invitation.',
    }
  }

  await serviceClient
    .from('user_profiles')
    .update({ household_id: invite.household_id })
    .eq('id', profileId)

  await serviceClient
    .from('household_invitations')
    .update({
      status: 'accepted',
      accepted_by: profileId,
      accepted_at: now.toISOString(),
    })
    .eq('id', invite.id)

  revalidatePath('/profile')

  return { success: true }
}
