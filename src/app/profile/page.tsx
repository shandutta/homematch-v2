import { getServerUserContext } from '@/lib/auth/server-context'
import { getOptionalServerUser } from '@/lib/supabase/optional-user'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'
import { getUserProfileForServerAuth } from '@/lib/auth/server-profile'
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

  // Resolve a profile UUID. If the user is Clerk-authenticated but the
  // webhook hasn't created their row yet, bootstrap it just-in-time so the
  // profile page renders instead of bouncing to /error.
  let profileId = userCtx.profileId
  if (!profileId && userCtx.source === 'clerk') {
    profileId = await ensureUserProfileForCurrentClerkUser()
  }

  // Safely fetch profile and activity summary, handling potential errors.
  let userProfile = null
  let activitySummary = null

  if (profileId) {
    try {
      // PROD-RLS-001: the profile read goes through the service-role-backed
      // helper because server components can't propagate the Clerk session
      // to an anon-key client (UserService.getUserProfileWithHousehold) and
      // RLS would return 0 rows. The activity summary aggregates from a
      // table that already has Clerk-aware RLS, so it stays on UserService.
      ;[userProfile, activitySummary] = await Promise.all([
        getUserProfileForServerAuth(profileId),
        userService.getUserActivitySummary(profileId),
      ])
    } catch (error) {
      console.error('Error fetching user data:', error)
      // Continue with null values - will create profile below
    }
  }

  // Last-resort path for legacy Supabase users whose row doesn't exist.
  // (Clerk users are already covered by ensureUserProfileForCurrentClerkUser
  // above.) Without this, legacy edge cases would still hit /error.
  let profile = userProfile
  if (!profile && userCtx.source === 'supabase-legacy') {
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
      profile = await userService.createUserProfile({
        id: userShape.id,
        email,
        onboarding_completed: false,
        preferences: {},
      })
    } catch (error) {
      console.error('Error creating user profile:', error)
    }
  }

  // If we still have no profile, render an inline error rather than
  // redirecting to /error?message=Failed%20to%20load%20profile (a 404 page).
  // See QA report ISSUE-003.
  if (!profile) {
    return (
      <div className="gradient-grid-bg min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center text-white">
          <h1 className="text-2xl font-semibold">
            We&rsquo;re setting up your profile…
          </h1>
          <p className="mt-3 text-sm text-white/70">
            This usually takes a few seconds. If the page doesn&rsquo;t refresh,
            please reload or contact support at{' '}
            <a
              className="text-hm-accent underline"
              href="mailto:hello@homematch.pro"
            >
              hello@homematch.pro
            </a>
            .
          </p>
        </div>
      </div>
    )
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
