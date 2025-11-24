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

  // Safely fetch profile and activity summary, handling potential errors
  let userProfile = null
  let activitySummary = null

  try {
    ;[userProfile, activitySummary] = await Promise.all([
      userService.getUserProfileWithHousehold(user.id),
      userService.getUserActivitySummary(user.id),
    ])
  } catch (error) {
    console.error('Error fetching user data:', error)
    // Continue with null values - will create profile below
  }

  // Create profile if it doesn't exist (OAuth users or first-time users)
  let profile = userProfile
  if (!profile) {
    try {
      const email =
        user.email ||
        (user.user_metadata as Record<string, string>)?.email ||
        ''
      profile = await userService.createUserProfile({
        id: user.id,
        email,
        onboarding_completed: false,
        preferences: {},
      })
    } catch (error) {
      console.error('Error creating user profile:', error)
      // Redirect to error page if we can't create profile
      redirect('/error?message=Failed to load profile')
    }
  }

  // Ensure we have a valid profile before rendering
  if (!profile) {
    redirect('/error?message=Failed to load profile')
  }

  return (
    <div className="gradient-grid-bg min-h-screen">
      <ProfilePageClient
        user={user}
        profile={profile}
        activitySummary={
          activitySummary || {
            likes: 0,
            dislikes: 0,
            views: 0,
            saved_searches: 0,
            total_interactions: 0,
          }
        }
      />
    </div>
  )
}
