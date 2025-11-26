import { EnhancedDashboardPageImpl } from '@/components/dashboard/EnhancedDashboardPageImpl'
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary'
import { loadDashboardData, type DashboardPreferences } from '@/lib/data/loader'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserService } from '@/lib/services/users'

interface DashboardPageProps {
  searchParams: {
    [key: string]: string | string[] | undefined
  }
}

export default async function DashboardPage({
  searchParams: _searchParams,
}: DashboardPageProps) {
  const supabase = await createClient()
  console.log('[Dashboard] Getting user from Supabase...')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log('[Dashboard] Auth result:', {
    userId: user?.id,
    error: authError?.message,
  })

  if (!user) {
    console.log('[Dashboard] No user found, redirecting to login')
    redirect('/login')
  }

  console.log('[Dashboard] User found:', user.id)

  try {
    const userService = new UserService()
    console.log('[Dashboard] Calling getUser...')
    const userProfile = await userService.getUserProfile(user.id)
    const dashboardData = await loadDashboardData({
      userPreferences: userProfile?.preferences as DashboardPreferences | null,
    })

    // TODO: Re-enable onboarding flow once onboarding page is implemented
    // if (!finalUserData?.onboarding_completed) {
    //   redirect('/onboarding');
    // }

    // const returning = (await searchParams)?.returning === 'true';

    // const swipes = interactions.map((interaction) => ({
    //   ...interaction,
    //   vote: interaction.interaction_type === 'like',
    // }));

    // const swipeStats = {
    //   totalViewed: swipes.length,
    //   totalLiked: swipes.filter((s) => s.vote).length,
    //   totalPassed: swipes.filter((s) => !s.vote).length,
    // };

    return (
      <DashboardErrorBoundary>
        <EnhancedDashboardPageImpl
          initialData={dashboardData}
          userId={user.id}
          // The following props are passed for future use but are currently unused in the client component
          // returning={returning}
          // userProfile={finalUserData}
          // initialSwipeStats={swipeStats}
          // session={{ user } as Session}
        />
      </DashboardErrorBoundary>
    )
  } catch (error) {
    console.error('[Dashboard] Error caught:', error)
    // Check if it's a redirect error (NEXT_REDIRECT)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }

    // Check if it's a database connection error
    const errorMessage = error instanceof Error ? error.message : String(error)
    const isDatabaseError =
      errorMessage.toLowerCase().includes('database') ||
      errorMessage.toLowerCase().includes('connection') ||
      errorMessage.toLowerCase().includes('econnrefused') ||
      errorMessage.toLowerCase().includes('timeout')

    if (isDatabaseError) {
      // Throw a specific error that the error boundary can catch and handle
      throw new Error('DATABASE_CONNECTION_ERROR: ' + errorMessage)
    }

    // For non-database errors, redirect to login as before
    redirect('/login')
  }
}
