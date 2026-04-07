import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function ChatSkeleton() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
      <div className="flex flex-col gap-8">
        {/* AI Message Skeleton */}
        <div className="flex items-start gap-3">
          <Skeleton className="size-8 flex-shrink-0 rounded-full" />
          <div className="max-w-[80%]">
            <Skeleton className="mb-1 h-3 w-12" />
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          </div>
        </div>

        {/* User Message Skeleton */}
        <div className="flex flex-row-reverse items-start gap-3">
          <Skeleton className="size-8 flex-shrink-0 rounded-full" />
          <div className="max-w-[80%] text-right">
            <Skeleton className="mb-1 ml-auto h-3 w-8" />
            <div className="space-y-2 rounded-xl border border-[#2563EB] bg-[#2563EB] px-5 py-4">
              <Skeleton className="h-4 w-40 bg-white/20" />
              <Skeleton className="mt-2 h-3 w-16 bg-white/20" />
            </div>
          </div>
        </div>

        {/* AI Message Skeleton */}
        <div className="flex items-start gap-3">
          <Skeleton className="size-8 flex-shrink-0 rounded-full" />
          <div className="max-w-[80%]">
            <Skeleton className="mb-1 h-3 w-12" />
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
