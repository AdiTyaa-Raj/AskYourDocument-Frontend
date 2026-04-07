/**

 * @component
 */

import { Skeleton } from '@/components/ui/skeleton'

const PROPERTY_ROWS = 8
const INTERNAL_METRICS = 5
const RELATED_DOCS = 3

export function DocumentPreviewSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="mb-6 flex flex-shrink-0 items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <Skeleton className="size-5" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Document Preview */}
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Skeleton className="mx-auto mb-4 size-16 rounded-full" />
            <Skeleton className="mx-auto h-5 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-64" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DocumentSidebarSkeleton() {
  return (
    <div className="flex h-screen w-[420px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* AI Assistant Section */}
      <div className="max-h-[45vh] overflow-y-auto border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 flex-shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" style={{ width: `${100 - i * 15}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Document Properties Section */}
      <div className="flex-1 overflow-y-auto p-6">
        <Skeleton className="mb-6 h-6 w-48" />

        <div className="space-y-4">
          {/* Document Info Card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
              {Array.from({ length: PROPERTY_ROWS }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>

          {/* Collapsible Cards - Consensus & Thesis */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="size-4" />
              </div>
            </div>
          ))}

          {/* Internal Metrics Card - Expanded */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between p-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="size-4" />
            </div>
            <div className="space-y-3 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              {Array.from({ length: INTERNAL_METRICS }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* Related Documents Card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="space-y-3">
              {Array.from({ length: RELATED_DOCS }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <Skeleton className="mt-0.5 size-4" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="size-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
