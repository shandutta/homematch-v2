import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full bg-white/10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-white/10" />
          <Skeleton className="h-4 w-32 bg-white/10" />
        </div>
      </div>

      <Card className="bg-card border-white/10">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-5 w-40 bg-white/10" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full rounded-md bg-white/10" />
            <Skeleton className="h-10 w-full rounded-md bg-white/10" />
            <Skeleton className="h-10 w-full rounded-md bg-white/10" />
            <Skeleton className="h-10 w-full rounded-md bg-white/10" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-white/10">
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-32 bg-white/10" />
          <Skeleton className="h-24 w-full rounded-lg bg-white/10" />
        </CardContent>
      </Card>
    </div>
  )
}
