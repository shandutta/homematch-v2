import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateHouseholdForm } from './CreateHouseholdForm'

export default async function CreateHouseholdPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/household/create')
  }

  // Check if user already has a household
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (profile?.household_id) {
    // User already has a household, redirect to couples page
    redirect('/couples')
  }

  return (
    <div className="gradient-grid-bg flex min-h-screen items-center justify-center p-4">
      <CreateHouseholdForm userId={user.id} />
    </div>
  )
}
