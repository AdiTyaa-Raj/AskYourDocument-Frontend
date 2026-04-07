'use client'

import { useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NotificationPaginationProps } from '../lib/types'
import { getPageNumbers } from '../lib/utils'

export function NotificationPagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeChanger = true,
  itemLabel = 'results',
}: NotificationPaginationProps) {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
    [totalCount, pageSize]
  )

  const startIndex = useMemo(
    () => Math.max((currentPage - 1) * pageSize, 0),
    [currentPage, pageSize]
  )

  const startItem = totalCount === 0 ? 0 : Math.min(startIndex + 1, totalCount)
  const endItem = totalCount === 0 ? 0 : Math.min(startIndex + pageSize, totalCount)

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      const next = Math.min(Math.max(page, 1), totalPages)
      onPageChange(next)
    },
    [onPageChange, totalPages]
  )

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      onPageSizeChange?.(newPageSize)
    },
    [onPageSizeChange]
  )

  // Don't show pagination if total count is less than smallest page size option
  const pageSizeThreshold = pageSizeOptions[0] ?? pageSize ?? 10
  const shouldShowPagination =
    totalCount > pageSizeThreshold &&
    (totalPages > 1 || (showPageSizeChanger && pageSizeOptions.length > 1))

  if (!shouldShowPagination) {
    return null
  }

  return (
    <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Left side - Items info */}
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <span>
          Showing {startItem} to {endItem} of {totalCount} {itemLabel}
        </span>
      </div>

      {/* Center - Pagination controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                ...
              </span>
            )
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePageChange(page as number)}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          )
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right side - Page size selector */}
      {showPageSizeChanger && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => handlePageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[75px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
