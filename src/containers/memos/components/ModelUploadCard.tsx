'use client'

import { useState, useCallback, type DragEvent, type KeyboardEvent } from 'react'
import { Microscope, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ACCEPTED_FILE_EXTENSIONS } from '@/containers/documents/lib/constants'
import { handleDragLeave, handleDragOver, handleDrop } from '@/containers/documents/lib'
import type { ModelUploadCardProps } from '@/containers/memos/lib/types'

export function ModelUploadCard({
  isFieldsEnabled = true,
  isViewOnly = false,
  upload,
  uploadedFiles,
  className,
}: ModelUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isFieldsEnabled || isViewOnly) return
      setIsDragging(true)
    },
    [isFieldsEnabled, isViewOnly]
  )

  const handleFileSelect = useCallback(() => {
    if (!isFieldsEnabled || isViewOnly) return
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = ACCEPTED_FILE_EXTENSIONS
    input.style.position = 'fixed'
    input.style.opacity = '0'
    input.style.pointerEvents = 'none'
    document.body.appendChild(input)
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files?.length) upload.onUpload(target.files)
      document.body.removeChild(input)
    }
    input.click()
  }, [isFieldsEnabled, isViewOnly, upload])

  const handleFileSelectKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && isFieldsEnabled && !isViewOnly) {
        e.preventDefault()
        handleFileSelect()
      }
    },
    [isFieldsEnabled, isViewOnly, handleFileSelect]
  )

  const showUploadedFiles = Boolean(uploadedFiles?.files.length)

  return (
    <Card
      className={`rounded-2xl border ${isFieldsEnabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'} ${className ?? ''}`}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Microscope className="size-4 text-gray-700" />
          <Label className="text-sm font-semibold text-gray-900">Model</Label>
          {uploadedFiles && uploadedFiles.files.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1 text-xs font-medium text-gray-700">
              {uploadedFiles.files.length}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-700">Upload Model</Label>
          <div
            className={`relative z-10 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
              !isFieldsEnabled
                ? 'cursor-not-allowed border-gray-200 bg-gray-50'
                : isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'cursor-pointer border-gray-300 bg-white hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver(setIsDragging, isViewOnly)}
            onDragLeave={handleDragLeave(setIsDragging)}
            onDrop={handleDrop(setIsDragging, isViewOnly, upload.onUpload)}
            onClick={handleFileSelect}
            role="button"
            tabIndex={isFieldsEnabled && !isViewOnly ? 0 : -1}
            onKeyDown={handleFileSelectKeyDown}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex size-8 items-center justify-center rounded-full ${
                  !isFieldsEnabled ? 'bg-gray-200' : 'bg-gray-100'
                }`}
              >
                <Microscope
                  className={`size-4 ${!isFieldsEnabled ? 'text-gray-400' : 'text-gray-500'}`}
                />
              </div>
              <p className={`text-[11px] ${!isFieldsEnabled ? 'text-gray-400' : 'text-gray-600'}`}>
                {!isFieldsEnabled
                  ? (upload.disabledMessage ?? 'Select Primary Company to enable upload')
                  : 'Drop model files here or click to browse'}
              </p>
            </div>
          </div>
        </div>

        {uploadedFiles && showUploadedFiles && (
          <div className="space-y-2">
            {uploadedFiles.files.map((file) => (
              <div
                key={file.id}
                className={`border-border rounded-lg border bg-white p-3 ${
                  file.uploadError ? 'border-red-300 bg-red-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {uploadedFiles.getFileIcon(file)}
                    <div>
                      <div className="text-foreground text-xs font-medium">{file.name}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {uploadedFiles.getFileStatusText(file)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0"
                    onClick={() => uploadedFiles.onRemoveFile(file.id)}
                    aria-label={`Remove file ${file.name}`}
                    disabled={isViewOnly || file.isUploading}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
