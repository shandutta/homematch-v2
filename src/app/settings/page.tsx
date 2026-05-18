import { getServerUserContext } from '@/lib/auth/server-context'
import { getOptionalServerUser } from '@/lib/supabase/optional-user'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'
import { getUserProfileForServerAuth } from '@/lib/auth/server-profile'
import { redirect } from 'next/navigation'
import { SettingsPageClient } from '@/components/settings/SettingsPageClient'
import { UserService } from '@/lib/services/users'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'

export const metadata = createNoindexRouteMetadata({
  title: 'Settings | HomeMatch',
  description: 'Update your HomeMatch profile, preferences, and notifications.',
})

interface SettingsPageProps {
  searchParams?: Promise<{ tab?: string }>
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const resolvedSearchParams = await searchParams
  const userCtx = await getServerUserContext()

  if (!userCtx) {
    const redirectTo = resolvedSearchParams?.tab
      ? `/settings?tab=${encodeURIComponent(resolvedSearchParams.tab)}`
      : '/settings'
    const params = new URLSearchParams()
    params.set('redirectTo', redirectTo)
    redirect(`/login?${params.toString()}`)
  }

  const userShape = await getOptionalServerUser()
  if (!userShape) {
    const params = new URLSearchParams()
    params.set('redirectTo', '/settings')
    redirect(`/login?${params.toString()}`)
  }

  // SETTINGS-001 fix: resolve the profile UUID (bootstrapping if the Clerk
  // webhook hasn't fired yet), then read user_profiles via the
  // service-role-backed helper. The previous anon-client path was
  // RLS-blocked for every Clerk user, returned null, and crashed
  // SettingsPageClient on its first `profile.preferences` access.
  let profileId = userCtx.profileId
  if (!profileId && userCtx.source === 'clerk') {
    profileId = await ensureUserProfileForCurrentClerkUser()
  }

  let profile = profileId ? await getUserProfileForServerAuth(profileId) : null

  // Last-resort path for legacy Supabase users without a profile row.
  // Clerk users are already covered by ensureUserProfileForCurrentClerkUser.
  if (!profile && userCtx.source === 'supabase-legacy') {
    const userService = new UserService()
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
  }

  // Inline fallback — mirrors /profile rather than crashing the client
  // component on a null `profile.preferences` access.
  if (!profile) {
    return (
      <div className="gradient-grid-bg min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center text-white">
          <h1 className="text-2xl font-semibold">
            Settings are loading&hellip;
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Your account is still being set up. Refresh in a few seconds, or
            contact{' '}
            <a
              className="text-hm-accent underline"
              href="mailto:hello@homematch.pro"
            >
              hello@homematch.pro
            </a>{' '}
            if this stays.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="gradient-grid-bg min-h-screen">
      <SettingsPageClient
        user={userShape}
        profile={profile}
        initialTab={resolvedSearchParams?.tab}
      />
    </div>
  )
}
