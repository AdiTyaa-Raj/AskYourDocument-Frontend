/**
 * Reusable loading fallback components
 * Used with React Suspense boundaries throughout the app
 */
import { Skeleton } from '@/components/ui/skeleton'

export function PageLoadingFallback() {
  return (
    <div className="space-y-5">
      <CardSkeleton />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  )
}

export function SpinnerFallback() {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="text-center">
        <div className="border-primary mb-3 inline-block size-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  )
}

export function MinimalSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="border-primary size-6 animate-spin rounded-full border-2 border-t-transparent" />
    </div>
  )
}
