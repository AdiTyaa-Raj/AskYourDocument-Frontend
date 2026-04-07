'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function ApprovalsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-3 md:col-span-1">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="border-border bg-card rounded-lg border p-3 shadow-sm">
            <Skeleton className="mb-3 h-5 w-24" />
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow md:col-span-2">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-24" />
        </div>
        <SectionSkeleton titleWidth="w-24" lines={2} />
        <SectionSkeleton titleWidth="w-32" lines={3} />
        <SectionSkeleton titleWidth="w-32" lines={4} />
      </div>
    </div>
  )
}

function SectionSkeleton({ titleWidth, lines }: { titleWidth: string; lines: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${titleWidth}`} />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-full" />
        ))}
      </div>
    </div>
  )
}

export default ApprovalsSkeleton
