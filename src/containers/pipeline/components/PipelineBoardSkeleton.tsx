'use client'

import { Skeleton } from '@/components/ui/skeleton'

const COLUMN_COUNT = 6
const CARDS_PER_COLUMN = 3

export function PipelineBoardSkeleton() {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-3">
        {Array.from({ length: COLUMN_COUNT }).map((_, columnIndex) => (
          <div key={columnIndex} className="w-72 flex-shrink-0">
            <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-6" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: CARDS_PER_COLUMN }).map((__, rowIndex) => (
                  <div key={rowIndex} className="border-border rounded-lg border p-3 shadow-sm">
                    <Skeleton className="mb-2 h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                    <div className="mt-3 flex items-center justify-between">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PipelineBoardSkeleton

export function MaintenanceActiveSkeleton() {
  return (
    <div className="space-y-3 rounded-lg bg-gray-50 p-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MaintenanceTableSkeleton({
  columns,
  rows = 6,
}: {
  columns: number
  rows?: number
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div
        className="grid gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, idx) => (
          <div key={idx} className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid gap-4 px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, colIdx) => (
              <Skeleton
                key={colIdx}
                className="h-4 w-full"
                style={{ width: `${60 + ((rowIdx + colIdx) % 4) * 10}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
