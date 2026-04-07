import type { Dispatch, DragEvent, ChangeEvent, ReactElement, SetStateAction } from 'react'
import { Badge } from '@/components/ui/badge'
import type {
  ApiDocument,
  AttachedDocumentDownloadItem,
  AttachedDocumentsDownloadUrlsResponse,
  DocumentScenario,
  DocumentSource,
  DocumentStatusType,
  GetAIIconWithTooltipParams,
  RelatedDocument,
  SaveOrPublishDeps,
  SaveOrPublishParams,
  UpdateContentPayload,
  PendingSupportingUpload,
  UploadedSupportingDocument,
  SupportingUploadUrlInfo,
} from './types'

export type {
  DocumentScenario,
  DocumentSource,
  DocumentStatusType,
  GetAIIconWithTooltipParams,
} from './types'
import type { FileUrlResponse, MemoTemplateId, MutateFn } from '@/containers/memos/lib/types'
import {
  formValuesToApiData,
  getTemplateFields,
  VCP_MEDIA_FIELDS,
} from '@/containers/memos/lib/helpers'
import { apiRawValueToUserMultiFormString } from '@/containers/memos/lib/user-multi-field'
import { AI_STATUS_CONFIG, CATEGORY_TO_TEMPLATE_MAP } from './constants'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import notify from '@/lib/notifications'
import { getApiErrorDetail } from '@/lib/utils'
import { documentsService } from '@/services/api/documents.service'

export function getDocumentSource(apiDoc: ApiDocument): DocumentSource {
  const contentType = apiDoc.content_type?.toUpperCase()

  if (contentType === 'MEMO') {
    return 'template'
  }

  // Default to upload for DOCUMENT and any other content types
  return 'upload'
}

export function getDocumentStatus(apiDoc: ApiDocument): DocumentStatusType {
  const status = apiDoc.status?.toUpperCase()
  return status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
}

export function getEmptyStateMessages(
  hasNoDocuments: boolean,
  filteredCount: number
): { title: string; description: string } {
  if (hasNoDocuments) {
    return {
      title: 'No documents yet',
      description: 'Get started by uploading your first document in the Research Updates page.',
    }
  }
  if (filteredCount === 0) {
    return {
      title: 'No documents found',
      description: "Try adjusting your search or filter criteria to find what you're looking for.",
    }
  }
  return {
    title: 'No documents',
    description: 'Upload documents to see them here.',
  }
}

export function getDocumentScenario(apiDoc: ApiDocument): DocumentScenario {
  const source = getDocumentSource(apiDoc)
  const status = getDocumentStatus(apiDoc)

  if (source === 'template' && status === 'DRAFT') {
    return 'draft-template'
  }
  if (source === 'template' && status === 'PUBLISHED') {
    return 'published-template'
  }
  return 'uploaded'
}

/** Templates that do not support Edit & Save as Draft (Investment Memo, Screen, GCP) */
const DRAFT_DISABLED_TEMPLATE_IDS = new Set<MemoTemplateId>([
  'investment-memo',
  'screen',
  'vcp-screen',
])
/** Map document category to MemoTemplateId */
export function mapCategoryToTemplateId(
  category: string | null | undefined
): MemoTemplateId | null {
  if (!category) return null
  return CATEGORY_TO_TEMPLATE_MAP[category.toUpperCase()] ?? null
}

/** True if this template supports Edit & Save as Draft on the Document Details page. */
export function isDraftEnabledTemplate(templateId: MemoTemplateId | null): boolean {
  return templateId !== null && !DRAFT_DISABLED_TEMPLATE_IDS.has(templateId)
}

/** Build supporting documents list. */
export function getSupportingDocumentsFromDetails(
  apiDocument: ApiDocument | null | undefined,
  currentDocumentId?: string | number
): RelatedDocument[] {
  const details = apiDocument?.relevant_documents_details
  if (!Array.isArray(details) || details.length === 0) return []
  const currentId = currentDocumentId != null ? Number(currentDocumentId) : NaN
  return details
    .filter((doc) => doc.id !== currentId)
    .map((doc) => ({
      id: String(doc.id),
      title: doc.title ?? 'Untitled Document',
      filename: doc.filename ?? null,
      category: doc.category ?? null,
      content_type: doc.content_type ?? null,
      size: doc.size ?? null,
    }))
}

function camelToSnake(s: string): string {
  return s
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

/**
 * Normalize template_data keys to match form field ids (camelCase).
 * Ensures draft data loads correctly when API uses snake_case or different keys.
 */
export function normalizeTemplateDataForForm(
  data: Record<string, unknown>,
  templateId: MemoTemplateId | null
): Record<string, unknown> {
  if (!templateId) return data
  const fieldIds = getTemplateFields(templateId).map((f) => f.id)
  const result: Record<string, unknown> = { ...data }
  for (const fieldId of fieldIds) {
    if (result[fieldId] !== undefined && result[fieldId] !== null) continue
    const snakeKey = camelToSnake(fieldId)
    if (data[snakeKey] !== undefined) result[fieldId] = data[snakeKey]
  }
  for (const f of getTemplateFields(templateId)) {
    if (f.type !== 'user_multi') continue
    const key = f.id
    if (result[key] === undefined || result[key] === null) continue
    result[key] = apiRawValueToUserMultiFormString(result[key])
  }
  return result
}

/**
 * Extract form data from document schema_data or extracted_data
 */
export function extractFormData(apiDoc: ApiDocument): Record<string, unknown> {
  // Try schema_data first (for template documents)
  if (apiDoc.schema_data && typeof apiDoc.schema_data === 'object') {
    return apiDoc.schema_data as Record<string, unknown>
  }

  // Fallback to extracted_data
  if (apiDoc.extracted_data && typeof apiDoc.extracted_data === 'object') {
    return apiDoc.extracted_data as Record<string, unknown>
  }

  // Fallback to doc_metadata
  if (apiDoc.doc_metadata && typeof apiDoc.doc_metadata === 'object') {
    return apiDoc.doc_metadata as Record<string, unknown>
  }

  return {}
}

/**
 * Returns true if the value is empty, whitespace-only, or a select placeholder
 * (e.g. "Select...", "..."). Use when validating required form fields for draft publish.
 */
export function isInvalidSelectValue(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return trimmed.length === 0 || value.toLowerCase().startsWith('select') || value === '...'
}

/**
 * Check if company stage allows maintenance task creation
 * Only WATCHLIST and INVESTED (Portfolio) stages allow it
 */
export function canCreateMaintenanceTask(companyStageSlug: string | null | undefined): boolean {
  if (!companyStageSlug) return false
  const slugUpper = companyStageSlug.toUpperCase()
  return slugUpper === 'WATCHLIST' || slugUpper === 'INVESTED'
}

/**
 * Format label by converting snake_case and camelCase to Title Case
 */
export function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Render value as formatted React element
 * Handles various data types: null, boolean, dates, URLs, arrays, objects, and primitives
 */
export function renderValue(value: unknown): ReactElement {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 italic">Not provided</span>
  }

  // Boolean
  if (typeof value === 'boolean') {
    return <Badge variant="secondary">{value ? 'Yes' : 'No'}</Badge>
  }

  // Date / datetime
  if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.length > 10) {
    return (
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {new Date(value).toLocaleString()}
      </span>
    )
  }

  // URL
  if (typeof value === 'string' && value.startsWith('http')) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 underline"
      >
        {value}
      </a>
    )
  }

  // Array - Display in 2-column grid with gray background
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic">Empty array</span>
    }

    // For arrays of objects, display them in a grid
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {value.map((item, idx) => (
            <div key={idx} className="rounded bg-gray-100 p-3 dark:bg-gray-800">
              {Object.entries(item).map(([objKey, objValue]) => (
                <div key={objKey} className="text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {formatLabel(objKey)}:
                  </span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">{String(objValue)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    }

    // For simple arrays, display in 2-column grid
    return (
      <div className="grid grid-cols-2 gap-2">
        {value.map((item, idx) => (
          <div
            key={idx}
            className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          >
            {String(item)}
          </div>
        ))}
      </div>
    )
  }

  // Object
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>
    if (Array.isArray(o.segments)) {
      return (
        <div className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">
          {o.segments.map((item, idx) => {
            if (!item || typeof item !== 'object') return null
            const row = item as Record<string, unknown>
            if (row.type === 'mention') {
              const n =
                (typeof row.displayName === 'string' && row.displayName) ||
                (typeof row.name === 'string' && row.name) ||
                'User'
              return (
                <span
                  key={idx}
                  className="mx-0.5 inline rounded-md bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                >
                  @{String(n)}
                </span>
              )
            }
            if (row.type === 'text' && typeof row.text === 'string') {
              return (
                <span key={idx} className="whitespace-pre-wrap">
                  {row.text}
                </span>
              )
            }
            return null
          })}
        </div>
      )
    }
    if (Array.isArray(o.users) && Array.isArray(o.userIds)) {
      const names: string[] = []
      for (const u of o.users) {
        if (u && typeof u === 'object') {
          const r = u as Record<string, unknown>
          const n = r.displayName ?? r.full_name ?? r.name
          if (typeof n === 'string' && n.trim()) names.push(n.trim())
        }
      }
      if (names.length > 0) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {names.map((name, idx) => (
              <Badge key={`${name}-${idx}`} variant="secondary" className="text-xs font-normal">
                @{name}
              </Badge>
            ))}
          </div>
        )
      }
    }
    return (
      <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
        {Object.entries(value).map(([objKey, objValue]) => (
          <div key={objKey} className="mb-1 text-xs last:mb-0">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formatLabel(objKey)}:
            </span>{' '}
            <span className="text-gray-900 dark:text-gray-100">
              {typeof objValue === 'object' && objValue !== null
                ? JSON.stringify(objValue)
                : String(objValue ?? 'N/A')}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Default
  return <span className="text-sm text-gray-900 dark:text-gray-100">{String(value)}</span>
}

/**
 * Format document date (published_at or created_at) to a readable string
 */
export function formatDocumentDate(document: ApiDocument): string {
  const value = document.published_at || document.created_at
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const handleDragOver =
  (setIsDragging: Dispatch<SetStateAction<boolean>>, isReadOnly: boolean) => (e: DragEvent) => {
    e.preventDefault()
    if (!isReadOnly) {
      setIsDragging(true)
    }
  }

export const handleDragLeave = (setIsDragging: Dispatch<SetStateAction<boolean>>) => () => {
  setIsDragging(false)
}

export const handleDrop =
  (
    setIsDragging: Dispatch<SetStateAction<boolean>>,
    isReadOnly: boolean,
    onUpload?: (files: FileList | null) => void
  ) =>
  (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!isReadOnly && onUpload) {
      onUpload(e.dataTransfer.files)
    }
  }

export const handleFileInput =
  (isReadOnly: boolean, onUpload?: (files: FileList | null) => void) =>
  (e: ChangeEvent<HTMLInputElement>) => {
    if (!isReadOnly && onUpload) {
      onUpload(e.target.files)
    }
  }

export const getAIIconWithTooltip = ({ aiStatus, isPublished }: GetAIIconWithTooltipParams) => {
  if (!isPublished) return null

  const statusKey =
    aiStatus === 'failed' ? 'failed' : aiStatus === 'completed' ? 'completed' : 'pending'

  const config = AI_STATUS_CONFIG[statusKey]
  const Icon = config.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">
          <Icon className={`size-4 ${config.iconClass}`} strokeWidth={2} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="whitespace-nowrap">
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export const getChatPlaceholder = (disableInput: boolean, isSendingMessage: boolean) => {
  if (disableInput) return 'Chat disabled during download...'
  if (isSendingMessage) return 'Sending...'
  return 'Ask about this document...'
}

// Upload pending supporting files to S3 using presigned URLs.
export async function uploadSupportingFilesToS3(
  pendingFiles: PendingSupportingUpload[],
  uploadUrls: SupportingUploadUrlInfo[],
  uploadToS3: (url: string, data: Blob, contentType: string) => Promise<void>
): Promise<PromiseSettledResult<UploadedSupportingDocument>[]> {
  return Promise.allSettled(
    pendingFiles.map(async (p, i) => {
      const info = uploadUrls[i]
      if (!info) throw new Error('Missing upload info')
      await uploadToS3(info.upload_url, p.file, info.content_type)
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        s3_key: info.s3_key,
        content_type: info.content_type,
      }
    })
  )
}

//  Partition S3 upload results into succeeded and failed-by-id for UI updates.
export function partitionS3UploadResults(
  s3Results: PromiseSettledResult<UploadedSupportingDocument>[],
  toUpload: PendingSupportingUpload[]
): { succeeded: UploadedSupportingDocument[]; failedById: Map<string, string> } {
  const succeeded: UploadedSupportingDocument[] = []
  const failedById = new Map<string, string>()
  s3Results.forEach((result, i) => {
    const p = toUpload[i]
    if (!p) return
    if (result.status === 'fulfilled') {
      succeeded.push(result.value)
    } else {
      const errorMessage =
        result.status === 'rejected' && result.reason instanceof Error
          ? result.reason.message
          : 'Upload failed'
      failedById.set(p.id, errorMessage)
    }
  })
  return { succeeded, failedById }
}

// On failure, updates pending state with errors and notifies; returns null.

export async function fetchUploadUrlsForSupportingFiles(
  toUpload: PendingSupportingUpload[],
  generateSupportingDocumentUploadUrls: {
    mutateAsync: (
      files: Array<{ filename: string; content_type: string }>
    ) => Promise<SupportingUploadUrlInfo[]>
  },
  setPendingSupportingUploads: Dispatch<SetStateAction<PendingSupportingUpload[]>>
): Promise<SupportingUploadUrlInfo[] | null> {
  const fileRequests = toUpload.map((p) => ({
    filename: p.file.name,
    content_type: p.file.type || 'application/octet-stream',
  }))
  try {
    return await generateSupportingDocumentUploadUrls.mutateAsync(fileRequests)
  } catch (err) {
    const msg =
      getApiErrorDetail(err) || (err instanceof Error ? err.message : 'Failed to get upload URLs')
    setPendingSupportingUploads((prev) =>
      prev.map((x) =>
        toUpload.some((u) => u.id === x.id) ? { ...x, isUploading: false, uploadError: msg } : x
      )
    )
    notify.error({ title: 'Upload Failed', description: msg })
    return null
  }
}

//  Update pending supporting uploads state after S3 uploads complete:

export function applyPendingUploadsStateAfterS3(
  setPendingSupportingUploads: Dispatch<SetStateAction<PendingSupportingUpload[]>>,
  toUpload: PendingSupportingUpload[],
  s3Results: PromiseSettledResult<UploadedSupportingDocument>[],
  failedById: Map<string, string>
): void {
  setPendingSupportingUploads((prev) =>
    prev
      .map((x) => {
        const err = failedById.get(x.id)
        if (err) return { ...x, isUploading: false, uploadError: err }
        return x
      })
      .filter((p) => {
        const idx = toUpload.findIndex((u) => u.id === p.id)
        if (idx === -1) return true
        return s3Results[idx]?.status === 'rejected'
      })
  )
}

/**
 * PATCH /content/{id}: document_data { filename, s3_key }; model_document adds `title` and `type: "Model"` (API parity with memo POST).
 */
export function buildContentPatchAttachmentStrings(
  succeeded: UploadedSupportingDocument[],
  toUpload: PendingSupportingUpload[]
): { document_data: string; model_document: string } {
  if (succeeded.length === 0) {
    return { document_data: '', model_document: '' }
  }

  const fileNameFor = (s: UploadedSupportingDocument) =>
    toUpload.find((u) => u.id === s.id)?.file?.name ?? s.name

  const toSupportingMeta = (s: UploadedSupportingDocument) => ({
    filename: fileNameFor(s),
    s3_key: s.s3_key,
  })

  const toModelMeta = (s: UploadedSupportingDocument) => {
    const filename = fileNameFor(s)
    return {
      filename,
      s3_key: s.s3_key,
      title: filename,
      type: 'Model',
    }
  }

  const supporting = succeeded.filter((s) => s.type !== 'Model')
  const models = succeeded.filter((s) => s.type === 'Model')

  const stringify = (
    docs: UploadedSupportingDocument[],
    map: (s: UploadedSupportingDocument) => Record<string, string>
  ) => {
    if (docs.length === 0) return ''
    const mapped = docs.map(map)
    return JSON.stringify(mapped.length === 1 ? mapped[0] : mapped)
  }

  return {
    document_data: stringify(supporting, toSupportingMeta),
    model_document: stringify(models, toModelMeta),
  }
}

export const downloadDocumentById = (id: string, mutateFn: MutateFn) => {
  const numericId = parseInt(id, 10)

  if (Number.isNaN(numericId)) {
    notify.error({
      title: 'Download Failed',
      description: 'Invalid document ID.',
    })
    return
  }
  mutateFn(numericId, {
    onSuccess: (result: FileUrlResponse) => {
      if (result.file_url) {
        window.open(result.file_url, '_blank')
        notify.success({
          title: 'Download Started',
          description: 'Your document download has started.',
        })
      } else {
        notify.error({
          title: 'Download Failed',
          description: 'Unable to get download URL.',
        })
      }
    },
    onError: (error: unknown) => {
      console.error('Download error:', error)
      notify.error({
        title: 'Download Failed',
        description: 'Unable to download the document. Please try again.',
      })
    },
  })
}

function firstNonEmptyUrl(item: AttachedDocumentDownloadItem): string | undefined {
  const u =
    item.file_url?.trim() || item.presigned_url?.trim() || item.download_url?.trim() || undefined
  return u || undefined
}

/**
 * Normalizes GET .../attached-documents/download-urls payloads: legacy `{ file_url }` or
 * `{ attached_documents: [{ filename, file_url | error, ... }] }` (often HTTP 200 with per-item errors).
 */
export function extractAttachedDocumentDownloadUrl(
  data: AttachedDocumentsDownloadUrlsResponse | null | undefined,
  filename: string
): { file_url?: string; error?: string } {
  if (!data) {
    return { error: 'Empty response from server.' }
  }
  const flat = data.file_url?.trim()
  if (flat) {
    return { file_url: flat }
  }

  const items = data.attached_documents
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'No download URL in response.' }
  }

  const key = filename.trim().toLowerCase()
  const match =
    items.find((i) => (i.filename ?? '').trim().toLowerCase() === key) ??
    items.find((i) => key && (i.s3_key ?? '').toLowerCase().includes(key.replace(/\s/g, '_'))) ??
    items[0]

  if (!match) {
    return { error: 'No download URL in response.' }
  }
  if (match.error) {
    return { error: String(match.error) }
  }
  const url = firstNonEmptyUrl(match)
  if (url) {
    return { file_url: url }
  }
  return { error: 'No download URL in response.' }
}

const ATTACHED_DOWNLOAD_ERROR_MAX = 280

function truncateForToast(message: string, max: number): string {
  const t = message.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * Supporting documents (attached_documents on the parent memo): presigned URL from
 * GET /content/{parentContentId}/attached-documents/download-urls?filename=...
 */
export async function downloadParentAttachedDocument(
  parentContentId: number,
  doc: RelatedDocument
): Promise<void> {
  const filename = doc.filename?.trim() || doc.title?.trim()
  if (!filename || Number.isNaN(parentContentId)) {
    notify.error({
      title: 'Download Failed',
      description: 'Missing filename or document context for this attachment.',
    })
    return
  }
  try {
    const data = await documentsService.getAttachedDocumentsDownloadUrl(parentContentId, filename)
    const { file_url: url, error: resolvedError } = extractAttachedDocumentDownloadUrl(
      data,
      filename
    )
    if (url) {
      window.open(url, '_blank')
      notify.success({
        title: 'Download Started',
        description: 'Your document download has started.',
      })
      return
    }
    notify.error({
      title: 'Download Failed',
      description: truncateForToast(
        resolvedError || 'Unable to download this attachment. Please try again.',
        ATTACHED_DOWNLOAD_ERROR_MAX
      ),
    })
  } catch (error) {
    console.error('Attached document download error:', error)
    notify.error({
      title: 'Download Failed',
      description:
        getApiErrorDetail(error) || 'Unable to download this attachment. Please try again.',
    })
  }
}

export async function saveOrPublishDocument(
  params: SaveOrPublishParams,
  deps: SaveOrPublishDeps
): Promise<void> {
  const {
    documentId,
    publish,
    formValues,
    rawApiDocument,
    relevant_documents,
    document_data,
    model_document,
  } = params
  const {
    updateContent,
    router,
    invalidateDocumentDetail,
    setLoading,
    processScreenTemplateCharts,
    processInvestmentMemoImages,
    vcpMediaFields = VCP_MEDIA_FIELDS,
    generateUploadUrlsMutation,
    uploadToS3,
  } = deps

  const actionName = publish ? 'Publish' : 'Save'

  if (!publish && !rawApiDocument) {
    notify.error({
      title: `${actionName} Failed`,
      description: 'Document data not available.',
    })
    return
  }

  setLoading?.(true)

  try {
    let payload: UpdateContentPayload = { publish }

    // Build payload only when formValues and rawApiDocument exist (details page case)
    if (formValues && rawApiDocument) {
      let processedFormValues = formValues
      const category = rawApiDocument.category?.toUpperCase()
      const hasUploadDeps = Boolean(generateUploadUrlsMutation && uploadToS3)

      type ImageProcessor = () => Promise<typeof formValues>
      let runImageProcessor: ImageProcessor | null = null

      switch (category) {
        case 'SCREEN':
          if (processScreenTemplateCharts && hasUploadDeps) {
            runImageProcessor = () =>
              processScreenTemplateCharts(
                formValues,
                generateUploadUrlsMutation!.mutateAsync,
                uploadToS3!
              )
          }
          break
        case 'INVESTMENT_MEMO':
          if (processInvestmentMemoImages && hasUploadDeps) {
            runImageProcessor = () =>
              processInvestmentMemoImages(
                formValues,
                generateUploadUrlsMutation!.mutateAsync,
                uploadToS3!
              )
          }
          break
        case 'GOING_IN_VALUE_CREATION_PLAN': // ← Fixed: was 'VCP_SCREEN'
          if (processInvestmentMemoImages && hasUploadDeps) {
            runImageProcessor = () =>
              processInvestmentMemoImages(
                formValues,
                generateUploadUrlsMutation!.mutateAsync,
                uploadToS3!,
                vcpMediaFields as string[]
              )
          }
          break
        default:
          break
      }

      if (runImageProcessor) {
        try {
          const result = await runImageProcessor()
          if (result !== undefined) {
            processedFormValues = result
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError)
          notify.error({
            title: 'Image Upload Failed',
            description: 'Failed to upload images. Please try again.',
          })
          return
        }
      }

      const templateDataObject = formValuesToApiData(processedFormValues)
      const templateId = mapCategoryToTemplateId(rawApiDocument.category)

      const title = isDraftEnabledTemplate(templateId)
        ? String(processedFormValues.title ?? '').trim() || rawApiDocument.title
        : rawApiDocument.title

      payload = {
        title,
        description: rawApiDocument.description,
        category: rawApiDocument.category,
        company_ids: rawApiDocument.company_ids,
        template_data: JSON.stringify(templateDataObject),
        publish,
      }
    }

    if (relevant_documents !== undefined) {
      payload.relevant_documents = relevant_documents
    }

    if (document_data !== undefined && document_data !== null && document_data !== '') {
      payload.document_data = document_data
    }

    if (model_document !== undefined && model_document !== null && model_document !== '') {
      payload.model_document = model_document
    }

    await updateContent({ contentId: documentId, data: payload })

    notify.success({
      title: publish ? 'Published' : 'Draft Saved',
      description: publish
        ? 'Document has been published successfully.'
        : 'Your changes have been saved as a draft.',
    })

    if (publish) {
      invalidateDocumentDetail?.(documentId)
      router?.refresh()
    } else if (
      relevant_documents !== undefined ||
      document_data !== undefined ||
      model_document !== undefined
    ) {
      invalidateDocumentDetail?.(documentId)
    }
  } catch (error) {
    console.error(`${actionName} error:`, error)

    notify.error({
      title: `${actionName} Failed`,
      description:
        getApiErrorDetail(error) ||
        (error instanceof Error
          ? error.message
          : `Unable to ${actionName.toLowerCase()} document. Please try again.`),
    })
  } finally {
    setLoading?.(false)
  }
}
