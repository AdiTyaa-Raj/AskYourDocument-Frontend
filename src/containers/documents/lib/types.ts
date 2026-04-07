/**
 * Document Types
 * All document-related type definitions
 *
 * Structure:
 * 1. API Types (responses from backend)
 * 2. UI Types (transformed for frontend use)
 * 3. Component Props
 */

import type { ReactNode } from 'react'
import type {
  MemoFormValues,
  MemoUserMultiFieldResources,
  TemplateDataUploadUrlResponse,
} from '@/containers/memos/lib/types'
import type { ProcessingStatus } from '@/lib/processing-status-utils'
import type { ApiFinancialsRatios, InvestmentThesis } from '@/containers/tearsheet/lib/type'
import type { MaintenanceTaskData, AssigneeOption } from '@/containers/memos/lib/types'
import type { ListedOrgUser } from '@/services/api/users.service'

// ==========================================
// Common Types
// ==========================================

/**
 * Document Status Types
 * Used for UI representation of document processing state
 */
export type DocumentStatus = 'completed' | 'pending' | 'in-progress' | 'failed'

export type DocumentSource = 'template' | 'upload'

export type DocumentStatusType = 'DRAFT' | 'PUBLISHED'

export type DocumentScenario = 'draft-template' | 'published-template' | 'uploaded'

export interface GetAIIconWithTooltipParams {
  aiStatus?: 'failed' | 'completed' | 'pending' | null
  isPublished: boolean
}

// ==========================================
// API Response Types
// ==========================================

/**
 * API Document Response from Backend
 * Raw document data as received from the API
 */
export interface ApiDocument {
  id: number
  content_type: string // "DOCUMENT" or "MEMO"
  category: string | null
  title: string
  description: string | null
  primary_company_id: number
  company_ids: number[]
  snapshot_id: number | null
  user_id: number
  org_id: number
  s3_object_name: string | null
  file_metadata: {
    filename: string
    file_size: number
    mime_type: string
    file_extension: string
    original_filename: string
  }
  status: string // "DRAFT" or "PUBLISHED"
  published_at: string | null
  text_extraction_status: ProcessingStatus
  chunking_status: ProcessingStatus
  embedding_status: ProcessingStatus
  analysis_status: ProcessingStatus
  created_at: string
  updated_at: string
  primary_company_details: {
    id: number
    ticker: string
    name: string
    exchange?: string
  }
  company_details: Array<{
    id: number
    ticker: string
    name: string
  }>
  user_details: {
    id: number
    name: string
  }
  // Optional fields
  actionable?: string | null
  extracted_text?: string | null
  extraction_error?: string | null
  user_access?: string[]
  doc_metadata?: Record<string, unknown> | null
  file_hash?: string | null
  extracted_data?: Record<string, unknown> | null
  analysis_data?: Record<string, unknown> | null
  schema_data?: Record<string, unknown>
  template_data?: Record<string, unknown> | null
  // Legacy fields (for backward compatibility with old documents API)
  original_filename?: string
  filename?: string
  file_extension?: string
  document_type?: string
  ticker?: string | null
  uploaded_by?: string
  file_size?: number
  mime_type?: string
  primary_company_id_details?: {
    id: number
    ticker: string
  }
  company_ids_details?: Array<{
    id: number
    ticker: string
  }>
  uploaded_by_details?: {
    id: number
    name: string
  }
  primary_analysts?: Array<{
    id: number
    name: string
  }>
  secondary_analysts?: Array<{
    id: number
    name: string
  }>
  /** Analyst names for Document Properties; preferred over primary_analysts/secondary_analysts */
  analyst_details?: {
    primary?: Array<{ id?: number; name: string }>
    secondary?: Array<{ id?: number; name: string }>
  } | null
  relevant_documents_details?: RelevantDocumentDetail[] | null
  /** Linked archive content IDs (memos / documents) */
  relevant_documents?: number[] | null
  /** Direct uploads attached to this content (e.g. memo supporting files) */
  attached_documents?: Array<{ s3_key?: string; filename?: string }> | null
  /** Whether the current user can delete this content (documents:delete permission) */
  can_delete?: boolean
}

export interface RelevantDocumentDetail {
  id: number
  title?: string | null
  /** Original file name for attached-document download API */
  filename?: string | null
  category?: string | null
  content_type?: string | null
  size?: number | null
}

/**
 * Document API Response with Pagination
 */
export interface DocumentApiResponse {
  data: ApiDocument[]
  total: number
  skip: number
  limit: number
  message: string
}

/**
 * Single Document API Response
 */
export interface SingleDocumentApiResponse {
  data: ApiDocument
}

/**
 * Payload for updating content (PATCH /api/v1/content/{content_id})
 */
export interface UpdateContentPayload {
  title?: string | null
  description?: string | null
  category?: string | null
  template_data?: string | null
  company_ids?: number[] | null
  relevant_documents?: number[] | null
  publish?: boolean
  maintenance_data?: string | null
  document_data?: string | null
  model_document?: string | null
}

/**
 * Upload Document API Response
 * Response from the upload endpoint which has a simplified structure
 */
export interface UploadDocumentApiResponse {
  id: number
  filename: string
  file_size: number
  mime_type: string
  status: string
  message: string
  extracted_length: number | null
  has_extracted_text: boolean
  document_type: string
}

/**
 * Document File URL Response
 * Response from the presigned URL endpoint
 */
export interface DocumentFileUrlResponse {
  document_id: number
  file_url: string
  expires_in: number
  message: string
}

/** GET /content/{id}/attached-documents/download-urls — API may return this shape (200 + per-item errors). */
export interface AttachedDocumentDownloadItem {
  filename?: string | null
  s3_key?: string | null
  file_url?: string | null
  presigned_url?: string | null
  download_url?: string | null
  error?: string | null
}

export interface AttachedDocumentsDownloadUrlsResponse {
  content_id?: number
  /** Some deployments return a single URL at the top level */
  file_url?: string | null
  attached_documents?: AttachedDocumentDownloadItem[] | null
}

// ==========================================
// UI Types
// ==========================================

/**
 * UI-friendly Document Type
 * Transformed document for display in the UI
 */
export interface Document {
  // Basic Info
  id: string
  title: string
  ticker: string
  exchange?: string
  type: string
  source?: 'template' | 'upload'
  author: string
  primary: string
  secondary: string
  date: string
  actionable: string | null
  status: DocumentStatus

  // File Info
  file_name?: string
  filename?: string
  created_at?: string
  updated_at?: string
  file_type?: string
  file_size?: number
  mime_type?: string
  description?: string | null
  confidence?: number
  pages?: string
  category?: string

  // Status Fields
  text_extraction_status?: string
  chunking_status?: string
  embedding_status?: string
  analysis_status?: string

  /** Whether the current user can delete this content */
  can_delete?: boolean

  // Extended properties for detail view
  company?: string
  strategy?: string
  uploader?: string
  uploadDate?: string
  datePublished?: string

  // Financial metrics (for detail view)
  earnings?: string
  earningsChange?: string
  ebita?: string
  ebitaChange?: string
  eps?: string
  epsChange?: string

  // Internal metrics (for detail view)
  targetWeight?: string
  actualWeight?: string
  ive?: string
  downside?: string
  downsidePercent?: string
  irr?: string
  riskReward?: string
  thesis?: string

  // Related content
  relatedDocuments?: RelatedDocument[]
  extracted_text?: string | null

  /**
   * Documents list attachment column: MEMO → Y/N from relevant_documents / attached_documents;
   * DOCUMENT (standalone upload) → "N/A" (with slash; see DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE).
   */
  attachment?: 'Y' | 'N' | 'N/A'
}

// ==========================================
// Document Viewer Types
// ==========================================

export type DocumentFileType = 'pdf' | 'docx' | 'xlsx' | 'image' | 'other'

export interface XlsxSheetMeta {
  totalRows: number
  totalColumns: number
  visibleRows: number
  visibleColumns: number
}

export interface ParsedXlsxSheet {
  name: string
  html: string
  meta: XlsxSheetMeta
}

/**
 * Related Document Reference
 */
export interface RelatedDocument {
  id: string
  title: string
  /** Storage filename for GET .../attached-documents/download-urls */
  filename?: string | null
  /** Present for parent content blobs from attached_documents (not archive content rows) */
  s3_key?: string | null
  category: string | null
  content_type: string | null
  size: number | null
}

/**
 * Pagination State
 */
export interface PaginationState {
  total: number
  page: number
  size: number
}

/**
 * Documents Response (Legacy - for backward compatibility)
 */
export interface DocumentsResponse {
  data: {
    documents: Document[]
    total: number
    page: number
    size: number
  }
}

/**
 * Options for useDocuments hook (pagination, search, filters)
 */
export interface UseDocumentsOptions {
  enabled?: boolean
  search?: string
  category?: string
  status?: string
  sort?: string
  /** Filter content by creator user id (GET /content/?author_id=) */
  authorId?: number
  filters?: Record<string, unknown>
}

/** Org user row for documents UI (author filter, etc.). Alias of ListedOrgUser. */
export type DocumentAuthorListUser = ListedOrgUser

/** One infinite-query page for document author users (GET /users/). */
export interface DocumentAuthorUsersPage {
  users: ListedOrgUser[]
  total: number
}

/** Metadata for presigned S3 document upload (register after S3 PUT). */
export interface UploadDocumentPresignedMetadata {
  title?: string
  uploaded_by?: string
  description?: string
  ticker?: string
  primary_company_id: number
  company_ids?: number[]
  document_type?: string
  actionable?: string
  category?: string
  publish?: boolean
}

export interface UploadDocumentMutationInput {
  file: File
  metadata: UploadDocumentPresignedMetadata
}

export interface UpdateContentMutationVariables {
  contentId: string | number
  data: UpdateContentPayload
}

export interface ReprocessDocumentMutationVariables {
  docId: string | number
  hardReprocess?: boolean
}

// ==========================================
// Upload Types
// ==========================================

/**
 * Document Metadata for Upload
 */
export interface DocumentMetadata {
  primaryCompany: string
  companies: string[]
  documentType: string
  actionable: string
  rationale: string
}

/**
 * Company Option for Metadata Dialog
 */
export interface CompanyOption {
  id: string
  ticker: string
  name: string
}

// ==========================================
// Component Props
// ==========================================

/**
 * Document Detail Container Props
 */
export interface DocumentDetailContainerProps {
  documentId: string
  onClose?: () => void
}

/**
 * Tearsheet data for document properties.
 * Uses the same sources as the Tearsheet (e.g. financials_ratios) so consensus
 * and fallbacks stay consistent (e.g. N/A when Tearsheet shows N/A).
 */
export interface TearsheetDataForDocument {
  keyMetrics: {
    iv: string
    downside: string
    target: string
    irr: string
    moc: string
    riskReward: string
  } | null
  investmentThesis: InvestmentThesis | null
  /** Same source as Tearsheet Financials & Ratios; used for consensus with N/A fallback */
  financialsRatios: ApiFinancialsRatios | null
  yfinance:
    | {
        revenue_last_year?: number
        ebitda_last_year?: number
        eps_last_year?: number
      }
    | null
    | undefined
}

/**
 * Document Properties Component Props
 */
export interface DocumentPropertiesProps {
  document: Document
  tearsheetData?: TearsheetDataForDocument | null
  thesisExpanded: boolean
  onThesisToggle: () => void
  internalMetricsExpanded: boolean
  onInternalMetricsToggle: () => void
  consensusExpanded: boolean
  onConsensusToggle: () => void
}

/**
 * Document Viewer Component Props
 */
export interface DocumentViewerProps {
  filename: string
  mimeType?: string
  extractedText?: string | null
  textExtractionStatus?: string
  fileUrlData?: DocumentFileUrlResponse | null
  isLoadingFileUrl?: boolean
}

export interface RelatedDocumentsProps {
  documents: RelatedDocument[]
  onDocumentClick: (id: string) => void
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatHistoryProps {
  messages: ChatMessage[]
}

export interface DocumentChatStatus {
  ready: boolean
  document_id: number
  chunk_count: number
  chunking_status: string
  embedding_status: string
  message: string
}

/**
 * Document Chat Request
 */
export interface DocumentChatRequest {
  content_id: number
  query: string
  chat_id?: number | null
}

/**
 * Document Chat Response
 */
export interface DocumentChatResponse {
  answer: string
  chat_id: number
}

/**
 * Ask AI Assistant Component Props
 */
export interface AskAIAssistantProps {
  documentId: string
  rawApiDocument?: ApiDocument

  // Data from container
  chatStatus?: DocumentChatStatus
  isLoadingStatus?: boolean
  statusError?: Error | null
  chatHistory: ChatMessage[]
  chatId?: number

  // Callbacks from container
  onSendMessage: (query: string) => void
  onRetryAnalysis: () => void
  isSendingMessage?: boolean
  isRetrying?: boolean
  disableInput?: boolean
}

/**
 * Document Metadata Dialog Props
 */
export interface DocumentMetadataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (metadata: DocumentMetadata) => void
  fileName?: string
  isLoading?: boolean
}

/**
 * Maintenance Task Form Component Props
 */
export interface MaintenanceTaskFormProps {
  companyTicker: string
  companyId?: string | number
  maintenanceTask: MaintenanceTaskData
  analysts: AssigneeOption[]
  onTaskChange: (field: string, value: string | string[] | boolean) => void
  onCancel?: () => void
  onSubmit?: () => void
  isSubmitting?: boolean
  isViewOnly?: boolean
  showCard?: boolean
  showButtons?: boolean
  showCompanyInfo?: boolean
}

/**
 * Props for DocumentDraftForm component
 */
export interface DocumentDraftFormProps {
  document: ApiDocument
  formValues: import('@/containers/memos/lib/types').MemoFormValues
  onFieldChange?: (fieldId: string, value: string) => void
  onSaveDraft?: () => void
  onPublish?: () => void
  isSaving?: boolean
  isPublishing?: boolean
  validationErrors?: Set<string>
  isViewOnly?: boolean
  isDraftMode?: boolean
  /** Use view mode styling (centered card, nice header) even when fields are editable */
  useViewModeLayout?: boolean
  /** Presigned URLs for S3 images in template_data (maps s3Key to presigned URL) */
  templateImageUrls?: Record<string, string>
  userMultiFieldResources: MemoUserMultiFieldResources
}

/**
 * Props for MemoFieldComponent (used in DocumentDraftForm)
 */
export interface MemoFieldComponentProps {
  field: import('@/containers/memos/lib/types').MemoFieldDefinition
  value: string
  validationErrors?: Set<string>
  onChange?: (fieldId: string, value: string) => void
  isViewOnly?: boolean
  userMultiFieldResources: MemoUserMultiFieldResources
}

type MemoGenerateUploadUrlsFn = (
  files: Array<{ filename: string; content_type: string }>
) => Promise<TemplateDataUploadUrlResponse[]>

type MemoUploadToS3Fn = (url: string, data: Blob, contentType: string) => Promise<void>

/** Matches processScreenTemplateCharts in memos helpers (type-only, no runtime import). */
export type ProcessScreenTemplateChartsFn = (
  formValues: MemoFormValues,
  generateUploadUrls: MemoGenerateUploadUrlsFn,
  uploadToS3: MemoUploadToS3Fn
) => Promise<MemoFormValues>

/** Matches processInvestmentMemoImages in memos helpers (type-only, no runtime import). */
export type ProcessInvestmentMemoImagesFn = (
  formValues: MemoFormValues,
  generateUploadUrls: MemoGenerateUploadUrlsFn,
  uploadToS3: MemoUploadToS3Fn,
  mediaFields?: readonly string[]
) => Promise<MemoFormValues>

/** Params for the shared save/publish function. */
export type SaveOrPublishParams = {
  documentId: string
  publish: boolean
  formValues?: MemoFormValues
  rawApiDocument?: ApiDocument | null
  relevant_documents?: number[]
  document_data?: string | null
  model_document?: string | null
}

/** Dependencies for the shared save/publish function (mutations, router, optional form processing). */
export type SaveOrPublishDeps = {
  updateContent: (
    vars: { contentId: string; data: UpdateContentPayload },
    opts?: { onSuccess?: () => void; onError?: (error: Error) => void }
  ) => void
  router: { refresh: () => void }
  invalidateDocumentDetail: (id: string) => void
  setLoading?: (loading: boolean) => void
  processScreenTemplateCharts?: ProcessScreenTemplateChartsFn
  processInvestmentMemoImages?: ProcessInvestmentMemoImagesFn
  vcpMediaFields?: readonly string[]
  generateUploadUrlsMutation?: {
    mutateAsync: MemoGenerateUploadUrlsFn
  }
  uploadToS3?: MemoUploadToS3Fn
}

export interface ArchiveDocumentItem {
  id: string
  title: string
  ticker?: string
  exchange?: string
  type?: string
  date: string
}

export interface UploadedFileItem {
  id: string
  name: string
  size: string
  type?: string
  isUploading?: boolean
  uploadError?: string
}

export interface PendingSupportingUpload {
  id: string
  name: string
  size: string
  type: string
  file: File
  isUploading?: boolean
  uploadError?: string
}

export interface SupportingDocumentsCardProps {
  isFieldsEnabled?: boolean
  isViewOnly?: boolean
  /** Card header label (default: Supporting Documents) */
  cardTitle?: string
  /** Overrides default empty state copy for the attached/listed documents section */
  emptyAttachedListMessage?: string
  archive?: {
    documents: ArchiveDocumentItem[]
    selectedIds: string[]
    onSelect: (documentId: string) => void
    onRemove?: (documentId: string) => void
    onSearchFocus?: () => void
    searchPlaceholder?: string
    /** Shown when archive search is disabled (e.g. primary company not selected) */
    disabledSearchPlaceholder?: string
    showSelectedList?: boolean
  }
  upload?: {
    onUpload: (files: FileList | null) => void
    disabledMessage?: string
  }
  uploadedFiles?: {
    files: UploadedFileItem[]
    getFileIcon: (file: UploadedFileItem) => ReactNode
    getFileStatusText: (file: UploadedFileItem) => string
    onRemoveFile: (fileId: string) => void
  }
  attachedDocuments?: {
    documents: RelatedDocument[]
    onDocumentClick: (doc: RelatedDocument) => void
    onDownload?: (doc: RelatedDocument) => void
    onRemove?: (id: string) => void
  }
  isLoading?: boolean
  className?: string
}

export interface NormalizeDocInput {
  id: number | string
  title?: string | null
  filename?: string | null
  category?: string | null
  content_type?: string | null
  size?: number | null
  type?: string
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type?: string
  file?: File
  s3_key?: string
  content_type?: string
  isUploading?: boolean
  uploadError?: string
}

export type UploadedSupportingDocument = {
  id: string
  name: string
  type: string
  s3_key: string
  content_type: string
}

export interface SupportingUploadUrlInfo {
  upload_url: string
  s3_key: string
  content_type: string
}
