import { createClient } from '@/lib/supabase/server'
import { getServerUserContext } from '@/lib/auth/server-context'
import { redirect } from 'next/navigation'
import { CreateHouseholdForm } from './CreateHouseholdForm'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Create Household | HomeMatch',
  description:
    'Start a HomeMatch household and invite people to search with you.',
})

export default async function CreateHouseholdPage() {
  const userCtx = await getServerUserContext()

  if (!userCtx) {
    redirect('/login?redirectTo=%2Fhousehold%2Fcreate')
  }

  // Brand-new Clerk user without a profile yet — let them proceed to the
  // form, where profile creation will happen on first household creation.
  if (!userCtx.profileId) {
    return (
      <div className="gradient-grid-bg text-foreground flex min-h-screen items-center justify-center p-4">
        <CreateHouseholdForm />
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
    <div className="gradient-grid-bg text-foreground flex min-h-screen items-center justify-center p-4">
      <CreateHouseholdForm />
    </div>
  )
}
