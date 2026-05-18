import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="bg-hm-canvas text-hm-ink">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <div className="space-y-4">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>

        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="space-y-4 rounded-2xl bg-hm-surface-raised p-6 shadow-sm ring-1 ring-hm-border sm:p-8"
          >
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
