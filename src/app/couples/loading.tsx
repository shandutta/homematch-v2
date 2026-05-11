import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 bg-white/10" />
        <Skeleton className="mt-2 h-4 w-64 bg-white/10" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="border-white/10 bg-white/5">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-white/10" />
                  <Skeleton className="h-3 w-24 bg-white/10" />
                </div>
              </div>
              <Skeleton className="h-4 w-full bg-white/10" />
              <Skeleton className="h-4 w-3/4 bg-white/10" />
              <Skeleton className="h-10 w-full rounded-full bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
