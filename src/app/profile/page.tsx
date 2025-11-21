import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfilePageClient } from '@/components/profile/ProfilePageClient'
import { UserService } from '@/lib/services/users'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userService = new UserService()
  const [userProfile, activitySummary] = await Promise.all([
    userService.getUserProfileWithHousehold(user.id),
    userService.getUserActivitySummary(user.id),
  ])

  // Create profile if it doesn't exist (OAuth users)
  let profile = userProfile
  if (!profile) {
    const email =
      user.email || (user.user_metadata as Record<string, string>)?.email || ''
    profile = await userService.createUserProfile({
      id: user.id,
      email,
      onboarding_completed: false,
      preferences: {},
    })
  }

  return (
    <div className="gradient-grid-bg min-h-screen">
      <ProfilePageClient
        user={user}
        profile={profile!}
        activitySummary={activitySummary}
      />
    </div>
  )
}
