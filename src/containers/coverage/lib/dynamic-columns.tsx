import React from 'react'
import Link from 'next/link'

import { ColumnConfig, type TableData } from '@/components/shared/DataTable'
import { formatValue } from '@/lib/utils'
import { formatLabel } from './queries'

// Import and re-export types so they can be imported from this module
export type {
  UniverseTableData,
  PortfolioHoldingsTableData,
  WatchListTableData,
} from './types'
import type {
  UniverseTableData,
  PortfolioHoldingsTableData,
  WatchListTableData,
} from './types'

/**
 * Calculate minimum table width from column widths (for coverage DataTables).
 * Returns sum(column widths) + padding. No minimum width to ensure consistent column sizing.
 */
export function getCalculatedMinTableWidth(
  columns: { width: number }[],
  minWidth: number = 0
): number {
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0)
  // Add padding for scrollbar and borders
  return Math.max(minWidth, totalWidth + 50)
}

/** Row shape required for analyst PA/SA cell clickability in coverage tables */
export type AnalystCellClickableRow = {
  stageAssignmentId?: number
}

/**
 * Whether a PA/SA analyst cell should render as a button (opens assignment modal when handler is set).
 */
export function isAnalystCellClickable<T extends AnalystCellClickableRow>(
  row: T,
  onAnalystCellClick?: (row: T) => void
): boolean {
  return Boolean(row.stageAssignmentId && onAnalystCellClick)
}

/**
 * Click handler for analyst cells: stops row propagation and invokes the modal callback.
 * Reusable for primary/secondary analyst columns in portfolio and watchlist tables.
 */
export function createAnalystCellClickHandler<T extends AnalystCellClickableRow>(
  row: T,
  onAnalystCellClick?: (row: T) => void
): React.MouseEventHandler<HTMLButtonElement> {
  return (event) => {
    event.stopPropagation()
    onAnalystCellClick?.(row)
  }
}

/**
 * Dynamically generate universe columns based on the first data entry
 */
export function generateUniverseColumns<T extends TableData = UniverseTableData>(
  data?: T[]
): ColumnConfig<T>[] {
  const baseColumns: ColumnConfig<T>[] = [
    { key: 'checkbox', label: '', width: 30, visible: true, align: 'center', sortable: false },
    {
      key: 'ticker',
      label: 'Ticker',
      width: 100,
      visible: true,
      align: 'left',
      title: 'Ticker Symbol',
      formatter: (value) => {
        const ticker = String(value ?? '')
        return <span className="truncate font-semibold text-gray-900">{ticker}</span>
      },
    },
    {
      key: 'securityDescription',
      label: 'Security Description',
      width: 300,
      visible: true,
      align: 'left',
      title: 'Company Name',
      formatter: (value) => {
        const text = String(value ?? '')
        return (
          <div className="truncate" title={text}>
            {text}
          </div>
        )
      },
    },
  ]

  // If no data, return just base columns
  if (!data || data.length === 0) {
    return baseColumns
  }

  // Get meta keys from the first entry, excluding base fields
  const firstEntry = data[0]
  const excludedKeys = ['id', 'ticker', 'securityDescription', 'requiredAttachments', 'checkbox']
  const metaKeys = Object.keys(firstEntry).filter((key) => !excludedKeys.includes(key))

  // Generate dynamic columns for meta fields
  const dynamicColumns: ColumnConfig<T>[] = metaKeys.map((key) => {
    const width = 130

    return {
      key,
      label: formatLabel(key),
      width,
      visible: true,
      align: 'left',
      title: formatLabel(key),
      formatter: (value) => {
        const formatted = formatValue(key, value)
        if (typeof formatted === 'string') {
          return (
            <div className="truncate" title={formatted}>
              {formatted}
            </div>
          )
        }
        return formatted
      },
    }
  })

  return [...baseColumns, ...dynamicColumns]
}

// Deprecated: Keep for backward compatibility but should use generateUniverseColumns
export const universeColumns: ColumnConfig<UniverseTableData>[] = []

/**
 * Dynamically generate portfolio holdings columns based on the first data entry
 */
export function generatePortfolioHoldingsColumns(
  data?: PortfolioHoldingsTableData[],
  onAnalystCellClick?: (row: PortfolioHoldingsTableData) => void
): ColumnConfig<PortfolioHoldingsTableData>[] {
  const baseColumns: ColumnConfig<PortfolioHoldingsTableData>[] = [
    {
      key: 'ticker',
      label: 'Ticker',
      width: 100,
      visible: true,
      align: 'left',
      title: 'Ticker Symbol',
      formatter: (value, row) => {
        const ticker = String(value ?? '')
        const href = row.id !== undefined && row.id !== null ? `/tearsheet/${row.id}` : null
        if (!href) {
          return <span className="truncate font-semibold text-gray-900">{ticker}</span>
        }
        return (
          <Link
            href={href}
            prefetch={false}
            className="inline-flex w-full truncate text-left font-semibold text-gray-900 transition-colors hover:text-blue-600 hover:underline"
            aria-label={`Open ${ticker} tearsheet`}
          >
            {ticker}
          </Link>
        )
      },
    },
    {
      key: 'companyName',
      label: 'Security Description',
      width: 200,
      visible: true,
      align: 'left',
      title: 'Company Name',
      formatter: (value, row) => {
        const text = String(value ?? '')
        const content = (
          <div className="truncate" title={text}>
            {text}
          </div>
        )
        const href = row.id !== undefined && row.id !== null ? `/tearsheet/${row.id}` : null
        return href ? (
          <Link
            href={href}
            prefetch={false}
            className="block text-gray-700 transition-colors hover:text-blue-600 hover:underline"
            aria-label={`Open ${text} tearsheet`}
          >
            {content}
          </Link>
        ) : (
          content
        )
      },
    },
    {
      key: 'primaryAnalyst',
      label: 'PA',
      width: 60,
      visible: true,
      align: 'left',
      title: 'Primary Analyst',
      formatter: (value, row) => {
        const valueText = value === null || value === undefined ? '' : String(value).trim()
        const initials = valueText || '—'
        const fullName = row.primaryAnalystName ? String(row.primaryAnalystName) : ''
        if (!isAnalystCellClickable(row, onAnalystCellClick)) {
          return (
            <span className="text-sm font-medium text-gray-900" title={fullName || initials}>
              {initials}
            </span>
          )
        }
        return (
          <button
            type="button"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
            title={fullName || initials}
            onClick={createAnalystCellClickHandler(row, onAnalystCellClick)}
          >
            {initials}
          </button>
        )
      },
    },
    {
      key: 'secondaryAnalyst',
      label: 'SA',
      width: 60,
      visible: true,
      align: 'left',
      title: 'Secondary Analyst',
      formatter: (value, row) => {
        const valueText = value === null || value === undefined ? '' : String(value).trim()
        const initials = valueText || '—'
        const fullName = row.secondaryAnalystName ? String(row.secondaryAnalystName) : ''
        if (!isAnalystCellClickable(row, onAnalystCellClick)) {
          return (
            <span className="text-sm font-medium text-gray-900" title={fullName || initials}>
              {initials}
            </span>
          )
        }
        return (
          <button
            type="button"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
            title={fullName || initials}
            onClick={createAnalystCellClickHandler(row, onAnalystCellClick)}
          >
            {initials}
          </button>
        )
      },
    },
  ]

  // If no data, return just base columns
  if (!data || data.length === 0) {
    return baseColumns
  }

  // Get meta keys from the first entry, excluding base fields
  const firstEntry = data[0]
  const excludedKeys = [
    'id',
    'ticker',
    'companyName',
    'primaryAnalyst',
    'primaryAnalystName',
    'primaryAnalystId',
    'secondaryAnalyst',
    'secondaryAnalystName',
    'secondaryAnalystId',
    'stageAssignmentId',
    'canAssignAnalysts',
    'requiredAttachments',
    'checkbox',
  ]
  const metaKeys = Object.keys(firstEntry).filter((key) => !excludedKeys.includes(key))

  // Generate dynamic columns for meta fields
  const dynamicColumns: ColumnConfig<PortfolioHoldingsTableData>[] = metaKeys.map((key) => {
    const width = 130

    return {
      key,
      label: formatLabel(key),
      width,
      visible: true,
      align: 'left',
      title: formatLabel(key),
      formatter: (value) => {
        const formatted = formatValue(key, value)
        if (typeof formatted === 'string') {
          return (
            <div className="truncate" title={formatted}>
              {formatted}
            </div>
          )
        }
        return formatted
      },
    }
  })

  return [...baseColumns, ...dynamicColumns]
}

// Deprecated: Keep for backward compatibility but should use generatePortfolioHoldingsColumns
export const portfolioHoldingsColumns: ColumnConfig<PortfolioHoldingsTableData>[] = []

/**
 * Dynamically generate watchlist columns based on the first data entry.
 * When onAnalystCellClick is provided and row has stageAssignmentId, PA/SA cells are clickable to open the analyst assignment modal (assign or change).
 */
export function generateWatchListColumns(
  data?: WatchListTableData[],
  onAnalystCellClick?: (row: WatchListTableData) => void
): ColumnConfig<WatchListTableData>[] {
  const baseColumns: ColumnConfig<WatchListTableData>[] = [
    { key: 'checkbox', label: '', width: 30, visible: true, align: 'center', sortable: false },
    {
      key: 'ticker',
      label: 'Ticker',
      width: 100,
      visible: true,
      align: 'left',
      title: 'Ticker Symbol',
      formatter: (value, row) => {
        const ticker = String(value ?? '')
        const href = row.id !== undefined && row.id !== null ? `/tearsheet/${row.id}` : null
        if (!href) {
          return <span className="truncate font-semibold text-gray-900">{ticker}</span>
        }
        return (
          <Link
            href={href}
            prefetch={false}
            className="inline-flex w-full truncate text-left font-semibold text-gray-900 transition-colors hover:text-blue-600 hover:underline"
            aria-label={`Open ${ticker} tearsheet`}
          >
            {ticker}
          </Link>
        )
      },
    },
    {
      key: 'securityDescription',
      label: 'Security Description',
      width: 200,
      visible: true,
      align: 'left',
      title: 'Company Name',
      formatter: (value, row) => {
        const text = String(value ?? '')
        const content = (
          <div className="truncate" title={text}>
            {text}
          </div>
        )
        const href = row.id !== undefined && row.id !== null ? `/tearsheet/${row.id}` : null
        return href ? (
          <Link
            href={href}
            prefetch={false}
            className="block text-gray-700 transition-colors hover:text-blue-600 hover:underline"
            aria-label={`Open ${text} tearsheet`}
          >
            {content}
          </Link>
        ) : (
          content
        )
      },
    },
    {
      key: 'primaryAnalyst',
      label: 'PA',
      width: 60,
      visible: true,
      align: 'left',
      title: 'Primary Analyst',
      formatter: (value, row) => {
        const valueText = value === null || value === undefined ? '' : String(value).trim()
        const initials = valueText || '—'
        const fullName = row.primaryAnalystName ? String(row.primaryAnalystName) : ''
        if (!isAnalystCellClickable(row, onAnalystCellClick)) {
          return (
            <span className="text-sm font-medium text-gray-900" title={fullName || initials}>
              {initials}
            </span>
          )
        }
        return (
          <button
            type="button"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
            title={fullName || initials}
            onClick={createAnalystCellClickHandler(row, onAnalystCellClick)}
          >
            {initials}
          </button>
        )
      },
    },
    {
      key: 'secondaryAnalyst',
      label: 'SA',
      width: 60,
      visible: true,
      align: 'left',
      title: 'Secondary Analyst',
      formatter: (value, row) => {
        const valueText = value === null || value === undefined ? '' : String(value).trim()
        const initials = valueText || '—'
        const fullName = row.secondaryAnalystName ? String(row.secondaryAnalystName) : ''
        if (!isAnalystCellClickable(row, onAnalystCellClick)) {
          return (
            <span className="text-sm font-medium text-gray-900" title={fullName || initials}>
              {initials}
            </span>
          )
        }
        return (
          <button
            type="button"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
            title={fullName || initials}
            onClick={createAnalystCellClickHandler(row, onAnalystCellClick)}
          >
            {initials}
          </button>
        )
      },
    },
  ]

  // If no data, return just base columns
  if (!data || data.length === 0) {
    return baseColumns
  }

  // Get meta keys from the first entry, excluding base fields
  const firstEntry = data[0]
  const excludedKeys = [
    'id',
    'ticker',
    'securityDescription',
    'primaryAnalyst',
    'primaryAnalystName',
    'primaryAnalystId',
    'secondaryAnalyst',
    'secondaryAnalystName',
    'secondaryAnalystId',
    'stageAssignmentId',
    'canAssignAnalysts',
    'requiredAttachments',
    'checkbox',
  ]
  const metaKeys = Object.keys(firstEntry).filter((key) => !excludedKeys.includes(key))

  // Generate dynamic columns for meta fields
  const dynamicColumns: ColumnConfig<WatchListTableData>[] = metaKeys.map((key) => {
    const width = 130

    return {
      key,
      label: formatLabel(key),
      width,
      visible: true,
      align: 'left',
      title: formatLabel(key),
      formatter: (value) => {
        const formatted = formatValue(key, value)
        if (typeof formatted === 'string') {
          return (
            <div className="truncate" title={formatted}>
              {formatted}
            </div>
          )
        }
        return formatted
      },
    }
  })

  return [...baseColumns, ...dynamicColumns]
}

// Deprecated: Keep for backward compatibility but should use generateWatchListColumns
export const watchListColumns: ColumnConfig<WatchListTableData>[] = []
