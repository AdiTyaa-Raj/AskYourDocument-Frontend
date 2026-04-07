'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface TableSkeletonLoaderProps {
  /** Number of columns to show (excluding checkbox) */
  columnCount?: number
  /** Number of rows to show */
  rowCount?: number
  /** Whether to show checkbox column */
  showCheckbox?: boolean
  /** Whether to show action buttons below table */
  showActionButtons?: boolean
  /** Custom class name */
  className?: string
  /** Minimum table width */
  minTableWidth?: number
}

export function TableSkeletonLoader({
  columnCount = 8,
  rowCount = 12,
  showCheckbox = true,
  showActionButtons = false,
  className = '',
  minTableWidth = 1000,
}: TableSkeletonLoaderProps) {
  const totalColumns = showCheckbox ? columnCount + 1 : columnCount

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm" style={{ minWidth: `${minTableWidth}px` }}>
          <thead>
            <tr className="border-b border-gray-200">
              {Array.from({ length: totalColumns }, (_, index) => (
                <th
                  key={index}
                  className="px-2 py-1 text-left font-semibold"
                  style={{
                    width:
                      index === 0 && showCheckbox
                        ? '40px'
                        : `${Math.floor((minTableWidth - (showCheckbox ? 40 : 0)) / columnCount)}px`,
                  }}
                >
                  {index === 0 && showCheckbox ? (
                    <div className="flex justify-center">
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-20" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-100">
                {Array.from({ length: totalColumns }, (_, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-2 py-1 text-left"
                    style={{
                      width:
                        colIndex === 0 && showCheckbox
                          ? '40px'
                          : `${Math.floor((minTableWidth - (showCheckbox ? 40 : 0)) / columnCount)}px`,
                    }}
                  >
                    {colIndex === 0 && showCheckbox ? (
                      <div className="flex justify-center">
                        <Skeleton className="h-4 w-4 rounded" />
                      </div>
                    ) : (
                      <Skeleton
                        className="h-4 w-full max-w-[120px]"
                        style={{
                          width: `${((rowIndex * 17 + colIndex * 13) % 60) + 40}%`, // Deterministic width between 40-100%
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons skeleton (shown when items would be selected) */}
      {showActionButtons && (
        <div className="fixed bottom-6 left-1/2 z-50 min-w-[600px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <span className="text-gray-500">-</span>
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-36" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TableSkeletonLoader
