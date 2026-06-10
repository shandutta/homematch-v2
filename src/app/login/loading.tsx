import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="bg-hm-canvas flex min-h-screen items-center justify-center px-4">
      <Card className="border-hm-border bg-hm-surface w-full max-w-md">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <Skeleton className="bg-hm-border/70 mx-auto h-8 w-48" />
            <Skeleton className="bg-hm-border/70 mx-auto h-4 w-32" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="bg-hm-border/70 h-3 w-12" />
              <Skeleton className="bg-hm-border/70 h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="bg-hm-border/70 h-3 w-16" />
              <Skeleton className="bg-hm-border/70 h-10 w-full rounded-md" />
            </div>
            <Skeleton className="bg-hm-border/70 h-10 w-full rounded-full" />
          </div>

          <div className="space-y-3 pt-2">
            <Skeleton className="bg-hm-border/70 mx-auto h-4 w-32" />
            <Skeleton className="bg-hm-border/70 mx-auto h-4 w-36" />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
