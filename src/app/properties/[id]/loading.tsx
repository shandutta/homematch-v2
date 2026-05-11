import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur"
      aria-busy="true"
      aria-label="Loading property details"
    >
      <div className="w-full max-w-3xl space-y-4 px-4">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl bg-white/10" />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 bg-white/10" />
            <Skeleton className="h-4 w-32 bg-white/10" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full bg-white/10" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-12 rounded-lg bg-white/10" />
          <Skeleton className="h-12 rounded-lg bg-white/10" />
          <Skeleton className="h-12 rounded-lg bg-white/10" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  )
}
