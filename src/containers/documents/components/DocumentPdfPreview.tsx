'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import type { DocumentPdfPreviewProps } from '@/containers/documents/lib/preview-types'

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
type PdfDocument = Awaited<ReturnType<PdfJsModule['getDocument']>['promise']>

type PdfRenderError = {
  message: string
  detail?: string
}

const PDFJS_MODULE_SRC = '/pdfjs/pdf.mjs'
const PDFJS_WORKER_SRC = '/pdfjs/pdf.worker.min.mjs'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
}

export function DocumentPdfPreview({ blobUrl, zoom, isLoading, error }: DocumentPdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const pdfDocRef = useRef<PdfDocument | null>(null)

  const [pdfjs, setPdfjs] = useState<PdfJsModule | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [pageWidth, setPageWidth] = useState(900)
  const [loadError, setLoadError] = useState<PdfRenderError | null>(null)

  const isReady = Boolean(pdfjs && blobUrl && !error && !isLoading)

  useEffect(() => {
    let cancelled = false

    const initPdf = async () => {
      try {
        const mod = (await import(/* webpackIgnore: true */ PDFJS_MODULE_SRC)) as PdfJsModule
        mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
        if (!cancelled) {
          setPdfjs(mod)
          setLoadError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError({
            message: 'Failed to initialize PDF preview.',
            detail: getErrorMessage(err, 'Unable to load the PDF renderer.'),
          })
        }
      }
    }

    initPdf()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const updateWidth = () => {
      if (!containerRef.current) return
      const width = Math.max(containerRef.current.clientWidth - 32, 320)
      setPageWidth(width)
    }
    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!pdfjs || !blobUrl) {
      setNumPages(0)
      pdfDocRef.current = null
      return
    }

    let cancelled = false
    const loadingTask = pdfjs.getDocument({ url: blobUrl })

    const loadDocument = async () => {
      try {
        const doc = await loadingTask.promise
        if (cancelled) return
        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        setLoadError(null)
      } catch (err) {
        if (!cancelled) {
          pdfDocRef.current = null
          setNumPages(0)
          setLoadError({
            message: 'Failed to load PDF document.',
            detail: getErrorMessage(err, 'The document could not be loaded.'),
          })
        }
      }
    }

    loadDocument()

    return () => {
      cancelled = true
      void loadingTask.destroy()
      pdfDocRef.current = null
    }
  }, [pdfjs, blobUrl])

  const targetWidth = useMemo(() => Math.max(320, pageWidth * (zoom / 100)), [pageWidth, zoom])

  const renderPage = useCallback(
    async (pageNumber: number) => {
      const doc = pdfDocRef.current
      const canvas = canvasRefs.current[pageNumber]

      if (!doc || !canvas) return

      const page = await doc.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const scale = targetWidth / viewport.width
      const scaledViewport = page.getViewport({ scale })
      const context = canvas.getContext('2d')

      if (!context) return

      const dpr = window.devicePixelRatio || 1
      const heightPadding = 2

      canvas.width = Math.ceil(scaledViewport.width * dpr)
      canvas.height = Math.ceil(scaledViewport.height * dpr) + heightPadding
      canvas.style.width = `${Math.ceil(scaledViewport.width)}px`
      canvas.style.height = `${Math.ceil(scaledViewport.height) + Math.ceil(heightPadding / dpr)}px`

      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      await page.render({ canvasContext: context, viewport: scaledViewport, canvas }).promise
    },
    [targetWidth]
  )

  useEffect(() => {
    if (!isReady || !numPages) return

    let cancelled = false
    const pageNumbers = Array.from({ length: numPages }, (_, index) => index + 1)

    const renderAll = async () => {
      try {
        for (const pageNumber of pageNumbers) {
          if (cancelled) return
          await renderPage(pageNumber)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError({
            message: 'Failed to render PDF pages.',
            detail: getErrorMessage(err, 'One or more pages could not be rendered.'),
          })
        }
      }
    }

    void renderAll()

    return () => {
      cancelled = true
    }
  }, [isReady, numPages, renderPage])

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-blue-600" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            Preparing PDF for preview...
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please wait while we prepare the document
          </p>
        </div>
      </div>
    )
  }

  if (error || loadError || !blobUrl) {
    return (
      <div className="flex min-h-[600px] items-center justify-center bg-gray-50 p-12 dark:bg-gray-900">
        <div className="max-w-md text-center">
          <FileText className="mx-auto mb-4 size-16 text-blue-600" />
          <p className="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
            PDF Preview Not Available
          </p>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {error ||
              loadError?.message ||
              'Unable to render PDF preview. Please use the download button to view.'}
          </p>
          {loadError?.detail ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">{loadError.detail}</p>
          ) : null}
        </div>
      </div>
    )
  }

  if (!pdfjs) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <Loader2 className="size-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-[800px] w-full overflow-auto bg-gray-50 px-4 pt-4 pb-24 dark:bg-gray-900"
    >
      {Array.from({ length: numPages }, (_, index) => {
        const pageNumber = index + 1
        return (
          <div key={`page_${pageNumber}`} className="mb-4 flex justify-center last:mb-16">
            <canvas
              ref={(node) => {
                canvasRefs.current[pageNumber] = node
              }}
              className="block rounded-md bg-white shadow"
            />
          </div>
        )
      })}
    </div>
  )
}
