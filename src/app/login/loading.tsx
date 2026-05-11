import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] px-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-8 w-48 bg-white/10" />
            <Skeleton className="mx-auto h-4 w-32 bg-white/10" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-12 bg-white/10" />
              <Skeleton className="h-10 w-full rounded-md bg-white/10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 bg-white/10" />
              <Skeleton className="h-10 w-full rounded-md bg-white/10" />
            </div>
            <Skeleton className="h-10 w-full rounded-full bg-white/10" />
          </div>

          <div className="space-y-3 pt-2">
            <Skeleton className="mx-auto h-4 w-32 bg-white/10" />
            <Skeleton className="mx-auto h-4 w-36 bg-white/10" />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
