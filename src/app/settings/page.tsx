import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsPageClient } from '@/components/settings/SettingsPageClient'
import { UserService } from '@/lib/services/users'

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
    redirect('/login')
  }

  const userService = new UserService()
  const userProfile = await userService.getUserProfile(user.id)

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
    <div className="gradient-grid-bg dark min-h-screen">
      <SettingsPageClient
        user={user}
        profile={profile!}
        initialTab={resolvedSearchParams?.tab}
      />
    </div>
  )
}
