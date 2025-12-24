import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PropertyCardSkeleton } from '@/components/shared/PropertyCardSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <Skeleton className="h-8 w-40 bg-white/10" />
        <Skeleton className="mt-2 h-4 w-64 bg-white/10" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index} className="bg-card">
            <CardContent className="p-6">
              <Skeleton className="mb-2 h-4 w-24 bg-white/10" />
              <Skeleton className="mb-2 h-8 w-16 bg-white/10" />
              <Skeleton className="h-3 w-32 bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="min-h-[520px]">
            <PropertyCardSkeleton />
          </div>
        ))}
      </div>

      <div className="min-h-[320px] rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full bg-white/10" />
          <Skeleton className="h-5 w-32 bg-white/10" />
        </div>
        <div className="space-y-3">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-lg bg-white/5 p-3"
            >
              <Skeleton className="h-14 w-14 rounded-md bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-24 bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
