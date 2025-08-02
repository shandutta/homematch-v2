'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Property Cards Skeleton */}
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="relative h-[600px] w-full max-w-md mx-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute h-full w-full"
              style={{
                transform: `translateY(${i * 10}px) scale(${1 - i * 0.05})`,
                zIndex: 3 - i,
              }}
            >
              <Card className="h-full">
                <CardContent className="p-0">
                  <Skeleton className="h-1/2 w-full" />
                  <div className="h-1/2 p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((j) => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-white shadow-xl">
      <Skeleton className="h-1/2 w-full" />
      <div className="h-1/2 p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
