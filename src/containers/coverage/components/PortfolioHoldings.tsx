'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { DataTable, ColumnConfig, type SortConfig } from '@/components/shared/DataTable'
import { TableSkeletonLoader } from '@/components/shared/table-skeleton-loader'
import { generatePortfolioHoldingsColumns } from '@/containers/coverage/lib/dynamic-columns'
import type {
  PortfolioHoldingsTableData,
  PortfolioHoldingsTableRow,
  PortfolioHoldingsProps,
} from '@/containers/coverage/lib/types'
import { AppErrorState } from '@/components/shared/AppFeedbackState'
import { searchPortfolioHoldings } from '@/containers/coverage/lib/search-filter-helpers'
import { getCalculatedMinTableWidth } from '@/containers/coverage/lib/dynamic-columns'
import { openAnalystAssignmentModalFromRow } from '@/containers/coverage/lib/helper'

export function PortfolioHoldings({ 
  data: portfolioData, 
  totalCount,
  isLoading, 
  error, 
  refetch, 
  searchQuery = '',
  onOpenAnalystAssignmentModal,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PortfolioHoldingsProps) {
  const [columns, setColumns] = useState<ColumnConfig<PortfolioHoldingsTableRow>[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })

  const handleAnalystCellClick = useCallback(
    (row: PortfolioHoldingsTableData) => {
      openAnalystAssignmentModalFromRow(onOpenAnalystAssignmentModal, {
        id: row.id,
        ticker: row.ticker,
        name: row.companyName,
        stageAssignmentId: row.stageAssignmentId,
        primaryAnalystId: row.primaryAnalystId,
        secondaryAnalystId: row.secondaryAnalystId,
      })
    },
    [onOpenAnalystAssignmentModal]
  )
  const analystCellClickHandler = onOpenAnalystAssignmentModal ? handleAnalystCellClick : undefined

  // Generate dynamic columns when data changes
  useEffect(() => {
    const generatedColumns = generatePortfolioHoldingsColumns(
      portfolioData,
      analystCellClickHandler
    )
    setColumns(generatedColumns)
  }, [portfolioData, analystCellClickHandler])

  const calculatedMinTableWidth = useMemo(
    () => getCalculatedMinTableWidth(columns, 800),
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

  const handleSortChange = (config: SortConfig) => {
    setSortConfig(config)
  }

  // Apply global search and sort
  const filteredPortfolioData = useMemo(() => {
    return searchPortfolioHoldings(portfolioData, searchQuery, sortConfig)
  }, [portfolioData, searchQuery, sortConfig])

  // Loading state
  if (isLoading) {
    return (
      <TableSkeletonLoader
        columnCount={5}
        rowCount={12}
        showCheckbox={false}
        showActionButtons={false}
        minTableWidth={800}
      />
    )
  }

  // Error state
  if (error) {
    return (
      <AppErrorState
        message={error instanceof Error ? error.message : 'Failed to load portfolio holdings'}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-6">
      <DataTable<PortfolioHoldingsTableRow>
        data={filteredPortfolioData}
        columns={columns}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onColumnWidthChange={handleColumnWidthChange}
        onRowSelection={handleRowSelection}
        selectedRows={selectedRows}
        minTableWidth={calculatedMinTableWidth}
        wrapHeaderLabels={true}
        emptyStateTitle="No portfolio holdings found"
        emptyStateDescription={searchQuery ? "No holdings match your search criteria." : "Your portfolio is currently empty."}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        showColumnsOnEmpty={false}
        totalCount={totalCount}
        // fillWidth={false}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        paginationMode="server"
      />
    </div>
  )
}
