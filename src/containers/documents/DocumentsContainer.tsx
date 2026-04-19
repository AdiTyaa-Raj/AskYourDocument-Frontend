'use client'

import { useMemo, useState, type ChangeEvent } from 'react'

import { useDocuments, useUploadDocument } from '@/containers/documents/lib/queries'
import { DataTable, type ColumnConfig } from '@/components/shared/DataTable'
import { TableSkeletonLoader } from '@/components/shared/table-skeleton-loader'
import { AppFeedbackState } from '@/components/shared/AppFeedbackState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import notify from '@/lib/notifications'

type DocumentRow = {
  id: string
  title: string
  type: string
  status: 'completed' | 'pending' | 'in-progress' | 'failed'
  createdAt: string
  sizeLabel: string
}

function formatBytes(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let idx = 0
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024
    idx += 1
  }
  const digits = idx === 0 ? 0 : value < 10 ? 1 : 0
  return `${value.toFixed(digits)} ${units[idx]}`
}

function getStatusBadgeVariant(
  status: DocumentRow['status']
): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'failed':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export function DocumentsContainer() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const skip = (page - 1) * pageSize
  const limit = pageSize

  const { data, isLoading, error } = useDocuments(skip, limit)
  const uploadMutation = useUploadDocument()

  const rows = useMemo<DocumentRow[]>(() => {
    const docs = data?.documents ?? []
    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.mime_type || d.type || 'unknown',
      status: d.status,
      createdAt: d.created_at ? new Date(d.created_at).toLocaleString() : d.date || '—',
      sizeLabel: formatBytes(d.file_size),
    }))
  }, [data?.documents])

  const total = data?.total ?? rows.length

  const columns = useMemo<ColumnConfig<DocumentRow>[]>(() => {
    return [
      {
        key: 'title',
        label: 'Document',
        width: 420,
        visible: true,
        formatter: (value) => (
          <div className="max-w-[420px] truncate text-sm font-medium">{String(value)}</div>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        width: 220,
        visible: true,
        formatter: (value) => (
          <span className="text-muted-foreground text-sm">{String(value)}</span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 140,
        visible: true,
        formatter: (value) => (
          <Badge variant={getStatusBadgeVariant(value as DocumentRow['status'])}>
            {String(value)}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        label: 'Created',
        width: 220,
        visible: true,
        formatter: (value) => (
          <span className="text-muted-foreground text-sm">{String(value)}</span>
        ),
      },
      {
        key: 'sizeLabel',
        label: 'Size',
        width: 120,
        visible: true,
        align: 'right',
        alignHeaderToCell: true,
        formatter: (value) => (
          <span className="text-muted-foreground text-sm">{String(value)}</span>
        ),
      },
    ]
  }, [])

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const onUpload = async () => {
    if (!selectedFile) return
    try {
      await uploadMutation.mutateAsync({ file: selectedFile })
      notify.success({
        title: 'Upload started',
        description: 'Your document was queued for processing.',
      })
      setSelectedFile(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      notify.error({ title: 'Upload failed', description: message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-border/50 bg-card/50 flex flex-col gap-3 rounded-xl border p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Documents</h1>
          <p className="text-muted-foreground text-sm">
            Upload a document, then ask questions in AI Chat.
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input type="file" onChange={onFileChange} />
          <Button onClick={onUpload} disabled={!selectedFile || uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </div>

      <div className="border-border/50 bg-card/50 rounded-xl border p-4 shadow-sm">
        {isLoading ? (
          <TableSkeletonLoader
            columnCount={5}
            rowCount={10}
            showCheckbox={false}
            minTableWidth={1000}
          />
        ) : error ? (
          <AppFeedbackState
            variant="error"
            title="Failed to load documents"
            description={error instanceof Error ? error.message : 'An unexpected error occurred'}
          />
        ) : rows.length === 0 ? (
          <AppFeedbackState
            variant="empty"
            title="No documents yet"
            description="Upload your first document to get started."
          />
        ) : (
          <DataTable<DocumentRow>
            data={rows}
            columns={columns}
            minTableWidth={1120}
            totalCount={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
            paginationMode="server"
          />
        )}
      </div>
    </div>
  )
}
