import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 bg-white/10" />
        <Skeleton className="h-4 w-64 bg-white/10" />
      </div>

      {[0, 1, 2].map((index) => (
        <Card key={index} className="bg-card border-white/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 bg-white/10" />
                <Skeleton className="h-4 w-72 bg-white/10" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full bg-white/10" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-md bg-white/10" />
              <Skeleton className="h-10 w-full rounded-md bg-white/10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
