'use client'

import React, { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import type { ApiDocument } from '@/containers/documents/lib/types'
import {
  formatLabel,
  renderValue,
  formatDocumentDate,
} from '@/containers/documents/lib/document-helpers'
import { formatTickerWithExchange } from '@/lib/utils'

interface DocumentPublishedPreviewProps {
  document: ApiDocument
}

export function DocumentPublishedPreview({ document }: DocumentPublishedPreviewProps) {
  const companyName = document.primary_company_details?.name || 'Unknown Company'
  const ticker = document.primary_company_details?.ticker || ''
  const exchange = document.primary_company_details?.exchange
  const tickerLabel = formatTickerWithExchange(ticker, exchange)

  const date = useMemo(() => formatDocumentDate(document), [document])

  // Generate all document data for display
  const allDocumentData = useMemo(() => {
    const data: Record<string, unknown> = {}

    // Add template_data fields, excluding maintenance task fields
    const templateData = document.template_data || {}
    Object.entries(templateData).forEach(([key, value]) => {
      if (!key.toLowerCase().includes('maintenance_task')) {
        data[key] = value
      }
    })

    // Map document fields to display labels
    const fieldMap: Record<string, unknown> = {
      Description: document.description,
      Category: document.category,
      'Content Type': document.content_type,
      Status: document.status,
      Actionable: document.actionable,
      'Primary Company': document.primary_company_details,
      'Related Companies': document.company_details?.length ? document.company_details : undefined,
      'Created By': document.user_details,
      'Created At': document.created_at,
      'Updated At': document.updated_at,
      'Published At': document.published_at,
      'Document ID': document.id,
      'Primary Company ID': document.primary_company_id,
      'Company IDs': document.company_ids?.length ? document.company_ids : undefined,
    }

    Object.entries(fieldMap).forEach(([label, value]) => {
      if (value !== undefined && value !== null) {
        data[label] = value
      }
    })

    return data
  }, [document])

  return (
    <div className="flex h-full flex-col overflow-auto bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-4xl rounded-lg bg-white p-8 shadow-sm dark:bg-gray-800">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {tickerLabel && (
                <Badge variant="secondary" className="text-xs">
                  {tickerLabel}
                </Badge>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">{date}</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {document.title || document.category}
            </h1>
            <p className="text-base text-gray-700 dark:text-gray-300">{companyName}</p>
          </div>

          {/* Body */}
          <div className="space-y-6">
            {Object.keys(allDocumentData).length > 0 ? (
              Object.entries(allDocumentData).map(([key, value]) => (
                <div key={key}>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatLabel(key)}
                  </h3>
                  <div className="mt-2">{renderValue(value)}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No data available for this document.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
