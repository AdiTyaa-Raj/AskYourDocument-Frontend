'use client'

import { useState, useRef, useCallback, useMemo, useEffect, type CSSProperties } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Base table data interface that all table data types should extend
export interface TableData extends Record<string, unknown> {
  id: string | number
}

export interface ColumnConfig<T extends TableData = TableData> {
  key: string | 'checkbox'
  label: string | React.ReactNode
  width: number
  visible: boolean
  align?: 'left' | 'center' | 'right'
  /** When true, header content is aligned to match column align (e.g. center/right). Default false = previous behavior. */
  alignHeaderToCell?: boolean
  title?: string
  sortable?: boolean
  formatter?: (value: unknown, row: T) => React.ReactNode
  headerClassName?: string
}

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig {
  key: string
  direction: SortDirection
}

// Fixed width for checkbox column to ensure consistent sizing
const CHECKBOX_COLUMN_WIDTH = 100

export interface DataTableProps<T extends TableData = TableData> {
  data: T[]
  columns: ColumnConfig<T>[]
  onColumnVisibilityChange?: (columnKey: string, visible: boolean) => void
  onColumnWidthChange?: (columnKey: string, width: number) => void
  onRowSelection?: (selectedIds: Set<number>) => void
  selectedRows?: Set<number>
  className?: string
  minTableWidth?: number
  /** When true (default), table stretches to fill container width. When false, table uses only minTableWidth and leaves rest blank. */
  fillWidth?: boolean
  /** When true, column header labels wrap to multiple lines and header row can grow to double height for long labels. */
  wrapHeaderLabels?: boolean
  emptyStateTitle?: string
  emptyStateDescription?: string
  sortConfig?: SortConfig
  onSortChange?: (config: SortConfig) => void
  showColumnsOnEmpty?: boolean // Whether to show column headers when table is empty (defaults to true)
  // Pagination props
  totalCount?: number // Total count from API for server-side pagination
  showPageSizeChanger?: boolean
  defaultPageSize?: number
  page?: number
  onPageChange?: (page: number) => void
  pageSize?: number
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  paginationMode?: 'client' | 'server'
  showPagination?: boolean
  /** When provided, each data row is clickable and this is called with the row data. */
  onRowClick?: (row: T) => void
}

const getInitialColumnWidths = <T extends TableData = TableData>(
  columns: ColumnConfig<T>[]
): Record<string, number> => {
  return columns.reduce(
    (acc, col) => {
      acc[col.key as string] = col.width
      return acc
    },
    {} as Record<string, number>
  )
}

const getHeaderAlignmentClass = <T extends TableData = TableData>(
  column: ColumnConfig<T>
): string => {
  if (!column.alignHeaderToCell) return 'justify-between'
  switch (column.align) {
    case 'center':
      return 'justify-center'
    case 'right':
      return 'justify-end'
    default:
      return 'justify-start'
  }
}

function getTableStyle(fillWidth: boolean, minTableWidth: number): CSSProperties {
  return fillWidth
    ? { minWidth: `${minTableWidth}px` }
    : { width: `${minTableWidth}px`, minWidth: `${minTableWidth}px` }
}

function getColumnCellStyle<T extends TableData = TableData>(
  column: ColumnConfig<T>,
  columnWidths: Record<string, number>
): CSSProperties {
  const isCheckbox = column.key === 'checkbox'
  return {
    width: isCheckbox ? `${CHECKBOX_COLUMN_WIDTH}px` : `${columnWidths[column.key as string]}px`,
    minWidth: isCheckbox ? `${CHECKBOX_COLUMN_WIDTH}px` : undefined,
    maxWidth: isCheckbox ? `${CHECKBOX_COLUMN_WIDTH}px` : undefined,
  }
}

export function DataTable<T extends TableData = TableData>({
  data,
  columns,
  onColumnVisibilityChange: _onColumnVisibilityChange,
  onColumnWidthChange,
  onRowSelection,
  selectedRows = new Set(),
  className = '',
  minTableWidth = 1000,
  fillWidth = true,
  wrapHeaderLabels = false,
  emptyStateTitle = 'No data found',
  emptyStateDescription = 'There is currently no information available.',
  sortConfig,
  onSortChange,
  showColumnsOnEmpty = true,
  totalCount,
  showPageSizeChanger = true,
  defaultPageSize = 10,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  paginationMode = 'client',
  showPagination = true,
  onRowClick,
}: DataTableProps<T>) {
  const resolvedPageSizeOptions = useMemo(() => {
    const base =
      pageSizeOptions && pageSizeOptions.length > 0 ? [...pageSizeOptions] : [10, 25, 50, 100]
    const ensureOption = (value?: number) => {
      if (typeof value === 'number' && !base.includes(value)) {
        base.push(value)
      }
    }
    ensureOption(defaultPageSize)
    ensureOption(pageSize)
    base.sort((a, b) => a - b)
    return base
  }, [pageSizeOptions, defaultPageSize, pageSize])

  const initialPageSize = pageSize ?? defaultPageSize ?? resolvedPageSizeOptions[0] ?? 10
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize)
  const [internalPage, setInternalPage] = useState(page ?? 1)

  const isPageControlled = typeof page === 'number'
  const isPageSizeControlled = typeof pageSize === 'number'
  const currentPageSize = isPageSizeControlled ? (pageSize as number) : internalPageSize
  const currentPage = isPageControlled ? (page as number) : internalPage

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    getInitialColumnWidths(columns)
  )

  const mergeNewColumnWidths = useCallback(
    (prev: Record<string, number>): Record<string, number> => {
      const newWidths = { ...prev }
      let hasChanges = false

      // Add widths for any new columns that don't exist in state
      columns.forEach((col) => {
        if (!((col.key as string) in newWidths)) {
          newWidths[col.key as string] = col.width
          hasChanges = true
        }
      })

      return hasChanges ? newWidths : prev
    },
    [columns]
  )

  // Sync columnWidths when columns change (e.g., when dynamic columns are added)
  useEffect(() => {
    setColumnWidths(mergeNewColumnWidths)
  }, [mergeNewColumnWidths])

  const [isResizing, setIsResizing] = useState(false)
  const [_resizingColumn, setResizingColumn] = useState<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const visibleColumns = columns.filter((col) => col.visible)

  const totalItems = typeof totalCount === 'number' ? totalCount : data.length
  const totalPages = Math.max(1, Math.ceil((totalItems || 0) / Math.max(currentPageSize, 1)))
  const startIndex = Math.max((currentPage - 1) * currentPageSize, 0)

  const paginatedData = useMemo(() => {
    if (paginationMode === 'server') {
      return data
    }
    return data.slice(startIndex, startIndex + currentPageSize)
  }, [data, startIndex, currentPageSize, paginationMode])

  const prevDataLength = useRef(data.length)
  useEffect(() => {
    if (
      !isPageControlled &&
      paginationMode === 'client' &&
      prevDataLength.current !== data.length
    ) {
      prevDataLength.current = data.length
      setInternalPage(1)
    } else {
      prevDataLength.current = data.length
    }
  }, [data.length, isPageControlled, paginationMode])

  useEffect(() => {
    if (!isPageControlled && currentPage > totalPages) {
      setInternalPage(totalPages)
    }
  }, [currentPage, totalPages, isPageControlled])

  const pageSizeThreshold = resolvedPageSizeOptions[0] ?? currentPageSize ?? 10
  const shouldShowPagination =
    showPagination &&
    totalItems > pageSizeThreshold &&
    (totalPages > 1 || (showPageSizeChanger && resolvedPageSizeOptions.length > 1))

  const handleRowToggle = (rowId: number, checked: boolean) => {
    // Single-select behavior: clear all previous selections
    const newSelection = new Set<number>()
    if (checked) {
      // Only add the newly selected row
      newSelection.add(rowId)
    }
    // If unchecked, newSelection remains empty (deselects all)
    onRowSelection?.(newSelection)
  }

  const handleSort = (columnKey: string) => {
    if (!onSortChange) return

    let newDirection: SortDirection = 'asc'

    if (sortConfig?.key === columnKey) {
      // Cycle through: asc -> desc -> null
      if (sortConfig.direction === 'asc') {
        newDirection = 'desc'
      } else if (sortConfig.direction === 'desc') {
        newDirection = null
      }
    }

    onSortChange({ key: columnKey, direction: newDirection })
  }

  const handleMouseDown = useCallback(
    (column: string, e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      setResizingColumn(column)

      const startX = e.clientX
      const startWidth = columnWidths[column]

      const handleMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startX
        const newWidth = Math.max(50, startWidth + diff)

        setColumnWidths((prev) => ({
          ...prev,
          [column]: newWidth,
        }))

        onColumnWidthChange?.(column, newWidth)
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        setResizingColumn(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [columnWidths, onColumnWidthChange]
  )

  const getAlignment = (align?: string) => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      default:
        return 'text-left'
    }
  }

  const formatValue = (column: ColumnConfig<T>, value: unknown, row: T) => {
    if (column.formatter) {
      return column.formatter(value, row)
    }
    // Default formatter - just return the string representation of the value
    return String(value)
  }

  const getCellClassName = (column: ColumnConfig<T>, baseClasses: string = '') => {
    // Use minimal padding for checkbox column
    const padding = column.key === 'checkbox' ? 'py-1 px-1' : 'py-1 px-2'
    let classes = `${padding} ${baseClasses}`

    // Add alignment (checkbox column uses flex justify-center instead)
    if (column.key !== 'checkbox') {
      classes += ` ${getAlignment(column.align)}`
    }

    return classes
  }

  // Pagination handlers
  const handlePageChange = useCallback(
    (pageNumber: number) => {
      const next = Math.min(Math.max(pageNumber, 1), totalPages || 1)
      if (!isPageControlled) {
        setInternalPage(next)
      }
      onPageChange?.(next)
    },
    [isPageControlled, onPageChange, totalPages]
  )

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      const normalizedSize =
        newPageSize > 0 ? newPageSize : (resolvedPageSizeOptions[0] ?? initialPageSize)
      if (!isPageSizeControlled) {
        setInternalPageSize(normalizedSize)
      }
      onPageSizeChange?.(normalizedSize)
      handlePageChange(1)
    },
    [
      isPageSizeControlled,
      resolvedPageSizeOptions,
      initialPageSize,
      onPageSizeChange,
      handlePageChange,
    ]
  )

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow + 2) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage <= 3) {
        // Near the start
        for (let i = 2; i <= Math.min(maxPagesToShow, totalPages - 1); i++) {
          pages.push(i)
        }
        pages.push('...')
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push('...')
        for (let i = totalPages - maxPagesToShow + 1; i < totalPages; i++) {
          pages.push(i)
        }
      } else {
        // In the middle
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()
  const startItem = totalItems === 0 ? 0 : Math.min(startIndex + 1, totalItems)
  const endItem = totalItems === 0 ? 0 : Math.min(startIndex + paginatedData.length, totalItems)

  // Render pagination component - always outside with consistent styling
  const renderPagination = () => {
    if (!shouldShowPagination) return null

    return (
      <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Left side - Items info */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>
            Showing {startItem} to {endItem} of {totalItems} results
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
        {showPageSizeChanger && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Rows per page:</span>
            <Select
              value={String(currentPageSize)}
              onValueChange={(value) => handlePageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[75px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resolvedPageSizeOptions.map((size) => (
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

  return (
    <>
      <div className={`rounded-lg border bg-white ${className}`}>
        <style jsx>{`
          .resizing {
            user-select: none;
          }
          .resizing * {
            cursor: col-resize !important;
          }
        `}</style>
        <div
          className={`max-h-[560px] overflow-x-auto overflow-y-auto ${isResizing ? 'resizing' : ''}`}
        >
          <table
            ref={tableRef}
            className={`table-fixed text-sm ${fillWidth ? 'w-full' : ''}`}
            style={getTableStyle(fillWidth, minTableWidth)}
          >
            {(paginatedData.length > 0 || showColumnsOnEmpty) && (
              <thead>
                <tr className="border-b border-gray-200">
                  {visibleColumns.map((column) => {
                    const isSorted = sortConfig?.key === column.key
                    const sortDirection = isSorted ? sortConfig?.direction : null

                    return (
                      <th
                        key={column.key as string}
                        className={`group sticky top-0 z-10 ${column.key === 'checkbox' ? 'px-1 py-1' : 'px-2 py-2'} bg-white align-top font-semibold text-gray-900 transition-colors select-none dark:bg-gray-800 ${column.key !== 'checkbox' && column.sortable !== false ? 'cursor-pointer hover:bg-gray-50' : ''} ${column.key === 'checkbox' ? '' : getAlignment(column.align)} ${wrapHeaderLabels && column.key !== 'checkbox' ? 'max-h-[2.75rem] overflow-hidden' : ''} ${column.headerClassName || ''}`}
                        title={column.title}
                        style={getColumnCellStyle(column, columnWidths)}
                        onClick={() => {
                          if (column.key !== 'checkbox' && column.sortable !== false) {
                            handleSort(column.key as string)
                          }
                        }}
                      >
                        {column.key === 'checkbox' ? (
                          <div className="flex justify-center">
                            {/* Empty space for checkbox column header */}
                          </div>
                        ) : (
                          <>
                            <div
                              className={`flex gap-1 ${wrapHeaderLabels ? `min-w-0 items-start ${getHeaderAlignmentClass(column)}` : `items-center ${getHeaderAlignmentClass(column)}`}`}
                            >
                              <span
                                className={
                                  wrapHeaderLabels
                                    ? 'line-clamp-2 min-w-0 flex-1 break-words'
                                    : 'truncate'
                                }
                                title={
                                  wrapHeaderLabels && typeof column.label === 'string'
                                    ? column.label
                                    : undefined
                                }
                              >
                                {column.label}
                              </span>
                              {column.sortable !== false && (
                                <div className="flex shrink-0 flex-col">
                                  <ChevronUp
                                    className={`h-3 w-3 ${sortDirection === 'asc' ? 'text-gray-900' : 'text-gray-300'}`}
                                  />
                                  <ChevronDown
                                    className={`-mt-1 h-3 w-3 ${sortDirection === 'desc' ? 'text-gray-900' : 'text-gray-300'}`}
                                  />
                                </div>
                              )}
                            </div>
                            <div
                              className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize opacity-0 transition-opacity group-hover:opacity-100 hover:bg-blue-400"
                              onMouseDown={(e) => {
                                e.stopPropagation()
                                handleMouseDown(column.key as string, e)
                              }}
                            ></div>
                          </>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
            )}
            <tbody>
              {paginatedData.length === 0 ? (
                <tr className="border-b border-gray-100">
                  <td
                    colSpan={visibleColumns.length}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <p className="font-semibold">{emptyStateTitle}</p>
                    <p className="mt-2 text-sm">{emptyStateDescription}</p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr
                    key={row.id || index}
                    role={onRowClick ? 'button' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onRowClick(row)
                            }
                          }
                        : undefined
                    }
                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key as string}
                        className={getCellClassName(column, 'text-gray-900')}
                        style={getColumnCellStyle(column, columnWidths)}
                      >
                        {column.key === 'checkbox' ? (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={selectedRows.has(Number(row.id))}
                              onCheckedChange={(checked) =>
                                handleRowToggle(Number(row.id), checked as boolean)
                              }
                              className="bg-input-background dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Select ${row.ticker}`}
                            />
                          </div>
                        ) : (
                          formatValue(column, row[column.key as keyof T], row)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* External Pagination - Always outside the table card */}
      {renderPagination()}
    </>
  )
}
