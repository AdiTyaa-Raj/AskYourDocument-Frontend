'use client'

import { useState, useCallback, useMemo } from 'react'
import { FileText, Loader2, Lock, Search, CloudUpload, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SupportingDocumentsCardProps } from '@/containers/documents/lib/types'
import { ACCEPTED_FILE_EXTENSIONS } from '@/containers/documents/lib/constants'
import { handleDragLeave, handleDragOver, handleDrop } from '@/containers/documents/lib'
import { formatTickerWithExchange } from '@/lib/utils'

export function SupportingDocumentsCard({
  isFieldsEnabled = true,
  isViewOnly = false,
  cardTitle = 'Supporting Documents',
  emptyAttachedListMessage,
  archive,
  upload,
  uploadedFiles,
  attachedDocuments,
  isLoading = false,
  className,
}: SupportingDocumentsCardProps) {
  const [documentSearch, setDocumentSearch] = useState('')
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const filteredArchiveDocuments = useMemo(() => {
    if (!archive?.documents.length) return []
    if (!documentSearch.trim()) return archive.documents
    const q = documentSearch.toLowerCase()
    return archive.documents.filter((d) => {
      const tickerLine = formatTickerWithExchange(d.ticker, d.exchange).toLowerCase()
      return (
        d.title.toLowerCase().includes(q) ||
        tickerLine.includes(q) ||
        (d.type && d.type.toLowerCase().includes(q))
      )
    })
  }, [archive?.documents, documentSearch])

  const selectedArchiveDocuments = useMemo(() => {
    if (!archive) return []
    return archive.documents.filter((d) => archive.selectedIds.includes(d.id))
  }, [archive])

  const handleSelectDocument = useCallback(
    (documentId: string) => {
      archive?.onSelect(documentId)
      setDocumentSearch('')
      setShowDocumentDropdown(false)
    },
    [archive]
  )

  const handleDocumentSearchFocus = useCallback(() => {
    if (isFieldsEnabled && !isViewOnly && archive) {
      archive.onSearchFocus?.()
      setShowDocumentDropdown(true)
    }
  }, [isFieldsEnabled, isViewOnly, archive])

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isFieldsEnabled || isViewOnly || !upload) return
      setIsDragging(true)
    },
    [isFieldsEnabled, isViewOnly, upload]
  )

  const handleFileSelect = useCallback(() => {
    if (!isFieldsEnabled || isViewOnly || !upload) return
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
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && isFieldsEnabled && !isViewOnly && upload) {
        e.preventDefault()
        handleFileSelect()
      }
    },
    [isFieldsEnabled, isViewOnly, upload, handleFileSelect]
  )

  const showArchive = Boolean(archive)
  const showUploadZone = Boolean(upload)
  const showUploadedFiles = Boolean(uploadedFiles?.files.length)
  const attached = attachedDocuments?.documents ?? []
  const showAttachedList = Boolean(attachedDocuments)

  const emptyMessage = attachedDocuments
    ? (emptyAttachedListMessage ??
      (isViewOnly ? 'No supporting documents' : 'No documents attached yet'))
    : null

  return (
    <Card
      className={`rounded-2xl border ${isFieldsEnabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'} ${className ?? ''}`}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-gray-700" />
          <Label className="text-sm font-semibold text-gray-900">{cardTitle}</Label>
          {attachedDocuments && attached.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1 text-xs font-medium text-gray-700">
              {attached.length}
            </span>
          )}
        </div>

        {/* Attached Documents List first (document detail: list → archive → upload) */}
        {showAttachedList && (
          <>
            {attached.length > 0 ? (
              <div className="space-y-2">
                {attached.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() => attachedDocuments!.onDocumentClick(doc)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                          {doc.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                          <span>
                            {doc.size ? `${(doc.size / 1024).toFixed(2)} KB` : 'Unknown size'}
                          </span>
                          {doc.category && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>{doc.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {attachedDocuments!.onDownload && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            attachedDocuments!.onDownload?.(doc)
                          }}
                          title="Download"
                        >
                          <Download className="size-3.5" />
                        </Button>
                      )}
                      {!isViewOnly && attachedDocuments!.onRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            attachedDocuments!.onRemove?.(doc.id)
                          }}
                          title="Remove"
                          aria-label={`Remove ${doc.title}`}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Loader2 className="size-6 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Uploading...</p>
              </div>
            ) : (
              emptyMessage && (
                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </p>
              )
            )}
          </>
        )}

        {/* Select from Archive (memo form or document detail) */}
        {showArchive && (
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-700">Select from Archive</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              {!isFieldsEnabled && (
                <Lock
                  className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
              )}
              <Input
                value={documentSearch}
                onChange={(e) => {
                  setDocumentSearch(e.target.value)
                  if (!showDocumentDropdown) setShowDocumentDropdown(true)
                }}
                onFocus={handleDocumentSearchFocus}
                onBlur={() => setTimeout(() => setShowDocumentDropdown(false), 200)}
                placeholder={
                  isFieldsEnabled
                    ? (archive?.searchPlaceholder ?? 'Search documents by title, ticker...')
                    : (archive?.disabledSearchPlaceholder ?? 'Select Primary Company to search...')
                }
                className={`h-9 pl-8 text-xs placeholder:text-gray-400 ${!isFieldsEnabled ? 'cursor-not-allowed bg-gray-100 pr-9' : 'pr-3'}`}
                disabled={!isFieldsEnabled || isViewOnly}
              />
              {showDocumentDropdown && isFieldsEnabled && !isViewOnly && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredArchiveDocuments.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">
                      {documentSearch.trim()
                        ? 'No documents found'
                        : 'No uploaded documents available'}
                    </div>
                  ) : (
                    filteredArchiveDocuments.map((doc) => {
                      const isSelected = archive?.selectedIds.includes(doc.id) ?? false
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            if (!isSelected) handleSelectDocument(doc.id)
                          }}
                          disabled={isSelected}
                          className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50 ${
                            isSelected ? 'cursor-not-allowed bg-gray-100 opacity-50' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-gray-900">{doc.title}</div>
                            <div className="truncate text-[10px] text-gray-500">
                              {[
                                formatTickerWithExchange(doc.ticker, doc.exchange),
                                doc.type,
                                doc.date,
                              ]
                                .filter(Boolean)
                                .join(' • ')}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="ml-2 text-[10px] text-green-600">Selected</span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
            {archive?.showSelectedList !== false && selectedArchiveDocuments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {selectedArchiveDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2"
                  >
                    <FileText className="size-3.5 shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-gray-900">{doc.title}</div>
                      <div className="truncate text-[10px] text-gray-500">
                        {[formatTickerWithExchange(doc.ticker, doc.exchange), doc.type]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                    </div>
                    {!isViewOnly && archive?.onRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 shrink-0 p-0"
                        onClick={() => archive?.onRemove?.(doc.id)}
                        aria-label={`Remove ${doc.title}`}
                      >
                        <X className="size-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload New Document */}
        {showUploadZone && (
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-700">Upload New Document</Label>
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
              onDrop={handleDrop(setIsDragging, isViewOnly, upload?.onUpload)}
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
                  <CloudUpload
                    className={`size-4 ${!isFieldsEnabled ? 'text-gray-400' : 'text-gray-500'}`}
                  />
                </div>
                <p
                  className={`text-[11px] ${!isFieldsEnabled ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {!isFieldsEnabled
                    ? (upload?.disabledMessage ?? 'Select Primary Company to enable upload')
                    : 'Drop files here or click to browse'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Uploaded Files List (memo form) */}
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
