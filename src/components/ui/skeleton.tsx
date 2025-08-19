import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-muted skeleton animate-pulse rounded-md', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading..."
      {...props}
    />
  )
}

export { Skeleton }
