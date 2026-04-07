import React from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { DocumentXlsxPreviewProps } from '@/containers/documents/lib/preview-types'
import { Button } from '@/components/ui/button'
import '@/styles/xlsx-preview.css'

export function DocumentXlsxPreview({ sheets, isLoading, error }: DocumentXlsxPreviewProps) {
  const [activeSheetIndex, setActiveSheetIndex] = React.useState(0)

  React.useEffect(() => {
    setActiveSheetIndex(0)
  }, [sheets])

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-blue-600" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            Preparing spreadsheet…
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Parsing the first sheet for inline preview
          </p>
        </div>
      </div>
    )
  }

  if (error || !sheets || sheets.length === 0) {
    return (
      <div className="flex min-h-[600px] items-center justify-center p-12">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-yellow-500" />
          <p className="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
            {error || 'Spreadsheet preview unavailable'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We couldn’t parse this spreadsheet for inline viewing. Please download to view.
          </p>
        </div>
      </div>
    )
  }

  const activeSheet = sheets[activeSheetIndex]

  return (
    <div className="space-y-4 p-6">
      {sheets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sheets.map((sheet, index) => (
            <Button
              key={`${sheet.name}-${index}`}
              type="button"
              size="sm"
              variant={index === activeSheetIndex ? 'default' : 'outline'}
              className="rounded-full px-4 text-sm font-medium"
              onClick={() => setActiveSheetIndex(index)}
            >
              {sheet.name || `Sheet ${index + 1}`}
              <span className="text-muted-foreground ml-2 text-xs">
                {sheet.meta.totalRows} rows
              </span>
            </Button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 text-sm dark:border-gray-800">
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {activeSheet.name || `Sheet ${activeSheetIndex + 1}`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing first {activeSheet.meta.visibleRows} rows (of {activeSheet.meta.totalRows})
              and up to {activeSheet.meta.visibleColumns} columns. Download to explore the remaining
              data.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
              {activeSheet.meta.totalRows} rows
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">
              {activeSheet.meta.totalColumns} columns
            </span>
          </div>
        </div>

        <div className="xlsx-html-wrapper max-h-[70vh] overflow-auto">
          <div
            className="xlsx-html-content"
            dangerouslySetInnerHTML={{ __html: activeSheet.html }}
          />
        </div>
      </div>
    </div>
  )
}
