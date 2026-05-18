import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-hm-canvas px-4">
      <Card className="w-full max-w-md border-hm-border bg-hm-surface">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-8 w-48 bg-hm-border/70" />
            <Skeleton className="mx-auto h-4 w-32 bg-hm-border/70" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-12 bg-hm-border/70" />
              <Skeleton className="h-10 w-full rounded-md bg-hm-border/70" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 bg-hm-border/70" />
              <Skeleton className="h-10 w-full rounded-md bg-hm-border/70" />
            </div>
            <Skeleton className="h-10 w-full rounded-full bg-hm-border/70" />
          </div>

          <div className="space-y-3 pt-2">
            <Skeleton className="mx-auto h-4 w-32 bg-hm-border/70" />
            <Skeleton className="mx-auto h-4 w-36 bg-hm-border/70" />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
