'use client'

import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type UIEvent,
} from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, ChevronDown, Search as SearchIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DataTable, type SortConfig } from '@/components/shared/DataTable'
import { TableSkeletonLoader } from '@/components/shared/table-skeleton-loader'
import { AppFeedbackState } from '@/components/shared/AppFeedbackState'
import { getDocumentColumns, DocumentTableData } from '@/lib/tableColumns'
import {
  useDocuments,
  useDocumentAuthorUsersInfinite,
  useReprocessDocument,
  useDeleteDocument,
  useGetDocumentFileUrl,
  downloadDocumentById,
  getEmptyStateMessages,
} from '@/containers/documents/lib'
import {
  DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE,
  DOCUMENT_TYPE_FILTER_OPTIONS,
  DISPLAY_TYPE_TO_CATEGORY_MAP,
  STATUS_FILTER_OPTIONS,
  STATUS_DISPLAY_TO_API_MAP,
} from '@/containers/documents/lib/constants'
import { useDebouncedValue } from '@/lib/hooks/useDebounce'
import { cn, sortData } from '@/lib/utils'
import { type ProcessingStatus } from '@/lib/processing-status-utils'
import notify from '@/lib/notifications'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DocumentDetailContainer } from '@/containers/documents/DocumentDetailContainer'
import type { DocumentAuthorListUser } from '@/containers/documents/lib/types'

export function DocumentsContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Filters and search state
  const [searchQuery, setSearchQuery] = useState('')
  const [documentTypeFilter, setDocumentTypeFilter] = useState('All Document Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  /** "__all__" or stringified user id (content API author_id) */
  const [authorFilterValue, setAuthorFilterValue] = useState('__all__')
  /** Label shown on the author filter trigger (survives lazy-loaded pages). */
  const [authorTriggerLabel, setAuthorTriggerLabel] = useState('All Authors')
  const [authorPopoverOpen, setAuthorPopoverOpen] = useState(false)
  const authorTriggerRef = useRef<HTMLButtonElement>(null)
  const authorScrollRef = useRef<HTMLDivElement>(null)
  const authorLoadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const [authorPopoverWidthPx, setAuthorPopoverWidthPx] = useState(220)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })

  // Modal state following by URL after page reloads
  const selectedDocId = searchParams.get('id')
  const isModalOpen = Boolean(selectedDocId)

  // Debounce search query to avoid too many API calls
  const debouncedSearch = useDebouncedValue(searchQuery, 500)

  // Map display name to API category value for filtering
  const categoryFilter = useMemo(() => {
    if (documentTypeFilter === 'All Document Types') {
      return undefined
    }
    return DISPLAY_TYPE_TO_CATEGORY_MAP[documentTypeFilter]
  }, [documentTypeFilter])

  // Map display name to API status value for filtering
  const statusFilterApi = useMemo(() => {
    if (statusFilter === 'All Status') {
      return undefined
    }
    const value = STATUS_DISPLAY_TO_API_MAP[statusFilter]
    return value || undefined
  }, [statusFilter])

  const selectedAuthorId =
    authorFilterValue === '__all__' ? undefined : Number.parseInt(authorFilterValue, 10)
  const authorIdForApi =
    selectedAuthorId !== undefined && Number.isFinite(selectedAuthorId)
      ? selectedAuthorId
      : undefined

  const listSkip = (page - 1) * pageSize
  const listLimit = pageSize

  const {
    data: authorUsersInfinite,
    isLoading: isAuthorUsersLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError: isAuthorUsersError,
  } = useDocumentAuthorUsersInfinite(authorPopoverOpen)

  const authorUsersFlat = useMemo(() => {
    const pages = authorUsersInfinite?.pages ?? []
    const seen = new Set<number>()
    const out: DocumentAuthorListUser[] = []
    for (const p of pages) {
      for (const u of p.users) {
        if (!seen.has(u.id)) {
          seen.add(u.id)
          out.push(u)
        }
      }
    }
    return out
  }, [authorUsersInfinite?.pages])

  const handleAuthorListScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 72
      if (nearBottom && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  useLayoutEffect(() => {
    if (!authorPopoverOpen) return
    const el = authorTriggerRef.current
    if (!el) return
    const w = Math.ceil(el.getBoundingClientRect().width)
    setAuthorPopoverWidthPx(Math.min(220, Math.max(158, w)))
  }, [authorPopoverOpen])

  useEffect(() => {
    if (!authorPopoverOpen) return
    const onResize = () => {
      const el = authorTriggerRef.current
      if (!el) return
      const w = Math.ceil(el.getBoundingClientRect().width)
      setAuthorPopoverWidthPx(Math.min(220, Math.max(158, w)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [authorPopoverOpen])

  useEffect(() => {
    if (!authorPopoverOpen || isAuthorUsersLoading || isAuthorUsersError) return
    const root = authorScrollRef.current
    const sentinel = authorLoadMoreSentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        if (visible && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { root, rootMargin: '64px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    authorPopoverOpen,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isAuthorUsersLoading,
    isAuthorUsersError,
    authorUsersFlat.length,
  ])

  const selectAuthor = useCallback((value: string, label: string) => {
    setAuthorFilterValue(value)
    setAuthorTriggerLabel(label)
    setAuthorPopoverOpen(false)
  }, [])

  // TanStack Query hooks - search, category, status, and author_id on content API
  const {
    data: documentsResponse,
    isLoading,
    error,
  } = useDocuments(listSkip, listLimit, {
    search: debouncedSearch,
    category: categoryFilter,
    status: statusFilterApi,
    authorId: authorIdForApi,
  })
  const documents = useMemo(() => documentsResponse?.documents ?? [], [documentsResponse])
  const totalDocuments = documentsResponse?.total ?? 0
  const reprocessMutation = useReprocessDocument()
  const deleteMutation = useDeleteDocument()
  const getDocumentFileUrlMutation = useGetDocumentFileUrl()

  // Delete confirmation: document id when dialog is open, null when closed
  const [documentToDeleteId, setDocumentToDeleteId] = useState<string | null>(null)

  // Transform documents to table data format
  const tableData: DocumentTableData[] = useMemo(
    () =>
      documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        ticker: doc.ticker,
        exchange: doc.exchange,
        type: doc.type,
        source: doc.source,
        author: doc.author,
        primary: doc.primary,
        secondary: doc.secondary,
        date: doc.date,
        actionable: doc.actionable,
        status: doc.status,
        attachment:
          doc.attachment ??
          (doc.source === 'upload' ? DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE : 'N'),
        text_extraction_status: doc.text_extraction_status as ProcessingStatus | undefined,
        chunking_status: doc.chunking_status as ProcessingStatus | undefined,
        embedding_status: doc.embedding_status as ProcessingStatus | undefined,
        analysis_status: doc.analysis_status as ProcessingStatus | undefined,
        strategy: doc.strategy,
        can_delete: doc.can_delete,
      })),
    [documents]
  )

  const sortedTableData = useMemo(() => sortData(tableData, sortConfig), [tableData, sortConfig])

  const filteredAndSortedData = sortedTableData

  const listTotalCount = totalDocuments

  // Reset to first page when filters or search change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, documentTypeFilter, statusFilter, authorFilterValue])

  // Handle sorting change
  const handleSortChange = useCallback((config: SortConfig) => {
    setSortConfig(config)
  }, [])

  // Handle document click
  const handleDocumentClick = useCallback(
    (id: string) => {
      router.push(`/documents?id=${id}`)
    },
    [router]
  )

  // Navigate to detail page with autoDownload=true (for template Download from listing)
  const handleDocumentClickWithAutoDownload = useCallback(
    (id: string) => {
      router.push(`/documents?id=${id}&autoDownload=true`)
    },
    [router]
  )

  const handleCloseModal = useCallback(() => {
    router.replace('/documents')
  }, [router])

  // Handle reprocess document
  const handleReprocessDocument = useCallback(
    async (id: string, hardReprocess = false) => {
      try {
        await reprocessMutation.mutateAsync({ docId: id, hardReprocess })
        notify.success({
          title: 'Document Reprocessing',
          description: hardReprocess
            ? 'Document has been sent for complete reprocessing'
            : 'Document has been sent for reprocessing',
        })
      } catch (error) {
        notify.error({
          title: 'Reprocess Failed',
          description: error instanceof Error ? error.message : 'Failed to reprocess document',
        })
      }
    },
    [reprocessMutation]
  )

  const handlePublishClick = useCallback(
    (id: string) => {
      router.push(`/documents?id=${id}`)
    },
    [router]
  )

  // Download document via file-url API (used only for source === 'upload')
  const handleDownloadDocument = useCallback(
    (id: string) => {
      downloadDocumentById(id, getDocumentFileUrlMutation.mutate)
    },
    [getDocumentFileUrlMutation]
  )

  // Delete document: open confirmation dialog
  const handleDeleteDocument = useCallback((id: string) => {
    setDocumentToDeleteId(id)
  }, [])

  // Confirm delete: call API and close dialog
  const handleConfirmDelete = useCallback(async () => {
    if (!documentToDeleteId) return
    try {
      await deleteMutation.mutateAsync(documentToDeleteId)
      notify.success({
        title: 'Document deleted',
        description: 'The document has been permanently deleted.',
      })
      setDocumentToDeleteId(null)
    } catch (error) {
      notify.error({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete document',
      })
    }
  }, [documentToDeleteId, deleteMutation])

  // Get columns configuration
  const columns = useMemo(
    () =>
      getDocumentColumns({
        onDocumentClick: handleDocumentClick,
        onDocumentClickWithAutoDownload: handleDocumentClickWithAutoDownload,
        onReprocessDocument: handleReprocessDocument,
        onPublish: handlePublishClick,
        onDownload: handleDownloadDocument,
        onDelete: handleDeleteDocument,
      }),
    [
      handleDocumentClick,
      handleDocumentClickWithAutoDownload,
      handleReprocessDocument,
      handlePublishClick,
      handleDownloadDocument,
      handleDeleteDocument,
    ]
  )

  const hasNoDocuments = !isLoading && !error && documents.length === 0
  const emptyStateMessages = getEmptyStateMessages(hasNoDocuments, filteredAndSortedData.length)

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900">
      <div className="w-full space-y-6 px-6 py-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Documents</h1>
        </div>

        {/* Search + filters: full row width; search flexes; status & author equal width */}
        <div className="flex w-full min-w-0 items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="box-border h-9 min-h-9 w-full rounded-lg border border-gray-200 bg-white py-0 pr-3 pl-10 text-sm leading-tight shadow-xs focus:border-gray-300 focus:ring-1 focus:ring-gray-300 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
            <SelectTrigger className="h-9 min-h-9 w-[200px] shrink-0 rounded-lg border-gray-200 bg-white py-0 shadow-xs dark:border-gray-700 dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 min-h-9 w-[158px] shrink-0 rounded-lg border-gray-200 bg-white py-0 shadow-xs dark:border-gray-700 dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover open={authorPopoverOpen} onOpenChange={setAuthorPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                ref={authorTriggerRef}
                type="button"
                aria-expanded={authorPopoverOpen}
                aria-haspopup="listbox"
                className={cn(
                  'border-input data-placeholder:text-muted-foreground flex h-9 min-h-9 max-w-[220px] min-w-[158px] shrink-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-0 text-sm shadow-xs outline-none',
                  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  'dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-800/90'
                )}
              >
                <span className="truncate text-left">{authorTriggerLabel}</span>
                <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={4}
              className={cn(
                'z-[100] flex flex-col overflow-hidden p-0 shadow-md dark:border-gray-700 dark:bg-gray-800',
                // Match trigger width; override ui/popover default w-72
                '!w-[var(--author-popover-w)] max-w-[min(100vw-1.5rem,220px)]'
              )}
              style={
                {
                  '--author-popover-w': `${authorPopoverWidthPx}px`,
                } as CSSProperties
              }
            >
              <div className="shrink-0 border-b border-gray-100 p-1 dark:border-gray-700">
                <button
                  type="button"
                  role="option"
                  aria-selected={authorFilterValue === '__all__'}
                  onClick={() => selectAuthor('__all__', 'All Authors')}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none',
                    'hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700',
                    authorFilterValue === '__all__' && 'bg-gray-50 dark:bg-gray-700/80'
                  )}
                >
                  {authorFilterValue === '__all__' ? (
                    <Check className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                  )}
                  All Authors
                </button>
              </div>
              <div
                ref={authorScrollRef}
                className="max-h-[min(168px,30vh)] min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable]"
                onScroll={handleAuthorListScroll}
              >
                {isAuthorUsersError ? (
                  <p className="px-2 py-3 text-center text-xs text-red-600 dark:text-red-400">
                    Could not load authors
                  </p>
                ) : isAuthorUsersLoading ? (
                  <p className="px-2 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                    Loading authors…
                  </p>
                ) : (
                  <>
                    {authorUsersFlat.map((u) => {
                      const value = String(u.id)
                      const selected = authorFilterValue === value
                      return (
                        <button
                          key={u.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => selectAuthor(value, u.displayName)}
                          className={cn(
                            'flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none',
                            'hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700',
                            selected && 'bg-gray-50 dark:bg-gray-700/80'
                          )}
                        >
                          {selected ? (
                            <Check className="size-4 shrink-0" aria-hidden />
                          ) : (
                            <span className="size-4 shrink-0" aria-hidden />
                          )}
                          <span className="min-w-0 flex-1 truncate">{u.displayName}</span>
                        </button>
                      )
                    })}
                    {isFetchingNextPage ? (
                      <p className="py-2 text-center text-xs text-gray-500 dark:text-gray-400">
                        Loading more…
                      </p>
                    ) : null}
                    {hasNextPage ? (
                      <div
                        ref={authorLoadMoreSentinelRef}
                        className="h-2 w-full shrink-0"
                        aria-hidden
                      />
                    ) : null}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Table Container - White card on gray background */}
        <div className="w-full rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {/* Table with Loading, Error, and Empty States */}
          {error ? (
            <AppFeedbackState
              variant="error"
              title="Failed to load documents"
              description={error instanceof Error ? error.message : 'An unexpected error occurred'}
            />
          ) : isLoading ? (
            <TableSkeletonLoader
              columnCount={7}
              rowCount={10}
              showCheckbox={false}
              minTableWidth={1000}
            />
          ) : (
            <DataTable<DocumentTableData>
              data={filteredAndSortedData}
              columns={columns}
              minTableWidth={1000}
              totalCount={listTotalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value)
                setPage(1)
              }}
              paginationMode="server"
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
              onRowClick={(row) => handleDocumentClick(row.id)}
              emptyStateTitle={emptyStateMessages.title}
              emptyStateDescription={emptyStateMessages.description}
            />
          )}
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30">
          <div className="absolute inset-y-6 left-1/2 w-[calc(100vw-80px)] max-w-[1280px] -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            {selectedDocId && (
              <DocumentDetailContainer documentId={selectedDocId} onClose={handleCloseModal} />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={documentToDeleteId !== null}
        title="Delete document"
        description="This will permanently delete the document and all associated data (chunks, embeddings, file). This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        cancelLabel="Cancel"
        isConfirming={deleteMutation.isPending}
        confirmLoadingLabel="Deleting…"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDocumentToDeleteId(null)}
        onOpenChange={(open) => !open && setDocumentToDeleteId(null)}
      />
    </div>
  )
}
