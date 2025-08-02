'use client';

import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useRouter as useNextRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { SwipeContainer } from '@/components/property/SwipeContainer';
// import { useSettingsStore } from '@/lib/stores/settingsStore';
// import { useSwipeStore } from '@/lib/stores/swipeStore';
import { DashboardData } from '@/lib/data/loader';

interface SwipeStats {
  totalViewed: number;
  totalLiked: number;
  totalPassed: number;
}

import { UserProfile } from '@/types/database';

interface DashboardPageImplProps {
  initialData: DashboardData;
  returning: boolean;
  userProfile: UserProfile | null;
  initialSwipeStats: SwipeStats;
  session: Session | null;
  router?: ReturnType<typeof useNextRouter>;
}

export function DashboardPageImpl({
  initialData,
  returning,
  userProfile,
  initialSwipeStats,
  session,
  router: injectedRouter,
}: DashboardPageImplProps) {
  const nextRouter = useNextRouter();
  const router = injectedRouter ?? nextRouter;
  const [swipeStats, setSwipeStats] = useState<SwipeStats>(initialSwipeStats);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    if (returning) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('returning');
      window.history.replaceState({}, '', newUrl.toString());
      setHasShownWelcome(true);
    } else if (userProfile && !hasShownWelcome) {
      const userCreatedAt = new Date(userProfile.created_at!);
      const now = new Date();
      const timeDifference = now.getTime() - userCreatedAt.getTime();
      const daysDifference = timeDifference / (1000 * 3600 * 24);
      const isNewUser = daysDifference < 0.003; // approximately 5 minutes

      if (isNewUser) {
        toast.success(
          `Welcome to HomeMatch, ${session?.user?.email}! 🎉`
        );
        setHasShownWelcome(true);
      }
    }
  }, [returning, userProfile, session, hasShownWelcome]);

  const handleLikedClick = () => {
    if (swipeStats.totalLiked > 0) {
      router.push('/dashboard/liked');
    }
  };

  const handlePassedClick = () => {
    if (swipeStats.totalPassed > 0) {
      router.push('/dashboard/disliked');
    }
  };

  const handleViewedClick = () => {
    if (swipeStats.totalViewed > 0) {
      router.push('/dashboard/viewed');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your property browsing overview</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card
          className={`bg-card border-2 transition-all duration-300 hover:shadow-lg ${
            swipeStats.totalViewed > 0
              ? 'cursor-pointer border-primary/20 hover:border-primary/40 hover:scale-105'
              : 'cursor-default border-border'
          }`}
          onClick={handleViewedClick}
          role="region"
          aria-label="Properties Viewed"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Properties Viewed
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">👁️</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{swipeStats.totalViewed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total properties you&apos;ve seen
            </p>
          </CardContent>
        </Card>

        <Card
          className={`bg-card border-2 transition-all duration-300 hover:shadow-lg ${
            swipeStats.totalLiked > 0
              ? 'cursor-pointer border-green-500/20 hover:border-green-500/40 hover:scale-105'
              : 'cursor-default border-border'
          }`}
          onClick={handleLikedClick}
          role="region"
          aria-label="Properties Liked"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Properties Liked
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <span className="text-lg">❤️</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{swipeStats.totalLiked}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Properties you&apos;re interested in
            </p>
          </CardContent>
        </Card>

        <Card
          className={`bg-card border-2 transition-all duration-300 hover:shadow-lg ${
            swipeStats.totalPassed > 0
              ? 'cursor-pointer border-red-500/20 hover:border-red-500/40 hover:scale-105'
              : 'cursor-default border-border'
          }`}
          onClick={handlePassedClick}
          role="region"
          aria-label="Properties Passed"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Properties Passed
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-lg">👎</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{swipeStats.totalPassed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Properties you&apos;ve declined
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Discover Properties</h2>
        <SwipeContainer
          properties={initialData.properties}
          neighborhoods={initialData.neighborhoods}
          onEmpty={() => {
            setHasShownWelcome(false);
            toast.success(
              "You've seen all available properties! Check back later for new listings."
            );
          }}
          onSwipe={(direction: 'left' | 'right') => {
            setSwipeStats((prev: SwipeStats) => ({
              totalViewed: prev.totalViewed + 1,
              totalLiked: prev.totalLiked + (direction === 'right' ? 1 : 0),
              totalPassed: prev.totalPassed + (direction === 'left' ? 1 : 0),
            }));
          }}
        />
      </div>
    </div>
  );
}
