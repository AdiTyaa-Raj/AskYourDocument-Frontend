'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { DataTable, ColumnConfig, type SortConfig } from '@/components/shared/DataTable'
import { TableSkeletonLoader } from '@/components/shared/table-skeleton-loader'
import { generateWatchListColumns } from '@/containers/coverage/lib/dynamic-columns'
import type { WatchListProps, WatchListTableData, FormData, AttachmentCollectionsPayload } from '@/containers/coverage/lib/types'
import { Button } from '@/components/ui/button'
import { CompanyMoveModal } from '@/containers/coverage/components/CompanyMoveModal'
import { AppErrorState } from '@/components/shared/AppFeedbackState'
import { searchWatchList } from '@/containers/coverage/lib/search-filter-helpers'
import { getCalculatedMinTableWidth } from '@/containers/coverage/lib/dynamic-columns'
import { openAnalystAssignmentModalFromRow } from '@/containers/coverage/lib/helper'
import { resolveExchangeFromCompanyRow } from '@/lib/resolveCompanyExchange'

export function WatchList({
  searchQuery = '',
  watchlistData = [],
  totalCount,
  isLoading = false,
  isError = false,
  refetch = () => {},
  attachmentRequirements,
  attachmentOptions = [],
  attachmentSearch = '',
  onAttachmentSearchChange,
  attachmentQueryInfo,
  documentOptions = [],
  memoOptions = [],
  documentsQueryInfo,
  memosQueryInfo,
  requiredAttachmentOptions = [],
  onModalOpen = () => {},
  onModalClose = () => {},
  onOpenAnalystAssignmentModal,
  onAttachmentsRefetch,
  moveToActiveDiscussionMutation,
  removeFromWatchlistMutation,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: WatchListProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isActiveDiscussionModalOpen, setIsActiveDiscussionModalOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })
  const [columns, setColumns] = useState<ColumnConfig<WatchListTableData>[]>([])

  const handleAnalystCellClick = useCallback(
    (row: WatchListTableData) => {
      openAnalystAssignmentModalFromRow(onOpenAnalystAssignmentModal, {
        id: row.id,
        ticker: row.ticker,
        name: row.securityDescription,
        stageAssignmentId: row.stageAssignmentId,
        primaryAnalystId: row.primaryAnalystId,
        secondaryAnalystId: row.secondaryAnalystId,
      })
    },
    [onOpenAnalystAssignmentModal]
  )

  // Generate dynamic columns when data changes (same analyst-click logic as portfolio holdings)
  useEffect(() => {
    const generatedColumns = generateWatchListColumns(watchlistData, handleAnalystCellClick)
    setColumns(generatedColumns)
  }, [watchlistData, handleAnalystCellClick])

  const calculatedMinTableWidth = useMemo(
    () => getCalculatedMinTableWidth(columns),
    [columns]
  )

  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setColumns(prev => prev.map(col =>
      col.key === columnKey ? { ...col, visible } : col
    ))
  }

  const handleColumnWidthChange = (columnKey: string, width: number) => {
    setColumns(prev => prev.map(col =>
      col.key === columnKey ? { ...col, width } : col
    ))
  }

  const handleRowSelection = (rowIds: Set<number>) => {
    setSelectedRows(rowIds)
  }

  const handleRemoveFromWatchlist = async () => {
    const selectedItems = watchlistCompanies.filter(item => selectedRows.has(Number(item.id)))
    const ticker = selectedItems[0]?.ticker
    
    if (!ticker || !removeFromWatchlistMutation) {
      return
    }

    try {
      const item = selectedItems[0]
      await removeFromWatchlistMutation.mutateAsync({
        ticker,
        exchange: resolveExchangeFromCompanyRow(item),
        companyId: String(item.id),
      })

      setSelectedRows(new Set())
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Failed to remove from watchlist:', error)
    }
  }

  const handleMoveToActiveDiscussion = () => {
    setIsActiveDiscussionModalOpen(true)
    const target = selectedItems[0]
    const numericId =
      typeof target?.id === 'number'
        ? target.id
        : typeof target?.id === 'string'
          ? Number(target.id)
          : undefined
    onModalOpen({ id: Number.isFinite(numericId) ? (numericId as number) : undefined, ticker: target?.ticker })
  }

  const handleActiveDiscussionSubmit = async (data: FormData, attachments?: { documents?: AttachmentCollectionsPayload }) => {
    const selectedItems = watchlistCompanies.filter(item => selectedRows.has(Number(item.id)))
    const ticker = selectedItems[0]?.ticker

    if (!ticker) {
      return
    }

    try {
      // Type guard to ensure we have the correct data structure
      if (!('reason' in data)) {
        console.error('Invalid form data for active discussion move')
        return
      }

      const item = selectedItems[0]
      await moveToActiveDiscussionMutation?.mutateAsync({
        ticker,
        exchange: resolveExchangeFromCompanyRow(item),
        companyId: String(item.id),
        rationale: data.reason,
        attachments,
      })

      setSelectedRows(new Set())
      setIsActiveDiscussionModalOpen(false)
      onModalClose()
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Failed to move to active discussion:', error)
    }
  }

  const handleSortChange = (config: SortConfig) => {
    setSortConfig(config)
  }

  // Apply global search and sort
  const watchlistCompanies = useMemo(() => {
    return searchWatchList(watchlistData || [], searchQuery, sortConfig)
  }, [watchlistData, searchQuery, sortConfig])

  const selectedItems = watchlistCompanies.filter(item => selectedRows.has(Number(item.id)))

  const handleModalClose = () => {
    setIsActiveDiscussionModalOpen(false)
    onModalClose()
  }

  const selectedCompanyData = useMemo(
    () => ({
      id: selectedItems[0]?.id as number | undefined,
      ticker: selectedItems[0]?.ticker ?? '',
      name: selectedItems[0]?.securityDescription ?? '',
    }),
    [selectedItems]
  )

  // Handle loading state
  if (isLoading) {
    return (
      <TableSkeletonLoader
        columnCount={10}
        rowCount={11}
        showCheckbox={true}
        showActionButtons={true}
        minTableWidth={1000}
      />
    )
  }

  // Handle error state
  if (isError) {
    return (
      <AppErrorState
        message="Failed to load watchlist data"
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-6 relative">

      {/* Watch List Table */}
      <DataTable<WatchListTableData>
        data={watchlistCompanies}
        columns={columns}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onColumnWidthChange={handleColumnWidthChange}
        onRowSelection={handleRowSelection}
        selectedRows={selectedRows}
        minTableWidth={calculatedMinTableWidth}
        wrapHeaderLabels={true}
        emptyStateTitle="No companies in watchlist"
        emptyStateDescription={searchQuery ? "No companies match your search criteria." : "Add companies to your watchlist to track them here."}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        showColumnsOnEmpty={false}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        paginationMode="server"
      />

      {/* Action Bar - Shows when items are selected */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg px-6 py-4 flex items-center justify-between gap-8 min-w-[600px]">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="font-semibold">{selectedItems[0]?.ticker}</span>
            <span className="text-gray-500">-</span>
            <span className="text-gray-700 dark:text-gray-300">{selectedItems[0]?.securityDescription}</span>
            {selectedRows.size > 1 && (
              <span className="text-gray-500 text-xs">+{selectedRows.size - 1} more</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={handleRemoveFromWatchlist}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove from Watchlist
            </Button>
            <Button
              onClick={handleMoveToActiveDiscussion}
              className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
            >
              Move to Active Discussion
            </Button>
          </div>
        </div>
      )}



      {/* Move to Active Discussion Modal */}
      <CompanyMoveModal
        isOpen={isActiveDiscussionModalOpen}
        onClose={handleModalClose}
        mode="active-discussion"
        companyData={selectedCompanyData}
        onSubmit={handleActiveDiscussionSubmit}
        attachmentRequirements={attachmentRequirements}
        attachmentOptions={attachmentOptions}
        attachmentSearch={attachmentSearch}
        onAttachmentSearchChange={onAttachmentSearchChange}
        attachmentQueryInfo={attachmentQueryInfo}
        documentOptions={documentOptions}
        memoOptions={memoOptions}
        documentsQueryInfo={documentsQueryInfo}
        memosQueryInfo={memosQueryInfo}
        requiredAttachmentOptions={requiredAttachmentOptions}
        isSubmitting={moveToActiveDiscussionMutation?.isPending || false}
        onAttachmentsRefetch={onAttachmentsRefetch}
      />
    </div>
  )
}
