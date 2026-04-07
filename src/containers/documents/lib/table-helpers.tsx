import React from 'react'
import {
  FileText,
  CheckCircle,
  Download,
  RefreshCw,
  MoreVertical,
  Upload,
  FileBadge,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DocumentStatus } from './types'
import type { ProcessingStatus } from '@/lib/processing-status-utils'
import { getDocumentFailureMessage, getAIProcessingStatus } from './utils'
import { getAIIconWithTooltip } from './document-helpers'

export const DocumentSourceBadge: React.FC<{
  source: 'template' | 'upload' | undefined
}> = ({ source }) => {
  if (!source) return <span className="text-xs text-gray-400">—</span>

  if (source === 'template') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
        <FileBadge className="size-3.5" strokeWidth={2} />
        Template
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      <Upload className="size-3.5" strokeWidth={2} />
      Upload
    </span>
  )
}

/**
 * Document Status Cell Component
 * Displays document processing status with AI processing indicators
 */
export const DocumentStatusCell: React.FC<{
  status: DocumentStatus
  chunkingStatus?: ProcessingStatus
  embeddingStatus?: ProcessingStatus
  analysisStatus?: ProcessingStatus
}> = ({ status, chunkingStatus, embeddingStatus, analysisStatus }) => {
  const aiStatus = getAIProcessingStatus(chunkingStatus, embeddingStatus, analysisStatus)
  const isPublished = status === 'completed'
  const failureMessage = getDocumentFailureMessage({
    chunking_status: chunkingStatus,
    embedding_status: embeddingStatus,
    analysis_status: analysisStatus,
  })

  const aiIcon = getAIIconWithTooltip({ aiStatus, isPublished })

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-1.5" title="Published">
        <CheckCircle
          className="size-5 text-green-500"
          strokeWidth={2.5}
          fill="currentColor"
          fillOpacity={0.1}
        />
        {aiIcon}
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-1.5" title="Draft">
        <FileText className="size-5 text-gray-400" strokeWidth={2} />
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-1.5" title={failureMessage ?? 'Failed'}>
        <FileText className="size-5 text-gray-400" strokeWidth={2} />
      </div>
    )
  }

  if (status === 'in-progress') {
    return (
      <div className="flex items-center gap-1.5" title="Processing">
        <div className="size-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5" title="Draft">
      <FileText className="size-5 text-gray-400" strokeWidth={2} />
    </div>
  )
}

/**
 * Document Actions Menu Component
 * Dropdown menu with context-specific actions (Download, Reprocess, Retry AI, Publish)
 */
export const DocumentActionsMenu: React.FC<{
  documentId: string
  status: DocumentStatus
  source?: 'template' | 'upload'
  chunkingStatus?: ProcessingStatus
  embeddingStatus?: ProcessingStatus
  analysisStatus?: ProcessingStatus
  canDelete?: boolean
  onDocumentClick: (id: string) => void
  onDocumentClickWithAutoDownload?: (id: string) => void
  onDownload?: (id: string) => void
  onReprocessDocument?: (id: string, hardReprocess?: boolean) => void
  onPublish?: (id: string) => void
  onDelete?: (id: string) => void
}> = ({
  documentId,
  status,
  source,
  chunkingStatus,
  embeddingStatus,
  analysisStatus,
  canDelete,
  onDocumentClick,
  onDocumentClickWithAutoDownload,
  onDownload,
  onReprocessDocument,
  onPublish,
  onDelete,
}) => {
  const isDraft = status === 'pending'
  const isPublished = status === 'completed'
  const hasAIFailure = [chunkingStatus, embeddingStatus, analysisStatus].some((s) => s === 'FAILED')
  const showRetryAI = isPublished && hasAIFailure && !!onReprocessDocument

  const handleDownload = () => {
    if (source === 'upload' && onDownload) {
      onDownload(documentId)
    } else if (source === 'template' && onDocumentClickWithAutoDownload) {
      onDocumentClickWithAutoDownload(documentId)
    } else {
      onDocumentClick(documentId)
    }
  }

  const menuItems = [
    {
      label: 'Download',
      icon: Download,
      onClick: handleDownload,
      show: !isDraft,
    },
    {
      label: 'Retry AI Analysis',
      icon: RefreshCw,
      onClick: () => onReprocessDocument?.(documentId, false),
      show: showRetryAI,
    },
    {
      label: 'Edit',
      icon: FileText,
      onClick: () => onPublish?.(documentId),
      show: isDraft && !!onPublish,
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => onDelete?.(documentId),
      show: Boolean(canDelete && onDelete),
    },
  ]

  return (
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
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenuItem
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation()
                  item.onClick()
                }}
              >
                <Icon className="mr-2 size-4" />
                {item.label}
              </DropdownMenuItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
