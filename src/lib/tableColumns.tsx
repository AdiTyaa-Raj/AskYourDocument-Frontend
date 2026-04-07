import React from 'react'
import { MoreVertical, Pencil, Eye, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnConfig, type TableData } from '@/components/shared/DataTable'
import {
  formatTickerWithExchange,
  getStatusIcon,
  getStatusText,
  mapCompanyIdsToTickers,
} from '@/lib/utils'
import type { MemoStatus, UIMemo } from '@/containers/memos/lib/types'
import { canViewMemo, canEditMemo } from '@/containers/memos/lib/helpers'
import type { EditableTableColumn } from '@/components/shared/editable-table'
import type { FinancialRow } from '@/containers/tearsheet/lib/type'
import { shouldShowReprocess, type ProcessingStatus } from '@/lib/processing-status-utils'
import { DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE } from '@/containers/documents/lib/constants'
import { getActionableBadgeInfo } from '@/containers/documents/lib/utils'
import {
  DocumentSourceBadge,
  DocumentStatusCell,
  DocumentActionsMenu,
} from '@/containers/documents/lib/table-helpers'
import InitialsAvatar from '@/components/shared/InitialsAvatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Type definitions for table data structures

export interface MemoTableData extends TableData, Omit<UIMemo, 'id'> {
  id: string
  actions?: unknown // Virtual column for actions dropdown
}

export interface DocumentTableData extends TableData {
  id: string
  title: string
  ticker: string
  exchange?: string
  type: string
  source?: 'template' | 'upload'
  author: string
  primary: string
  secondary: string
  date: string
  actionable: string | null
  status: 'completed' | 'pending' | 'in-progress' | 'failed'
  /** MEMO: Y/N from linked docs; upload (DOCUMENT): N/A (see DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE) */
  attachment: 'Y' | 'N' | typeof DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE
  text_extraction_status?: ProcessingStatus
  chunking_status?: ProcessingStatus
  embedding_status?: ProcessingStatus
  analysis_status?: ProcessingStatus
  strategy?: string
  can_delete?: boolean
}

export interface FinancialRowWithId extends TableData {
  id: number
  metric: string
  lastYear: string
  nextYear: string
  yearAfter: string
}

// Column configurations for Memos - returns a function to accept callbacks
export const getMemoColumns = (callbacks: {
  onEditMemo: (id: string) => void
  onViewMemo: (id: string) => void
  onReprocessMemo?: (id: string, hardReprocess?: boolean) => void
  companies?: Array<{ id: string; ticker: string; name: string }>
}): ColumnConfig<MemoTableData>[] => [
  {
    key: 'title',
    label: 'Title',
    width: 280,
    visible: true,
    sortable: true,
    formatter: (value, row) => {
      // Smart click: if editable -> edit mode, if view-only -> view mode
      const handleTitleClick = () => {
        if (canEditMemo(row.status)) {
          callbacks.onEditMemo(row.id)
        } else if (canViewMemo(row.status)) {
          callbacks.onViewMemo(row.id)
        }
      }

      return (
        <div
          className="max-w-[280px] cursor-pointer truncate text-sm font-medium text-gray-900 dark:text-gray-100"
          onClick={handleTitleClick}
        >
          {String(value)}
        </div>
      )
    },
  },
  {
    key: 'ticker',
    label: 'Ticker',
    width: 90,
    visible: true,
    formatter: (value, row) => {
      const companyIds = row.company_ids || []
      const companies = callbacks.companies || []

      // Use helper function to map IDs to tickers
      const { displayText, hasMultiple, allTickers } = mapCompanyIdsToTickers(
        companyIds,
        companies,
        String(value)
      )

      return (
        <Badge
          variant="secondary"
          className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
          title={hasMultiple ? `Companies: ${allTickers.join(', ')}` : undefined}
        >
          {displayText}
          {hasMultiple && ` +${allTickers.length - 1}`}
        </Badge>
      )
    },
  },
  {
    key: 'type',
    label: 'Type',
    width: 140,
    visible: true,
    formatter: (value) => (
      <span className="text-sm text-gray-700 dark:text-gray-300">{String(value)}</span>
    ),
  },
  {
    key: 'date',
    label: 'Date',
    width: 110,
    visible: true,
    sortable: true,
    formatter: (value) => (
      <span className="text-sm text-gray-600 dark:text-gray-400">{String(value)}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: 130,
    visible: true,
    formatter: (value) => {
      const status = value as MemoStatus
      return (
        <div className="flex items-center gap-2">
          {getStatusIcon(status)}
          <span className="text-sm text-gray-600 dark:text-gray-400">{getStatusText(status)}</span>
        </div>
      )
    },
  },
  {
    key: 'actions',
    label: 'Actions',
    width: 80,
    visible: true,
    sortable: false,
    align: 'center',
    formatter: (_, row) => {
      return (
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* View - for read-only access */}
              {canViewMemo(row.status) && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    callbacks.onViewMemo(row.id)
                  }}
                >
                  <Eye className="mr-2 size-4" />
                  View Note
                </DropdownMenuItem>
              )}

              {/* Edit - for memos that can be modified */}
              {canEditMemo(row.status) && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    callbacks.onEditMemo(row.id)
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit Note
                </DropdownMenuItem>
              )}

              {/* Reprocess - for memos with incomplete processing statuses */}
              {callbacks.onReprocessMemo && shouldShowReprocess(row) && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    callbacks.onReprocessMemo?.(row.id, false)
                  }}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Reprocess
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]

// Document Columns Configuration
export const getDocumentColumns = (callbacks: {
  onDocumentClick: (id: string) => void
  onDocumentClickWithAutoDownload?: (id: string) => void
  onDownload?: (id: string) => void
  onReprocessDocument?: (id: string, hardReprocess?: boolean) => void
  onPublish?: (id: string) => void
  onDelete?: (id: string) => void
}): ColumnConfig<DocumentTableData>[] => [
  {
    key: 'title',
    label: 'Title',
    width: 280,
    visible: true,
    sortable: true,
    formatter: (value) => (
      <div className="max-w-[280px] truncate text-sm font-medium text-gray-900 dark:text-gray-100">
        {String(value)}
      </div>
    ),
  },
  {
    key: 'ticker',
    label: 'Ticker',
    width: 150,
    visible: true,
    formatter: (value, row) => (
      <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        {formatTickerWithExchange(String(value ?? ''), row.exchange)}
      </span>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    width: 240,
    visible: true,
    formatter: (value) => (
      <div className="truncate text-sm text-gray-700 dark:text-gray-300" title={String(value)}>
        {String(value)}
      </div>
    ),
  },
  {
    key: 'source',
    label: 'Source',
    width: 100,
    visible: true,
    formatter: (value) => (
      <DocumentSourceBadge source={value as 'template' | 'upload' | undefined} />
    ),
  },
  {
    key: 'author',
    label: 'Author',
    width: 100,
    visible: true,
    formatter: (value) => {
      const name = value ? String(value) : 'Unknown'
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block cursor-pointer">
                <InitialsAvatar name={name} className="size-6" textClassName="text-[10px]" />
              </span>
            </TooltipTrigger>

            <TooltipContent
              side="top"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md"
            >
              {name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },
  {
    key: 'date',
    label: 'Date',
    width: 130,
    visible: true,
    sortable: true,
    formatter: (value) => (
      <span className="text-sm text-gray-600 dark:text-gray-400">{String(value)}</span>
    ),
  },
  {
    key: 'actionable',
    label: 'Actionable',
    width: 110,
    visible: false, // Hidden in the new UI design
    formatter: (value, row) => {
      const { isActionable, displayText } = getActionableBadgeInfo(row.actionable)

      return (
        <span
          className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${
            isActionable
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {displayText}
        </span>
      )
    },
  },
  {
    key: 'status',
    label: 'Status',
    width: 90,
    visible: true,
    formatter: (value, row) => (
      <DocumentStatusCell
        status={row.status}
        chunkingStatus={row.chunking_status}
        embeddingStatus={row.embedding_status}
        analysisStatus={row.analysis_status}
      />
    ),
  },
  {
    key: 'attachment',
    label: 'Attachment',
    width: 128,
    visible: true,
    align: 'center',
    sortable: true,
    formatter: (value) => {
      const raw = String(value ?? '')
      const display = raw === 'NA' ? DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE : raw
      return (
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{display}</span>
      )
    },
  },
  {
    key: 'actions',
    label: 'Actions',
    width: 80,
    visible: true,
    sortable: false,
    align: 'center',
    formatter: (_, row) => (
      <div
        className="flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DocumentActionsMenu
          documentId={row.id}
          status={row.status}
          source={row.source}
          chunkingStatus={row.chunking_status}
          embeddingStatus={row.embedding_status}
          analysisStatus={row.analysis_status}
          canDelete={row.can_delete}
          onDocumentClick={callbacks.onDocumentClick}
          onDocumentClickWithAutoDownload={callbacks.onDocumentClickWithAutoDownload}
          onDownload={callbacks.onDownload}
          onReprocessDocument={callbacks.onReprocessDocument}
          onPublish={callbacks.onPublish}
          onDelete={callbacks.onDelete}
        />
      </div>
    ),
  },
]

// Financial table column configurations
export const getFinancialColumns = (callbacks: {
  isEditing: boolean
  handleCellChange: (
    rowIndex: number,
    field: 'lastYear' | 'nextYear' | 'yearAfter',
    value: string
  ) => void
}): ColumnConfig<FinancialRowWithId>[] => [
  {
    key: 'metric',
    label: '',
    width: 140,
    visible: true,
    align: 'left',
    sortable: false,
    formatter: (value) => (
      <span className="text-sm font-medium text-gray-900">{String(value)}</span>
    ),
  },
  {
    key: 'lastYear',
    label: (
      <div className="text-center">
        <div className="text-xs font-medium text-gray-900">Last Year</div>
        <div className="text-xs text-gray-500">(Actuals)</div>
      </div>
    ),
    width: 80,
    visible: true,
    align: 'center',
    sortable: false,
    formatter: (value, row) => (
      <>
        {callbacks.isEditing ? (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => callbacks.handleCellChange(row.id, 'lastYear', e.target.value)}
            className="w-full border-0 bg-transparent text-center text-sm text-gray-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
          />
        ) : (
          <span className="text-sm text-gray-900">{String(value)}</span>
        )}
      </>
    ),
  },
  {
    key: 'nextYear',
    label: (
      <div className="text-center">
        <div className="text-xs font-medium text-gray-900">Next Year</div>
        <div className="text-xs text-gray-500">(Estimates)</div>
      </div>
    ),
    width: 80,
    visible: true,
    align: 'center',
    sortable: false,
    headerClassName: 'bg-cyan-50',
    formatter: (value, row) => (
      <div className="-mx-2 -my-1 bg-cyan-50 px-2 py-2">
        {callbacks.isEditing ? (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => callbacks.handleCellChange(row.id, 'nextYear', e.target.value)}
            className="w-full border-0 bg-transparent text-center text-sm text-gray-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
          />
        ) : (
          <span className="text-sm text-gray-900">{String(value)}</span>
        )}
      </div>
    ),
  },
  {
    key: 'yearAfter',
    label: (
      <div className="text-center">
        <div className="text-xs font-medium text-gray-900">Year After</div>
        <div className="text-xs text-gray-500">(Estimates)</div>
      </div>
    ),
    width: 80,
    visible: true,
    align: 'center',
    sortable: false,
    formatter: (value, row) => (
      <>
        {callbacks.isEditing ? (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => callbacks.handleCellChange(row.id, 'yearAfter', e.target.value)}
            className="w-full border-0 bg-transparent text-center text-sm text-gray-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
          />
        ) : (
          <span className="text-sm text-gray-900">{String(value)}</span>
        )}
      </>
    ),
  },
]

// Financial Editable Table Columns Configuration
export const getFinancialEditableColumns = (): EditableTableColumn<FinancialRow>[] => [
  {
    key: 'metric',
    header: '',
    align: 'left',
    readOnly: true,
    width: '140px',
  },
  {
    key: 'lastYear',
    header: (
      <div className="text-center">
        <div className="text-xs font-medium text-gray-900">Last Year</div>
        <div className="text-xs text-gray-500">(Actuals)</div>
      </div>
    ),
    align: 'center',
    width: '80px',
  },
  {
    key: 'nextYear',
    header: (
      <div className="text-center">
        <div className="text-xs font-medium text-gray-900">Next Year</div>
        <div className="text-xs text-gray-500">(Estimates)</div>
      </div>
    ),
    align: 'center',
    width: '80px',
    headerClassName: 'bg-cyan-50',
    cellClassName: 'bg-cyan-50',
  },
  {
    key: 'yearAfter',
    header: (
      <div className="text-center">
        <div className="text-xs font-medium text-gray-900">Year After</div>
        <div className="text-xs text-gray-500">(Estimates)</div>
      </div>
    ),
    align: 'center',
    width: '80px',
  },
]
