import { createClient } from '@/lib/supabase/server'
import { getServerUserContext } from '@/lib/auth/server-context'
import { redirect } from 'next/navigation'
import { JoinHouseholdForm } from './JoinHouseholdForm'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Join Household | HomeMatch',
  description:
    'Join an existing HomeMatch household and start swiping together.',
})

export default async function JoinHouseholdPage() {
  const userCtx = await getServerUserContext()

  if (!userCtx) {
    redirect('/login?redirectTo=%2Fhousehold%2Fjoin')
  }

  // Brand-new Clerk user without a profile yet — surface the join form so
  // the webhook (or fallback profile creation in JoinHouseholdForm) can
  // create the row when they accept an invitation.
  if (!userCtx.profileId) {
    return (
      <div className="gradient-grid-bg dark text-foreground flex min-h-screen items-center justify-center p-4">
        <JoinHouseholdForm userId={userCtx.authId} />
      </div>
    )
  }

  // Check if user already has a household
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('household_id')
    .eq('id', userCtx.profileId)
    .single()

  if (profile?.household_id) {
    // User already has a household, redirect to couples page
    redirect('/couples')
  }

  return (
    <div className="gradient-grid-bg dark text-foreground flex min-h-screen items-center justify-center p-4">
      <JoinHouseholdForm userId={userCtx.profileId} />
    </div>
  )
}
