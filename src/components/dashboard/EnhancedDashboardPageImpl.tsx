'use client';

import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { useRouter as useNextRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { EnhancedPropertyCard } from './EnhancedPropertyCard';
import { DashboardData } from '@/lib/data/loader';
import { UserProfile } from '@/types/database';
import { Heart, X, Eye } from 'lucide-react';
import { dashboardTokens } from '@/lib/styles/dashboard-tokens';

interface SwipeStats {
  totalViewed: number;
  totalLiked: number;
  totalPassed: number;
}

interface EnhancedDashboardPageImplProps {
  initialData: DashboardData;
  returning: boolean;
  userProfile: UserProfile | null;
  initialSwipeStats: SwipeStats;
  session: Session | null;
  router?: ReturnType<typeof useNextRouter>;
}

export function EnhancedDashboardPageImpl({
  initialData,
  returning,
  userProfile,
  initialSwipeStats,
  session,
  router: injectedRouter,
}: EnhancedDashboardPageImplProps) {
  const nextRouter = useNextRouter();
  const router = injectedRouter ?? nextRouter;
  const [swipeStats, setSwipeStats] = useState<SwipeStats>(initialSwipeStats);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [properties, setProperties] = useState(initialData.properties.slice(0, 3));
  const [loading, setLoading] = useState(false);

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

  const handleLike = useCallback(async (propertyId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          is_like: true,
        }),
      });

      if (response.ok) {
        setSwipeStats(prev => ({
          ...prev,
          totalLiked: prev.totalLiked + 1,
          totalViewed: prev.totalViewed + 1,
        }));
        
        // Remove the liked property from view
        setProperties(prev => prev.filter(p => p.id !== propertyId));
        
        // Add a new property if available
        const newProperty = initialData.properties.find(
          p => !properties.some(existing => existing.id === p.id)
        );
        if (newProperty) {
          setProperties(prev => [...prev.filter(p => p.id !== propertyId), newProperty]);
        }
        
        toast.success('Property liked! 💚');
      }
    } catch (error) {
      console.error('Error liking property:', error);
      toast.error('Failed to like property');
    }
  }, [session?.user?.id, properties, initialData.properties]);

  const handleDislike = useCallback(async (propertyId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          is_like: false,
        }),
      });

      if (response.ok) {
        setSwipeStats(prev => ({
          ...prev,
          totalPassed: prev.totalPassed + 1,
          totalViewed: prev.totalViewed + 1,
        }));
        
        // Remove the disliked property from view
        setProperties(prev => prev.filter(p => p.id !== propertyId));
        
        // Add a new property if available
        const newProperty = initialData.properties.find(
          p => !properties.some(existing => existing.id === p.id)
        );
        if (newProperty) {
          setProperties(prev => [...prev.filter(p => p.id !== propertyId), newProperty]);
        }
        
        toast.success('Property passed! 👎');
      }
    } catch (error) {
      console.error('Error disliking property:', error);
      toast.error('Failed to dislike property');
    }
  }, [session?.user?.id, properties, initialData.properties]);

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

  const loadMoreProperties = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/properties?limit=3');
      if (response.ok) {
        const data = await response.json();
        if (data.properties && data.properties.length > 0) {
          setProperties(prev => [...prev, ...data.properties.slice(0, 3 - prev.length)]);
        }
      }
    } catch (error) {
      console.error('Error loading more properties:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Load more properties when we have less than 3
  useEffect(() => {
    if (properties.length < 3 && initialData.properties.length > 3) {
      loadMoreProperties();
    }
  }, [properties.length, initialData.properties.length, loadMoreProperties]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Discover Your Dream Home
        </h1>
        <p className="text-lg text-muted-foreground">
          Swipe through properties and find your perfect match
        </p>
      </div>

      {/* Stats Cards */}
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
              <Eye className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{swipeStats.totalViewed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total properties you've seen
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
              <Heart className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{swipeStats.totalLiked}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Properties you're interested in
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
              <X className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{swipeStats.totalPassed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Properties you've declined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Property Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          {properties.length === 0 ? 'Loading Properties...' : 'Swipe to Find Your Match'}
        </h2>
        
        {properties.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No properties available right now
            </p>
            <Button onClick={loadMoreProperties} disabled={loading}>
              {loading ? 'Loading...' : 'Load More Properties'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property, index) => {
              const neighborhood = initialData.neighborhoods.find(
                n => n.id === property.neighborhood_id
              );
              
              return (
                <div key={property.id} className="transform transition-all duration-300 hover:scale-105">
                  <EnhancedPropertyCard
                    property={property}
                    neighborhood={neighborhood?.name}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    showActions={true}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {properties.length < 3 && initialData.properties.length > 3 && (
        <div className="text-center">
          <Button 
            onClick={loadMoreProperties} 
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? 'Loading...' : 'Load More Properties'}
          </Button>
        </div>
      )}
    </div>
  );
}
