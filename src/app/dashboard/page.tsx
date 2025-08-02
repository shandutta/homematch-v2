import { EnhancedDashboardPageImpl } from '@/components/dashboard/EnhancedDashboardPageImpl';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import { loadDashboardData } from '@/lib/data/loader';
import { UserService } from '@/lib/services/users';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Session } from '@supabase/supabase-js';

interface DashboardPageProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userService = new UserService();
  
  try {
    const [userData, interactions, dashboardData] = await Promise.all([
      userService.getUserProfile(user.id),
      userService.getUserInteractions(user.id, 1000),
      loadDashboardData(),
    ]);

    // If user profile doesn't exist, create it (fallback for OAuth users)
    let finalUserData = userData;
    if (!userData) {
      console.log('Creating user profile for OAuth user:', user.id);
      finalUserData = await userService.createUserProfile({
        id: user.id,
        onboarding_completed: false,
        preferences: {},
      });
    }

    // TODO: Re-enable onboarding flow once onboarding page is implemented
    // if (!finalUserData?.onboarding_completed) {
    //   redirect('/onboarding');
    // }

    const returning = (await searchParams)?.returning === 'true';

    const swipes = interactions.map((interaction) => ({
      ...interaction,
      vote: interaction.interaction_type === 'like',
    }));

    const swipeStats = {
      totalViewed: swipes.length,
      totalLiked: swipes.filter((s) => s.vote).length,
      totalPassed: swipes.filter((s) => !s.vote).length,
    };

  return (
    <DashboardErrorBoundary>
      <EnhancedDashboardPageImpl
        initialData={dashboardData}
        returning={returning}
        userProfile={finalUserData}
        initialSwipeStats={swipeStats}
        session={{ user } as Session}
      />
    </DashboardErrorBoundary>
  );
  } catch (error) {
    console.error('Dashboard error:', error);
    redirect('/login');
  }
}
