import React, { useEffect, useRef } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { renderAsync } from 'docx-preview'
import type { DocumentDocxPreviewProps } from '@/containers/documents/lib/preview-types'

export function DocumentDocxPreview({ arrayBuffer, isLoading, error }: DocumentDocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    container.innerHTML = ''

    const renderDoc = async () => {
      if (!arrayBuffer) return
      try {
        await renderAsync(arrayBuffer, container, undefined, {
          className: 'docx-rendered',
          ignoreFonts: false,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          hideWrapperOnPrint: false,
          ignoreLastRenderedPageBreak: false,
          inWrapper: true,
          experimental: true,
          trimXmlDeclaration: true,
          renderHeaders: true,
          renderFooters: true,
          renderEndnotes: true,
          renderFootnotes: true,
        })
      } catch (err) {
        console.error('DOCX render error:', err)
        if (!cancelled && container) {
          container.innerHTML = ''
        }
      }
    }

    renderDoc()

    return () => {
      cancelled = true
      container.innerHTML = ''
    }
  }, [arrayBuffer])

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-12 animate-spin text-blue-600" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
            Preparing Word document…
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Rendering file for secure inline preview
          </p>
        </div>
      </div>
    )
  }

  if (error || !arrayBuffer) {
    return (
      <div className="flex min-h-[600px] items-center justify-center p-12">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-yellow-500" />
          <p className="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
            {error || 'Word preview unavailable'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please use the download button to open the document locally.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 dark:bg-gray-950">
      <div className="relative mx-auto max-w-[960px] rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="max-h-[80vh] overflow-auto px-6 py-8">
          <div ref={containerRef} className="docx-rendered-content min-h-[520px]" />
        </div>
      </div>
    </div>
  )
}
