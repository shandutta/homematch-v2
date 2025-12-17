import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JoinHouseholdForm } from './JoinHouseholdForm'

export default async function JoinHouseholdPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/household/join')
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
    <div className="gradient-grid-bg dark text-foreground flex min-h-screen items-center justify-center p-4">
      <JoinHouseholdForm userId={user.id} />
    </div>
  )
}
