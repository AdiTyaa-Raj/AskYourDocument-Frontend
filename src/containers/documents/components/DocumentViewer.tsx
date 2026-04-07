'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { FileText, AlertCircle, Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentPdfPreview } from './DocumentPdfPreview'
import { DocumentDocxPreview } from './DocumentDocxPreview'
import { DocumentXlsxPreview } from './DocumentXlsxPreview'
import '@/styles/docx-preview.css'
import type { DocumentViewerProps, ParsedXlsxSheet } from '@/containers/documents/lib/types'
import { getDocumentFileType, parseWorkbookSheets } from '@/containers/documents/lib/utils'

export function DocumentViewer({
  filename,
  mimeType,
  extractedText,
  textExtractionStatus,
  fileUrlData,
  isLoadingFileUrl = false,
}: DocumentViewerProps) {
  const [textZoom, setTextZoom] = useState(100)
  const [pdfZoom, setPdfZoom] = useState(100)
  const [viewMode, setViewMode] = useState<'preview' | 'text'>('preview')
  const [imageLoadError, setImageLoadError] = useState(false)

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null)
  const [docxError, setDocxError] = useState<string | null>(null)
  const [xlsxSheets, setXlsxSheets] = useState<ParsedXlsxSheet[] | null>(null)
  const [xlsxError, setXlsxError] = useState<string | null>(null)
  const [isFetchingPdf, setIsFetchingPdf] = useState(false)
  const [isFetchingDocx, setIsFetchingDocx] = useState(false)
  const [isFetchingXlsx, setIsFetchingXlsx] = useState(false)

  const fileUrl = fileUrlData?.file_url
  const fileType = useMemo(() => getDocumentFileType(mimeType, filename), [mimeType, filename])

  const isPDF = fileType === 'pdf'
  const isDocx = fileType === 'docx'
  const isXlsx = fileType === 'xlsx'
  const isImage = fileType === 'image'
  const hasExtractedText = extractedText && extractedText.length > 0

  useEffect(() => {
    setTextZoom(100)
  }, [fileUrl, fileType])

  useEffect(() => {
    setPdfZoom(100)
  }, [fileUrl, isPDF])

  useEffect(() => {
    setImageLoadError(false)
  }, [fileUrl])

  useEffect(() => {
    if (!isPDF || !fileUrl) {
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPdfError(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    const fetchPdf = async () => {
      setIsFetchingPdf(true)
      setPdfError(null)
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`)
        const buffer = await response.arrayBuffer()
        if (cancelled) return
        objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
        setPdfBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return objectUrl
        })
      } catch (err) {
        console.error('PDF preview error:', err)
        if (!cancelled) setPdfError('Unable to render PDF preview.')
      } finally {
        if (!cancelled) setIsFetchingPdf(false)
      }
    }

    fetchPdf()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileUrl, isPDF])

  useEffect(() => {
    if (!isDocx || !fileUrl) {
      setDocxBuffer(null)
      setDocxError(null)
      return
    }

    let cancelled = false
    const fetchDocx = async () => {
      setIsFetchingDocx(true)
      setDocxError(null)
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error(`Failed to fetch DOCX: ${response.statusText}`)
        const buffer = await response.arrayBuffer()
        if (cancelled) return
        setDocxBuffer(buffer)
      } catch (err) {
        console.error('DOCX preview error:', err)
        if (!cancelled) setDocxError('Unable to render DOCX preview.')
      } finally {
        if (!cancelled) setIsFetchingDocx(false)
      }
    }

    fetchDocx()

    return () => {
      cancelled = true
    }
  }, [fileUrl, isDocx])

  useEffect(() => {
    if (!isXlsx || !fileUrl) {
      setXlsxSheets(null)
      setXlsxError(null)
      return
    }

    let cancelled = false
    const fetchXlsx = async () => {
      setIsFetchingXlsx(true)
      setXlsxError(null)
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error(`Failed to fetch XLSX: ${response.statusText}`)
        const buffer = await response.arrayBuffer()
        if (cancelled) return
        const sheets = parseWorkbookSheets(buffer)
        setXlsxSheets(sheets)
      } catch (err) {
        console.error('XLSX preview error:', err)
        if (!cancelled) setXlsxError('Unable to render spreadsheet preview.')
      } finally {
        if (!cancelled) setIsFetchingXlsx(false)
      }
    }

    fetchXlsx()

    return () => {
      cancelled = true
    }
  }, [fileUrl, isXlsx])

  const handleTextZoomIn = () => setTextZoom((prev) => Math.min(prev + 10, 200))
  const handleTextZoomOut = () => setTextZoom((prev) => Math.max(prev - 10, 50))
  const handlePdfZoomIn = () => setPdfZoom((prev) => Math.min(prev + 10, 200))
  const handlePdfZoomOut = () => setPdfZoom((prev) => Math.max(prev - 10, 50))

  const normalizedStatus = textExtractionStatus?.toUpperCase() || ''
  const isPending = normalizedStatus === 'PENDING' || normalizedStatus === 'PROCESSING'
  const isFailed = normalizedStatus === 'FAILED' || normalizedStatus === 'ERROR'
  const canAdjustPdfZoom = !isLoadingFileUrl && !isFetchingPdf && !!pdfBlobUrl && !pdfError

  if (isPending && !isPDF && !isImage) {
    return (
      <div className="flex min-h-[600px] items-center justify-center rounded-lg border border-gray-200 bg-white p-12 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-blue-600" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            Processing document...
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Text extraction in progress. This may take a few moments.
          </p>
        </div>
      </div>
    )
  }

  if (isFailed) {
    return (
      <div className="flex min-h-[600px] items-center justify-center rounded-lg border border-gray-200 bg-white p-12 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-red-500" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            Failed to process document
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We couldn&apos;t extract text from this document. Please try re-uploading.
          </p>
        </div>
      </div>
    )
  }

  const renderPreviewContent = () => {
    if (viewMode === 'text' && hasExtractedText) {
      return (
        <div
          className="max-h-[75vh] overflow-auto p-8"
          style={{
            fontSize: `${textZoom}%`,
          }}
        >
          <div className="mx-auto max-w-4xl">
            <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {extractedText}
            </pre>
          </div>
        </div>
      )
    }

    if (isPDF) {
      return (
        <DocumentPdfPreview
          blobUrl={pdfBlobUrl ?? undefined}
          zoom={pdfZoom}
          isLoading={isLoadingFileUrl || isFetchingPdf}
          error={pdfError}
        />
      )
    }

    if (isDocx) {
      return (
        <DocumentDocxPreview
          arrayBuffer={docxBuffer ?? undefined}
          isLoading={isLoadingFileUrl || isFetchingDocx}
          error={docxError}
        />
      )
    }

    if (isXlsx) {
      return (
        <DocumentXlsxPreview
          sheets={xlsxSheets ?? undefined}
          isLoading={isLoadingFileUrl || isFetchingXlsx}
          error={xlsxError}
        />
      )
    }

    if (isImage) {
      if (isLoadingFileUrl) {
        return (
          <div className="flex min-h-[600px] items-center justify-center p-12">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 size-12 animate-spin text-blue-600" />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                Getting file URL...
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Please wait while we prepare the image
              </p>
            </div>
          </div>
        )
      }

      if (fileUrl && !imageLoadError) {
        return (
          <div className="flex min-h-[600px] items-center justify-center p-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={filename}
              className="h-auto max-w-full rounded-lg shadow-lg"
              onLoad={() => setImageLoadError(false)}
              onError={(e) => {
                console.error('Image failed to load:', e)
                setImageLoadError(true)
              }}
            />
          </div>
        )
      }

      return (
        <div className="flex min-h-[600px] items-center justify-center p-12">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 size-12 text-yellow-500" />
            <p className="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
              Unable to Load Preview
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Failed to load image preview. Please try again or use the download button.
            </p>
          </div>
        </div>
      )
    }

    if (hasExtractedText) {
      return (
        <div className="p-8" style={{ fontSize: `${textZoom}%` }}>
          <div className="mx-auto max-w-4xl">
            <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {extractedText}
            </pre>
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-[600px] items-center justify-center p-12">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-yellow-500" />
          <p className="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
            Preview unavailable
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We couldn’t generate a preview for this document. Please download to view.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasExtractedText && (
            <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${viewMode === 'preview' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                onClick={() => setViewMode('preview')}
              >
                Preview
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${viewMode === 'text' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                onClick={() => setViewMode('text')}
              >
                Text
              </Button>
            </div>
          )}
          {viewMode === 'text' && hasExtractedText && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleTextZoomOut}>
                <ZoomOut className="size-4" />
              </Button>
              <span className="flex items-center px-2 text-sm text-gray-600 dark:text-gray-400">
                {textZoom}%
              </span>
              <Button variant="ghost" size="sm" onClick={handleTextZoomIn}>
                <ZoomIn className="size-4" />
              </Button>
            </div>
          )}
          {viewMode === 'preview' && isPDF && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePdfZoomOut}
                disabled={!canAdjustPdfZoom}
              >
                <ZoomOut className="size-4" />
              </Button>
              <span className="flex items-center px-2 text-sm text-gray-600 dark:text-gray-400">
                {pdfZoom}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePdfZoomIn}
                disabled={!canAdjustPdfZoom}
              >
                <ZoomIn className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{renderPreviewContent()}</div>
    </div>
  )
}
