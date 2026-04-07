'use client'

import { memo, useState, useCallback, useRef } from 'react'
import { Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Card, CardContent } from '@/components/ui/card'
import { extendedMemoTemplates } from '@/containers/memos/lib/extended-templates'
import type { MemoTemplate, TemplateSelectionPageProps } from '@/containers/memos/lib/types'
import { DocumentMetadataDialog } from '@/containers/documents/components'
import type { DocumentMetadata } from '@/containers/documents/lib/types'
import {
  ALLOWED_FILE_TYPES,
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
  FILE_TYPE_ERROR_MESSAGE,
  FILE_SIZE_ERROR_MESSAGE,
} from '@/containers/documents/lib/constants'
import notify from '@/lib/notifications'
import { getApiErrorDetail } from '@/lib/utils'

export const TemplateSelectionPage = memo(function TemplateSelectionPage({
  templates = extendedMemoTemplates,
  onSelect,
  onUploadDocument,
  isUploadPending = false,
}: TemplateSelectionPageProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload states
  const [isDragging, setIsDragging] = useState(false)
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Clear file input helper
  const clearFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleSelect = useCallback(
    (template: MemoTemplate) => {
      if (onSelect) {
        onSelect(template)
      } else {
        // Default navigation to template route
        router.push(`/research-updates/template/${template.id}`)
      }
    },
    [onSelect, router]
  )

  // File upload handlers
  const handleFileSelectFromInput = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      // Prevent double upload
      if (isUploadPending) {
        return
      }

      const file = files[0]

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
        notify.error({
          title: 'Invalid File Type',
          description: FILE_TYPE_ERROR_MESSAGE,
        })
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        notify.error({
          title: 'File Too Large',
          description: FILE_SIZE_ERROR_MESSAGE,
        })
        return
      }

      // File is valid, show metadata dialog
      setSelectedFile(file)
      setIsMetadataDialogOpen(true)
    },
    [isUploadPending]
  )

  const handleMetadataSubmit = async (metadata: DocumentMetadata) => {
    if (!selectedFile) return

    // If no upload handler provided, show error
    if (!onUploadDocument) {
      notify.error({
        title: 'Upload Not Available',
        description: 'Document upload functionality is not available.',
      })
      return
    }

    try {
      await onUploadDocument(selectedFile, metadata)

      // Clear the file input and selected file
      clearFileInput()
      setSelectedFile(null)
      setIsMetadataDialogOpen(false)
    } catch (err) {
      const errorMessage =
        getApiErrorDetail(err) ||
        (err instanceof Error ? err.message : 'Failed to upload document. Please try again.')

      notify.error({
        title: 'Upload Failed',
        description: errorMessage,
      })

      // Clear the file input and selected file
      clearFileInput()
      setSelectedFile(null)
      setIsMetadataDialogOpen(false)
    }
  }

  const handleUploadClick = () => {
    if (!isUploadPending) {
      // Clear the input value before clicking to ensure onChange fires even for the same file
      clearFileInput()
      fileInputRef.current?.click()
    }
  }

  // Handle metadata dialog close (cancel/outside click)
  const handleMetadataDialogChange = useCallback(
    (open: boolean) => {
      setIsMetadataDialogOpen(open)
      if (!open) {
        // Clear file state when dialog is closed without submitting
        setSelectedFile(null)
        clearFileInput()
      }
    },
    [clearFileInput]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFileSelectFromInput(files)
      }
    },
    [handleFileSelectFromInput]
  )

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-4 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS}
          onChange={(e) => handleFileSelectFromInput(e.target.files)}
          className="hidden"
        />

        {/* Document Metadata Dialog */}
        <DocumentMetadataDialog
          open={isMetadataDialogOpen}
          onOpenChange={handleMetadataDialogChange}
          onSubmit={handleMetadataSubmit}
          fileName={selectedFile?.name}
          isLoading={isUploadPending}
        />

        {/* Title and Description */}
        <div className="mb-6">
          <h1 className="mb-1.5 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Create New Note
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select a template to get started with your memo submission
          </p>
        </div>

        {/* Template Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((template) => {
            const Icon = template.icon
            return (
              <Card
                key={template.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(template)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleSelect(template)
                  }
                }}
                className="group cursor-pointer border border-gray-200 bg-white transition-all duration-150 hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
              >
                <CardContent className="px-4">
                  <div className="flex flex-col items-start gap-2">
                    {/* Icon and Title Row */}
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="text-sm leading-tight font-medium text-gray-900 dark:text-gray-100">
                        {template.name}
                      </h3>
                    </div>

                    {/* Description aligned with icon */}
                    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {template.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* File Upload Area */}
        <div
          className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-5 text-center transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/20'
              : isUploadPending
                ? 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50'
                : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleUploadClick()
            }
          }}
        >
          {isUploadPending ? (
            <div className="flex flex-col items-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <p className="text-xs text-gray-600 dark:text-gray-300">Uploading...</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Upload className="size-[18px] text-gray-500" />
              <p className="text-xs text-gray-900 dark:text-gray-100">
                <span className="font-medium">Drop file here or click to browse</span>
                <span className="ml-2 text-gray-500">PDF, Word, Excel supported</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
