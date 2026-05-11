import { getServerUserContext } from '@/lib/auth/server-context'
import { getOptionalServerUser } from '@/lib/supabase/optional-user'
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

  const userService = new UserService()
  const userProfile = userCtx.profileId
    ? await userService.getUserProfile(userCtx.profileId)
    : null

  // Create profile if it doesn't exist (OAuth users or first-time Clerk users
  // whose webhook hasn't fired).
  let profile = userProfile
  if (!profile) {
    const metadata = userShape.user_metadata
    const emailFromMetadata =
      metadata &&
      typeof metadata === 'object' &&
      'email' in metadata &&
      typeof metadata.email === 'string'
        ? metadata.email
        : ''
    const email = userShape.email || emailFromMetadata || userCtx.email || ''
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
  }

  return (
    <div className="gradient-grid-bg dark min-h-screen">
      <SettingsPageClient
        user={userShape}
        profile={profile!}
        initialTab={resolvedSearchParams?.tab}
      />
    </div>
  )
}
