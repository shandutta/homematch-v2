'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'

export async function acceptInviteAction(token: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirectTo=/invite/${token}`)
  }

  const serviceClient = await getServiceRoleClient()
  const { data: invite, error } = await serviceClient
    .from('household_invitations')
    .select('*')
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
    .eq('id', user!.id)
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
    .eq('id', user!.id)

  await serviceClient
    .from('household_invitations')
    .update({
      status: 'accepted',
      accepted_by: user!.id,
      accepted_at: now.toISOString(),
    })
    .eq('id', invite.id)

  revalidatePath('/profile')

  return { success: true }
}
