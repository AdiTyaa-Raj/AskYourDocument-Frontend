import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-6">
      <div className="space-y-4 lg:col-span-4">
        <SkeletonCard height={260} />
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonCard height={240} />
          <SkeletonCard height={240} />
          <SkeletonCard height={240} />
        </div>
      </div>
      <div className="space-y-4 lg:col-span-2">
        <SkeletonCard height={180} />
        <SkeletonCard height={260} />
      </div>
    </div>
  )
}

function SkeletonCard({ height }: { height: number }) {
  return (
    <div className="border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="p-4">
        <Skeleton className="w-full" style={{ height }} />
      </div>
    </div>
  )
}
