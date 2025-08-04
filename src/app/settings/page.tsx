import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsPageClient } from '@/components/settings/SettingsPageClient'
import { UserService } from '@/lib/services/users'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userService = new UserService()
  const userProfile = await userService.getUserProfile(user.id)

  // Create profile if it doesn't exist (OAuth users)
  let profile = userProfile
  if (!profile) {
    profile = await userService.createUserProfile({
      id: user.id,
      onboarding_completed: false,
      preferences: {},
    })
  }

  return (
    <div className="gradient-grid-bg min-h-screen">
      <SettingsPageClient user={user} profile={profile!} />
    </div>
  )
}