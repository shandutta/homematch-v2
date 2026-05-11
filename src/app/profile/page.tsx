import { getServerUserContext } from '@/lib/auth/server-context'
import { getOptionalServerUser } from '@/lib/supabase/optional-user'
import { redirect } from 'next/navigation'
import { ProfilePageClient } from '@/components/profile/ProfilePageClient'
import { UserService } from '@/lib/services/users'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Profile | HomeMatch',
  description:
    'Manage your HomeMatch account profile, household membership, and activity.',
})

export default async function ProfilePage() {
  const userCtx = await getServerUserContext()

  if (!userCtx) {
    redirect('/login?redirectTo=%2Fprofile')
  }

  // For new Clerk users without a profile row, we still need to render the
  // profile page so they can complete onboarding. We'll fetch a "user" shape
  // from the unified optional-user helper for the client component.
  const userShape = await getOptionalServerUser()
  if (!userShape) {
    redirect('/login?redirectTo=%2Fprofile')
  }

  const userService = new UserService()

  // Safely fetch profile and activity summary, handling potential errors.
  // Use profileId (UUID) for the DB lookups; userShape.id is the auth id
  // (Clerk userId or legacy Supabase UUID).
  let userProfile = null
  let activitySummary = null

  if (userCtx.profileId) {
    try {
      ;[userProfile, activitySummary] = await Promise.all([
        userService.getUserProfileWithHousehold(userCtx.profileId),
        userService.getUserActivitySummary(userCtx.profileId),
      ])
    } catch (error) {
      console.error('Error fetching user data:', error)
      // Continue with null values - will create profile below
    }
  }

  // Create profile if it doesn't exist (OAuth users or first-time Clerk users).
  // NOTE: For Clerk users, the webhook at /api/webhooks/clerk should normally
  // create the profile. This is the fallback path.
  let profile = userProfile
  if (!profile) {
    try {
      const metadata = userShape.user_metadata
      const emailFromMetadata =
        metadata &&
        typeof metadata === 'object' &&
        'email' in metadata &&
        typeof metadata.email === 'string'
          ? metadata.email
          : ''
      const email = userShape.email || emailFromMetadata || userCtx.email || ''
      // For Clerk users, generate a UUID for user_profiles.id (legacy schema
      // constraint). For Supabase legacy users, userShape.id IS the UUID.
      const profileInsertId =
        userCtx.source === 'supabase-legacy' ? userShape.id : crypto.randomUUID()
      profile = await userService.createUserProfile({
        id: profileInsertId,
        email,
        onboarding_completed: false,
        preferences: {},
        ...(userCtx.source === 'clerk'
          ? { clerk_user_id: userCtx.authId }
          : {}),
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
        user={userShape}
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
