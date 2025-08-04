import { Skeleton } from '@/components/ui/skeleton'

export function PropertyCardSkeleton() {
  return (
    <div className="card-glassmorphism-style w-full h-full">
      {/* Image skeleton */}
      <Skeleton className="w-full h-64 rounded-t-xl bg-white/10" />
      
      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        {/* Price */}
        <Skeleton className="h-8 w-32 bg-white/10" />
        
        {/* Address */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-4 w-3/4 bg-white/10" />
        </div>
        
        {/* Property details */}
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16 bg-white/10" />
          <Skeleton className="h-4 w-16 bg-white/10" />
          <Skeleton className="h-4 w-20 bg-white/10" />
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <Skeleton className="h-12 w-24 rounded-full bg-white/10" />
          <Skeleton className="h-12 w-24 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  )
}