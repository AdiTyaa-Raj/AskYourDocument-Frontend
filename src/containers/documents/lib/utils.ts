import { read, utils } from 'xlsx'
import type { WorkSheet } from 'xlsx'
import type {
  DocumentFileType,
  ParsedXlsxSheet,
  XlsxSheetMeta,
  ChatMessage,
  RelatedDocument,
  NormalizeDocInput,
} from '@/containers/documents/lib/types'
import { CATEGORY_TO_DISPLAY_TYPE_MAP } from './constants'

const DOCX_MIME_KEYS = ['word', 'officedocument.wordprocessingml.document', 'application/docx']
const XLSX_MIME_KEYS = ['excel', 'spreadsheetml', 'application/vnd.ms-excel', 'application/xlsx']
const IMAGE_MIME_PREFIX = 'image/'

const DOCX_EXTENSION = '.docx'
const XLSX_EXTENSION = '.xlsx'

export const XLSX_PREVIEW_ROW_LIMIT = 1000
export const XLSX_PREVIEW_COLUMN_LIMIT = 100

const isExtension = (filename: string | undefined, targetExt: string) =>
  Boolean(filename?.toLowerCase().endsWith(targetExt))

const includesAny = (value: string | undefined, matchers: string[]) => {
  if (!value) return false
  const normalized = value.toLowerCase()
  return matchers.some((matcher) => normalized.includes(matcher))
}

export const getDocumentFileType = (mimeType?: string, filename?: string): DocumentFileType => {
  const normalizedFilename = filename?.toLowerCase()
  const normalizedMime = mimeType?.toLowerCase()

  if (includesAny(normalizedMime, ['pdf']) || normalizedFilename?.endsWith('.pdf')) {
    return 'pdf'
  }

  if (
    includesAny(normalizedMime, DOCX_MIME_KEYS) ||
    isExtension(normalizedFilename, DOCX_EXTENSION)
  ) {
    return 'docx'
  }

  if (
    includesAny(normalizedMime, XLSX_MIME_KEYS) ||
    isExtension(normalizedFilename, XLSX_EXTENSION)
  ) {
    return 'xlsx'
  }

  if (normalizedMime?.startsWith(IMAGE_MIME_PREFIX)) {
    return 'image'
  }

  return 'other'
}

export const parseWorkbookSheets = (arrayBuffer: ArrayBuffer): ParsedXlsxSheet[] => {
  const workbook = read(arrayBuffer, { type: 'array', cellStyles: true })

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    const reference = sheet?.['!ref']
    if (!sheet || !reference) {
      return {
        name: sheetName,
        html: '<table></table>',
        meta: {
          totalRows: 0,
          totalColumns: 0,
          visibleRows: 0,
          visibleColumns: 0,
        },
      }
    }

    const decodedRange = utils.decode_range(reference)
    const totalRows = decodedRange.e.r - decodedRange.s.r + 1
    const totalColumns = decodedRange.e.c - decodedRange.s.c + 1
    const endRow = Math.min(decodedRange.e.r, decodedRange.s.r + XLSX_PREVIEW_ROW_LIMIT - 1)
    const endColumn = Math.min(decodedRange.e.c, decodedRange.s.c + XLSX_PREVIEW_COLUMN_LIMIT - 1)
    const limitedRangeRef = utils.encode_range({
      s: { r: decodedRange.s.r, c: decodedRange.s.c },
      e: { r: endRow, c: endColumn },
    })

    const limitedSheet: WorkSheet = { ...sheet, '!ref': limitedRangeRef }
    const html = utils.sheet_to_html(limitedSheet, { editable: false, header: '', footer: '' })

    const meta: XlsxSheetMeta = {
      totalRows,
      totalColumns,
      visibleRows: endRow - decodedRange.s.r + 1,
      visibleColumns: endColumn - decodedRange.s.c + 1,
    }

    return {
      name: sheetName,
      html,
      meta,
    }
  })
}

export const isNumericCellValue = (value: string | undefined): boolean => {
  if (!value) return false
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return false
  return !Number.isNaN(Number(normalized))
}

/**
 * Returns the real value if it exists and is not empty, otherwise returns the default value or "-"
 */
export const getValueOrDefault = (
  realValue: string | undefined | null,
  defaultValue?: string
): string => {
  if (realValue !== undefined && realValue !== null && realValue !== '') {
    return realValue
  }
  return defaultValue || '-'
}

/**
 * Formats currency values with appropriate suffix (B for billions, M for millions)
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  return `$${value.toFixed(2)}`
}

/**
 * Formats percentage values with appropriate sign (+ or -)
 */
export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Export chat history to markdown format
 * @param chatHistory - Array of chat messages
 * @returns Markdown string
 */
export const exportChatToMarkdown = (chatHistory: ChatMessage[]): string => {
  const markdown = chatHistory
    .map((msg) => {
      const timestamp = new Date(msg.timestamp).toLocaleString()
      const role = msg.role === 'user' ? '👤 **You**' : '🤖 **Arnie AI**'
      return `### ${role} - ${timestamp}\n\n${msg.content}\n`
    })
    .join('\n---\n\n')

  return `# AI Assistant Chat Export\n\n${markdown}`
}

/**
 * Download chat history as markdown file
 * @param chatHistory - Array of chat messages
 * @param filename - Optional custom filename (default: ai-chat-export-YYYY-MM-DD.md)
 */
export const downloadChatAsMarkdown = (chatHistory: ChatMessage[], filename?: string): void => {
  const markdown = exportChatToMarkdown(chatHistory)
  const defaultFilename = `ai-chat-export-${new Date().toISOString().split('T')[0]}.md`
  const finalFilename = filename || defaultFilename

  // Create and download markdown file
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = finalFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get failure message for document processing status
 * @param row - Document row with processing status fields
 * @returns Failure message string or undefined if no failures
 */
export const getDocumentFailureMessage = (row: {
  text_extraction_status?: string
  chunking_status?: string
  embedding_status?: string
  analysis_status?: string
}): string | undefined => {
  const statusMap = [
    { status: row.text_extraction_status, label: 'Text Extraction' },
    { status: row.chunking_status, label: 'Chunking' },
    { status: row.embedding_status, label: 'Embedding' },
    { status: row.analysis_status, label: 'Analysis' },
  ]

  const failedSteps = statusMap.filter((item) => item.status === 'FAILED').map((item) => item.label)

  return failedSteps.length > 0 ? `Failed: ${failedSteps.join(', ')}` : undefined
}

export const getActionableBadgeInfo = (actionable: string | null | undefined) => {
  const normalizedActionable = actionable?.toUpperCase()
  const isActionable =
    normalizedActionable === 'BUY' ||
    normalizedActionable === 'SELL' ||
    normalizedActionable === 'URGENT'

  let displayText = 'No Action'
  if (normalizedActionable === 'BUY') displayText = 'Buy'
  else if (normalizedActionable === 'SELL') displayText = 'Sell'
  else if (normalizedActionable === 'URGENT') displayText = 'Urgent Action Required'

  return { isActionable, displayText }
}

export const getAIProcessingStatus = (
  chunkingStatus?: string,
  embeddingStatus?: string,
  analysisStatus?: string
): 'failed' | 'completed' | 'pending' | null => {
  const statuses = [chunkingStatus, embeddingStatus, analysisStatus]

  if (statuses.some((status) => status === 'FAILED')) {
    return 'failed'
  }

  if (statuses.every((status) => status === 'COMPLETED')) {
    return 'completed'
  }

  if (statuses.some((status) => status === 'PENDING' || status === 'IN_PROGRESS')) {
    return 'pending'
  }

  return null
}

/**
 * Format metric value from tearsheet, handling N/A and empty values
 * @param value - Value from tearsheet (can be string, number, or null)
 * @param formatter - Optional formatter function to apply
 * @returns Formatted string or '-' if invalid
 */
export const formatTearsheetMetric = (
  value: string | number | null | undefined,
  formatter?: (val: number) => string
): string => {
  if (!value || value === 'N/A' || value === '') {
    return '-'
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return '-'
  }

  return formatter ? formatter(numValue) : `$${numValue.toFixed(2)}`
}

/**
 * Transform document category from API format to display format
 * @param category - Category from API (e.g., 'EARNINGS_PREVIEW', 'COMPANY_MEETING_GROUP')
 * @returns User-friendly display label (e.g., 'Earnings Preview', 'Company Meeting (Group Meeting)'), or '-' if null
 */
export function transformCategory(category: string | null | undefined): string {
  // If category is null or empty, return "-" instead of fallback text
  if (!category) return '-'

  return (
    CATEGORY_TO_DISPLAY_TYPE_MAP[category] ||
    CATEGORY_TO_DISPLAY_TYPE_MAP[category.toUpperCase()] ||
    // Format the raw value: EARNINGS_PREVIEW -> Earnings Preview
    category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  )
}

/**
 * Memo `model_document` files are stored under .../document_data/<uuid>_<filename>;
 * supporting uploads use .../document_data/attached_documents/...
 * The content list API often returns category/document_type null for model sidecar rows even when
 * the submit payload included type; infer "Model" for display when S3 layout matches model uploads.
 */
export function isMemoModelDocumentS3ObjectPath(s3ObjectName: string | null | undefined): boolean {
  if (!s3ObjectName) return false
  const p = s3ObjectName.toLowerCase()
  return p.includes('/document_data/') && !p.includes('/attached_documents/')
}

export function resolveDocumentListType(apiDoc: {
  content_type?: string
  category?: string | null
  document_type?: string | null
  s3_object_name?: string | null
}): string {
  const raw = apiDoc.category ?? apiDoc.document_type ?? undefined
  const label = transformCategory(raw)
  if (label !== '-') return label
  if (
    apiDoc.content_type?.toUpperCase() === 'DOCUMENT' &&
    isMemoModelDocumentS3ObjectPath(apiDoc.s3_object_name)
  ) {
    return 'Model'
  }
  return '-'
}

export const getAnalystNames = (
  analystDetails?: { name?: string }[],
  fallback?: { name?: string }[]
): string => {
  const names =
    analystDetails?.map((a) => a.name).filter(Boolean) ??
    fallback?.map((a) => a.name).filter(Boolean) ??
    []

  return names.length > 0 ? names.join(', ') : '-'
}

export const normalizeDoc = (
  doc: NormalizeDocInput,
  source: 'api' | 'upload' | 'archive'
): RelatedDocument => {
  switch (source) {
    case 'api':
      return {
        id: String(doc.id),
        title: doc.title ?? 'Untitled Document',
        filename: doc.filename ?? null,
        category: doc.category ?? null,
        content_type: doc.content_type ?? null,
        size: doc.size ?? null,
      }
    case 'upload':
      return {
        id: String(doc.id),
        title: doc.title ?? 'Untitled Document',
        filename: doc.filename ?? null,
        category: null,
        content_type: null,
        size: null,
      }
    case 'archive':
      return {
        id: String(doc.id),
        title: doc.title ?? 'Untitled Document',
        filename: doc.filename ?? null,
        category: doc.type ?? null,
        content_type: null,
        size: null,
      }
  }
}

/** Map API attached_documents entries to list rows (S3 blobs on parent content, not content IDs). */
export function normalizeAttachedDocument(
  att: { s3_key?: string; filename?: string },
  index: number
): RelatedDocument {
  const filename = att.filename?.trim() || 'Attachment'
  const id = att.s3_key?.trim() || `attached-${index}-${filename}`
  return {
    id,
    title: filename,
    filename,
    s3_key: att.s3_key ?? null,
    category: null,
    content_type: null,
    size: null,
  }
}

/**
 * Generate a unique ID with fallback for environments without crypto.randomUUID
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp-based ID
 * @returns A unique string identifier
 */
export function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
