'use client'

import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, ColumnConfig, type SortConfig } from '@/components/shared/DataTable'
import { TableSkeletonLoader } from '@/components/shared/table-skeleton-loader'
import { generateUniverseColumns } from '@/containers/coverage/lib/dynamic-columns'
import type { UniverseProps, UniverseTableRow, AttachmentCollectionsPayload, FormData } from '@/containers/coverage/lib/types'
import { CompanyMoveModal } from '@/containers/coverage/components/CompanyMoveModal'
import { AppErrorState } from '@/components/shared/AppFeedbackState'
import { searchUniverse } from '@/containers/coverage/lib/search-filter-helpers'
import { getCalculatedMinTableWidth } from '@/containers/coverage/lib/dynamic-columns'
import { resolveExchangeFromCompanyRow } from '@/lib/resolveCompanyExchange'

export function Universe({
  searchQuery = '',
  universeData = [],
  totalCount,
  isLoading = false,
  error = null,
  refetch = () => {},
  primaryAnalysts = [],
  secondaryAnalysts = [],
  isLoadingPrimaryAnalysts = false,
  isLoadingSecondaryAnalysts = false,
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
  onAttachmentsRefetch,
  moveToWatchlistMutation,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: UniverseProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })
  const [columns, setColumns] = useState<ColumnConfig<UniverseTableRow>[]>([])

  // Generate dynamic columns when data changes
  useEffect(() => {
    const generatedColumns = generateUniverseColumns(universeData)
    setColumns(generatedColumns)
  }, [universeData])

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

  const handleRowSelection = (newSelection: Set<number>) => {
    setSelectedRows(newSelection)
  }

  const handleMoveToWatchlist = () => {
    setIsMoveModalOpen(true)
    onModalOpen({ id: selectedCompany?.id, ticker: selectedCompany?.ticker })
  }

  const handleModalSubmit = async (data: FormData, attachments?: { documents?: AttachmentCollectionsPayload }) => {
    const selectedCompany = universeData?.find(company => selectedRows.has(company.id))

    if (!selectedCompany) {
      return
    }

    try {
      // Type guard to ensure we have the correct data structure
      if (!('primaryAnalyst' in data) || !('secondaryAnalyst' in data) || !('screen' in data)) {
        console.error('Invalid form data for watchlist move')
        return
      }

      await moveToWatchlistMutation?.mutateAsync({
        ticker: selectedCompany.ticker,
        exchange: resolveExchangeFromCompanyRow(selectedCompany),
        companyId: String(selectedCompany.id),
        primaryAnalystId: parseInt(data.primaryAnalyst, 10),
        secondaryAnalystId: parseInt(data.secondaryAnalyst, 10),
        rationale: data.screen.trim(),
        attachments,
      })

      setIsMoveModalOpen(false)
      setSelectedRows(new Set())
      onModalClose()
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Failed to move to watchlist:', error)
    }
  }

  const handleModalClose = () => {
    setIsMoveModalOpen(false)
    onModalClose()
  }

  const handleSortChange = (config: SortConfig) => {
    setSortConfig(config)
  }

  // Apply global search and sort
  const filteredUniverse = useMemo(() => {
    return searchUniverse(universeData || [], searchQuery, sortConfig)
  }, [universeData, searchQuery, sortConfig])

  const selectedCompany = universeData?.find((company) => selectedRows.has(company.id))
  const selectedCompanyData = useMemo(
    () => ({
      id: selectedCompany?.id,
      ticker: selectedCompany?.ticker ?? '',
      name: selectedCompany?.securityDescription ?? '',
    }),
    [selectedCompany?.id, selectedCompany?.ticker, selectedCompany?.securityDescription]
  )

  // Loading state
  if (isLoading) {
    return (
      <TableSkeletonLoader
        columnCount={8}
        rowCount={12}
        showCheckbox={true}
        showActionButtons={false}
        minTableWidth={1000}
      />
    )
  }

  // Error state
  if (error) {
    return (
      <AppErrorState
        message={error instanceof Error ? error.message : 'Failed to load universe data'}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-6 relative">
        <DataTable<UniverseTableRow>
          data={filteredUniverse}
          columns={columns}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onColumnWidthChange={handleColumnWidthChange}
          onRowSelection={handleRowSelection}
          selectedRows={selectedRows}
          minTableWidth={calculatedMinTableWidth}
          fillWidth={false}
          wrapHeaderLabels={true}
          emptyStateTitle="No companies found"
          emptyStateDescription={searchQuery ? "No companies match your search criteria." : "The universe is currently empty."}
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

        {selectedRows.size > 0 && selectedCompany && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg px-6 py-4 flex items-center justify-between gap-8 min-w-[600px]">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="font-semibold">{selectedCompany.ticker}</span>
              <span className="text-gray-500">-</span>
              <span className="text-gray-700 dark:text-gray-300">{selectedCompany.securityDescription}</span>
            </div>
            <Button
              onClick={handleMoveToWatchlist}
              className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
            >
              Move to Watchlist
            </Button>
          </div>
        )}

        {/* Move to Watchlist Modal */}
        <CompanyMoveModal
          isOpen={isMoveModalOpen}
        onClose={handleModalClose}
        mode="watchlist"
        companyData={selectedCompanyData}
        onSubmit={handleModalSubmit}
        primaryAnalysts={primaryAnalysts}
          secondaryAnalysts={secondaryAnalysts}
          isLoadingPrimaryAnalysts={isLoadingPrimaryAnalysts}
          isLoadingSecondaryAnalysts={isLoadingSecondaryAnalysts}
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
        isSubmitting={moveToWatchlistMutation?.isPending || false}
        onAttachmentsRefetch={onAttachmentsRefetch}
      />
    </div>
  )
}
