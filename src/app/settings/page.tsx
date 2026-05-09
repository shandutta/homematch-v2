import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const redirectTo = resolvedSearchParams?.tab
      ? `/settings?tab=${encodeURIComponent(resolvedSearchParams.tab)}`
      : '/settings'
    const params = new URLSearchParams()
    params.set('redirectTo', redirectTo)
    redirect(`/login?${params.toString()}`)
  }

  const userService = new UserService()
  const userProfile = await userService.getUserProfile(user.id)

  // Create profile if it doesn't exist (OAuth users)
  let profile = userProfile
  if (!profile) {
    const metadata = user.user_metadata
    const emailFromMetadata =
      metadata &&
      typeof metadata === 'object' &&
      'email' in metadata &&
      typeof metadata.email === 'string'
        ? metadata.email
        : ''
    const email = user.email || emailFromMetadata || ''
    profile = await userService.createUserProfile({
      id: user.id,
      email,
      onboarding_completed: false,
      preferences: {},
    })
  }

  return (
    <div className="gradient-grid-bg dark min-h-screen">
      <SettingsPageClient
        user={user}
        profile={profile!}
        initialTab={resolvedSearchParams?.tab}
      />
    </div>
  )
}
