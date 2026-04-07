import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { DocumentMetadata } from '@/containers/documents/lib/types'
import type { ListedOrgUser, UserDirectoryMap } from '@/services/api/users.service'
import type { ProcessingStatus as ProcessingStatusType } from '@/lib/processing-status-utils'
import type {
  MEMO_TYPE_FILTER_OPTIONS,
  MEMO_STATUS_FILTER_OPTIONS,
  MEMO_ANALYST_FILTER_OPTIONS,
  UPLOAD_DOCUMENT_TYPE_OPTIONS,
  ALLOWED_NAVIGATION_KEYS,
} from './constants'

// Re-export for convenience
export type ProcessingStatus = ProcessingStatusType

export type MemoTemplateId =
  | 'vcp-screen'
  | 'earnings-preview'
  | 'earnings-summary'
  | 'target-weight-change'
  | 'meeting-owned'
  | 'meeting-watchlist'
  | 'meeting-first'
  | 'meeting-lesser'
  | 'drawdown-40'
  | 'investment-memo'
  | 'screen'

export interface MemoTemplate {
  id: MemoTemplateId
  name: string
  description: string
  icon: LucideIcon
}

export type MemoFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'date'
  | 'datetime-local'
  | 'url'
  | 'yesno'
  /** Org directory multi-select; form value is JSON string (see user-multi-field helpers). */
  | 'user_multi'

export interface MemoFieldDefinition {
  id: string
  label: string
  type: MemoFieldType
  required?: boolean
  placeholder?: string
  helperText?: string
  selectOptions?: string[]
  step?: string
  maxWords?: number
  maxBullets?: number
  /** When true, date/datetime-local inputs only allow today and future dates (no past dates). */
  disallowPastDates?: boolean
}

export interface TemplateUserMentionPickerData {
  users: ListedOrgUser[]
  isLoading: boolean
  isError: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
}

export interface TemplateUserMultiSelectProps {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  placeholder?: string
  helperText?: string
  className?: string
  fetchUsersByIds: (ids: number[]) => Promise<UserDirectoryMap>
  mentionPicker: TemplateUserMentionPickerData
}

/** Container-provided directory fetch + org list for @-mentions (memo and document draft flows). */
export interface MemoUserMultiFieldResources {
  fetchUsersByIds: (ids: number[]) => Promise<UserDirectoryMap>
  mentionPicker: TemplateUserMentionPickerData
}

export type UserMentionTextChunk = { node: Text; start: number; len: number }

export type UserMentionDomCursor = { node: Text; offset: number }

export interface MemoFormValues {
  primaryCompany?: string // Single primary company ID
  company?: string[] // Changed to array to support multiple companies
  createMaintenanceTask?: boolean // Toggle for creating maintenance task
  [fieldId: string]: string | string[] | boolean | undefined
}

export interface UploadedFile {
  id: string
  name: string
  size: string
  type?: string // Document type (e.g., "Misc", "Models", etc.)
  file?: File // The actual file object
  s3_key?: string // S3 key after upload
  content_type?: string // Content type of the file
  isUploading?: boolean // Whether the file is currently being uploaded
  uploadError?: string // Error message if upload failed
}

export interface CompanyOption {
  id: string
  ticker: string
  name: string
  exchange?: string
  gics?: string
  stage?: {
    name: string
    slug: string
  }
}

export interface MemoTemplateMetadata {
  template: MemoTemplate
  fields: MemoFieldDefinition[]
}

// ==================== API Types ====================

/**
 * Memo status type from API
 */
export type MemoStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

/**
 * Template type from API (API expects UPPERCASE with UNDERSCORES)
 */
export type ApiTemplateType =
  | 'GOING_IN_VALUE_CREATION_PLAN'
  | 'EARNINGS_PREVIEW'
  | 'EARNINGS_SUMMARY'
  | 'TARGET_WEIGHT_CHANGE'
  | 'MEETING_OWNED'
  | 'MEETING_WATCHLIST'
  | 'MEETING_FIRST'
  | 'MEETING_LESSER'
  | 'DRAWDOWN_40'
  | 'SCREEN'
  | 'INVESTMENT_MEMO'
  | (string & {})

/**
 * Company details from API
 */
export interface ApiCompanyDetails {
  id: number
  ticker: string
  name?: string
}

/**
 * Memo object from API
 */
export interface ApiMemo {
  id: number
  title: string
  template_type: ApiTemplateType
  user_id: string
  organization_id: string
  status: MemoStatus
  revision_count: number
  data: Record<string, unknown>
  relevant_documents: string[]
  user_access: string[]
  primary_company_id?: number
  company_ids: string[]
  primary_company_id_details?: ApiCompanyDetails
  company_ids_details?: ApiCompanyDetails[]
  created_at: string
  updated_at: string
  submitted_at: string | null
  approved_by: string | null
  rejected_by: string | null
  rejection_reason: string | null
  chunking_status?: ProcessingStatus
  embedding_status?: ProcessingStatus
  analysis_status?: ProcessingStatus
}

/**
 * API response for list of memos
 */
export interface MemosApiResponse {
  data: {
    memos: ApiMemo[]
    total: number
    skip: number
    limit: number
  }
  status: number
  message: string
}

/**
 * API response for single memo
 */
export interface SingleMemoApiResponse {
  data: ApiMemo
  status: number
  message: string
}

/**
 * Payload for creating a new memo (matches /api/v1/content/memo POST endpoint)
 */
export interface CreateMemoPayload {
  title: string
  primary_company_id: number
  category: string
  template_data?: string | null
  company_ids?: number[]
  relevant_documents?: number[]
  publish?: boolean
  maintenance_data?: string | null
  /** Supporting / non-model attachments: JSON of { filename, s3_key } or array of those */
  document_data?: string | null
  /** Model attachment(s): JSON of { filename, s3_key } or array of those */
  model_document?: string | null
}

/** Serialized `document_data` / `model_document` strings built from uploaded files (after S3 upload). */
export interface MemoAttachmentJsonStrings {
  document_data: string | null
  model_document: string | null
}

/** Draft memo update uses the same body as create (PATCH /content/{content_id}) */
export type UpdateMemoPayload = CreateMemoPayload

/**
 * UI Memo type (transformed from API)
 */
export interface UIMemo {
  id: string
  title: string
  ticker: string
  type: string
  primary: string
  secondary: string
  date: string
  status: MemoStatus
  template_type: ApiTemplateType
  revision_count: number
  created_at: string
  updated_at: string
  company_ids?: string[]
  relevant_documents?: string[]
  chunking_status?: ProcessingStatus
  embedding_status?: ProcessingStatus
  analysis_status?: ProcessingStatus
}

/**
 * View state for memo submission container
 */
export type ViewState = 'list' | 'form' | 'view'

// ==================== Component Props ====================

/**
 * Props for MemoSubmissionContainer component
 */
export interface MemoSubmissionContainerProps {
  templateId?: string
  memoId?: string
  mode?: 'edit' | 'view'
}

/**
 * Maintenance Task Data
 */
export interface MaintenanceTaskData {
  title: string
  action: string
  dueDate: string
  assignees: string[]
  important: boolean
  status: 'TODO' | 'INPROGRESS' | 'DONE'
}

/**
 * Analyst/Assignee Option
 */
export interface AssigneeOption {
  id: string
  name: string
  email?: string
}

/**
 * Props for MemoFormView component
 */
export interface MemoFormViewProps {
  template: MemoTemplate
  formValues: MemoFormValues
  fields: MemoFieldDefinition[]
  memoTitle: string
  validationErrors: Set<string>
  uploadedFiles: UploadedFile[]
  isDragging: boolean
  maintenanceTask: MaintenanceTaskData
  analysts: AssigneeOption[]
  canCreateMaintenanceTask: boolean
  showMaintenanceWarning?: boolean
  isEditing?: boolean
  isSubmitting?: boolean
  isPublishing?: boolean
  isLoadingMemo?: boolean
  isViewOnly?: boolean
  memoStatus?: MemoStatus
  preloadedCompanies?: CompanyOption[]
  onBack: () => void
  onSaveAsDraft: () => void
  onSubmitForApproval: () => void
  onFieldChange: (fieldId: string, value: string) => void
  onPrimaryCompanyChange: (companyId: string | undefined, companyData?: SelectedCompanyData) => void
  onCompanyChange: (companyIds: string[], companyData?: CompanyOption) => void
  onMaintenanceTaskToggle: (enabled: boolean) => void
  onMaintenanceTaskChange: (field: string, value: string | string[] | boolean) => void
  onUpload: (files: FileList | null) => void
  /** Uploads with document type Model (earnings / target-weight templates) */
  onModelUpload: (files: FileList | null) => void
  onRemoveFile: (id: string) => void
  onDragStateChange: (state: boolean) => void
  userMultiFieldResources: MemoUserMultiFieldResources
}

/**
 * Props for ModelUploadCard component
 */
export interface ModelUploadCardProps {
  isFieldsEnabled?: boolean
  isViewOnly?: boolean
  upload: {
    onUpload: (files: FileList | null) => void
    disabledMessage?: string
  }
  uploadedFiles?: {
    files: UploadedFile[]
    getFileIcon: (file: UploadedFile) => ReactNode
    getFileStatusText: (file: UploadedFile) => string
    onRemoveFile: (fileId: string) => void
  }
  className?: string
}

/**
 * Props for MemoField component
 */
export interface MemoFieldProps {
  field: MemoFieldDefinition
  value: string
  validationErrors: Set<string>
  onChange: (fieldId: string, value: string) => void
  userMultiFieldResources: MemoUserMultiFieldResources
}

/**
 * Props for TemplateSelectionPage component
 */
export interface TemplateSelectionPageProps {
  templates?: MemoTemplate[]
  onSelect?: (template: MemoTemplate) => void
  onUploadDocument?: (file: File, metadata: DocumentMetadata) => Promise<void>
  isUploadPending?: boolean
}

/**
 * Props for ScreenTemplateForm component
 */
export interface ScreenTemplateFormProps {
  formValues: MemoFormValues
  validationErrors: Set<string>
  onFieldChange: (fieldId: string, value: string) => void
  isViewOnly?: boolean
  isFieldsEnabled?: boolean
  /** Presigned URLs for S3 images in template_data (maps s3Key to presigned URL) */
  templateImageUrls?: Record<string, string>
}

/**
 * Props for InvestmentMemo component
 */
export interface InvestmentMemoProps {
  formValues: MemoFormValues
  validationErrors: Set<string>
  onFieldChange: (fieldId: string, value: string) => void
  isViewOnly?: boolean
  isFieldsEnabled?: boolean
  templateImageUrls?: Record<string, string>
}

/**
 * Configuration for a criteria checklist field
 */
export interface CriteriaFieldConfig {
  label: string
  placeholder: string
  fieldKey: string
}

export type MediaFieldKey =
  // Investment Memo media fields
  | 'introductionOriginStoryMedia'
  | 'thesisRecommendationMedia'
  | 'criteriaChecklistMedia'
  | 'stateOfTheIndustryMedia'
  | 'howWeLoseDollarRisksMedia'
  | 'keyOperationalPrioritiesMedia'
  | 'fundamentalGapValueDriversMedia'
  | 'furtherAreasToExploreMedia'
  // Going-in VCP media fields
  | 'sourcingMedia'
  | 'situationOverviewMedia'
  | 'nonObviousCompChecklistItemsMedia'
  | 'mistakeAvoidanceChecklistItemsMedia'
  | 'trustBankMedia'
  | 'historyInNumbersMedia'
  | 'valueDriversMedia'
  | 'verificationStepsMedia'
  | 'thesisInChartsMedia'
  | 'currentMultipleMedia'
  | 'historicalRangeMedia'
  | 'peerComparisonMedia'
  | 'outstandingQuestionsMedia'

export interface ImageToUpload {
  fieldKey: MediaFieldKey
  blockId: string
  dataUrl: string
  contentType: string
  filename: string
}

/**
 * Props for the CriteriaField component
 */
export interface CriteriaFieldProps {
  config: CriteriaFieldConfig
  formValues: MemoFormValues
  onFieldChange: (fieldId: string, value: string) => void
  isViewOnly: boolean
}

/**
 * Props for ScreenField component (individual field in Screen template)
 */
export interface ScreenFieldProps {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'yesno'
  required?: boolean
  placeholder?: string
  helperText?: string
  selectOptions?: string[]
  step?: string
  maxWords?: number
  value: string | undefined
  onChange: (fieldId: string, value: string) => void
  validationErrors: Set<string>
  isViewOnly: boolean
}

/**
 * Screen template field configuration
 */
export interface ScreenFieldConfig {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'yesno'
  required?: boolean
  placeholder?: string
  helperText?: string
  selectOptions?: string[]
  step?: string
  maxWords?: number
}

/**
 * Screen template section configuration with optional subsections
 */
export interface ScreenSectionConfig {
  title: string
  fields?: ScreenFieldConfig[]
  subsections?: {
    title: string
    fields: ScreenFieldConfig[]
    layout?: 'grid-2' | 'grid-3' | 'grid-4' | 'full'
  }[]
  layout?: 'grid-2' | 'grid-3' | 'grid-4' | 'full'
}

/**
 * Custom KPI for Screen Template
 */
export interface CustomKPI {
  id: string
  name: string
}

/**
 * Investment for Screen Template
 */
export interface Investment {
  id: string
  name: string
  year: string
  rationale: string
  irr: string
}

/**
 * Selected company data for title generation
 */
export interface SelectedCompanyData {
  id: string
  ticker: string
  name: string
  exchange?: string
  gics?: string
}

/**
 * Props for TemplateSelectionContainer
 */
export interface TemplateSelectionContainerProps {
  onSelect?: (template: MemoTemplate) => void
}

/**
 * Props for EconomicsTable component
 */
export interface EconomicsTableProps {
  value: string | undefined
  onChange: (value: string) => void
  isViewOnly?: boolean
}

/**
 * Year column for economics table
 */
export interface YearColumn {
  id: string
  year: string
}

/**
 * Props for RadioCheckField component
 */
export interface RadioCheckFieldProps {
  id: string
  label: string
  value: string | undefined
  onChange: (fieldId: string, value: string) => void
  isViewOnly?: boolean
  placeholder?: string
  maxWords?: number
}

/**
 * Props for ScreenTemplateView component
 */
export interface ScreenTemplateViewProps {
  formValues: MemoFormValues
  /** Presigned URLs for S3 images in template_data (maps s3Key to presigned URL) */
  templateImageUrls?: Record<string, string>
}

/**
 * Props for InvestmentMemoView component
 */
export interface InvestmentMemoViewProps {
  formValues: MemoFormValues
  templateImageUrls?: Record<string, string>
}

/**
 * Props for GoingInVCP component
 */
export interface GoingInVCPProps {
  formValues: MemoFormValues
  validationErrors: Set<string>
  onFieldChange: (fieldId: string, value: string) => void
  isViewOnly?: boolean
  isFieldsEnabled?: boolean
  templateImageUrls?: Record<string, string>
}

/**
 * Props for GoingInVCPView component
 */
export interface GoingInVCPViewProps {
  formValues: MemoFormValues
  templateImageUrls?: Record<string, string>
}

/**
 * Section configuration for VCP sections
 */
export type VCPSectionConfig = {
  title: string
  sectionKey: string
  containerClassName?: string
}

/**
 * Parsed table data structure for economics data grid view
 */
export interface EconomicsTableData {
  columns: Array<{ id: string; label: string }>
  data: Record<string, Record<string, string>>
}

/**
 * Parsed chart structure for supporting charts in view mode
 */
export interface ViewChartData {
  id: string
  title?: string
  caption?: string
  imageUrl?: string
  s3Key?: string
}

/**
 * Props for DataCompletenessChart component (shared between form and view)
 */
export interface DataCompletenessChartProps {
  completed: number
  total: number
  percentage: number
}

/**
 * Props for SupportingChartsView component (view mode only)
 */
export interface SupportingChartsViewProps {
  value: string
  templateImageUrls?: Record<string, string>
}

/**
 * Props for EconomicsDataGridView component (view mode only)
 */
export interface EconomicsDataGridViewProps {
  value: string
}

/**
 * Row data type for economics table in DataTable
 */
export interface EconomicsRowData extends Record<string, unknown> {
  id: string
  metric: string
  [columnId: string]: string | number
}

/**
 * Chart data for SupportingCharts component
 */
export interface Chart {
  id: string
  title: string
  caption: string
  imageUrl?: string
  imageFile?: File
  s3Key?: string
}

/**
 * Props for SupportingCharts component
 */
export interface SupportingChartsProps {
  value: string | undefined
  onChange: (value: string) => void
  isViewOnly?: boolean
  templateImageUrls?: Record<string, string>
}

/**
 * Field configuration for FieldGrid component
 */
export interface FieldConfig {
  readonly id: string
  readonly label: string
  readonly type: string
  readonly required?: boolean
  readonly placeholder?: string
  readonly step?: string
  readonly selectOptions?: readonly string[]
}

/**
 * Props for TextAreaField component
 */
export interface TextAreaFieldProps {
  id: string
  label: string
  value: string
  onChange: (fieldId: string, value: string) => void
  placeholder?: string
  validationErrors: Set<string>
  isViewOnly: boolean
}

/**
 * Props for FieldGrid component
 */
export interface FieldGridProps {
  fields: ReadonlyArray<FieldConfig>
  formValues: Record<string, unknown>
  onChange: (fieldId: string, value: string) => void
  validationErrors: Set<string>
  isViewOnly: boolean
  cols?: number
}

// ==================== InvestmentMemo Component Types ====================

/**
 * Image data structure from API response
 */
export interface ImageData {
  s3Key: string
  caption?: string
}

/**
 * Section data structure from API response
 */
export interface SectionData {
  text?: string
  images?: ImageData[]
}

/**
 * Criteria checklist structure from API response
 */
export interface CriteriaChecklistData {
  images?: ImageData[]
  fcfMargins?: SectionData
  cashConversion?: SectionData
  reinvestmentRate?: SectionData
  managementQuality?: SectionData
  balanceSheetStrength?: SectionData
  returnsOnCapitalRoicRoe?: SectionData
  valuationMarginOfSafety?: SectionData
  [key: string]: SectionData | ImageData[] | undefined
}

/**
 * Content Block data for InvestmentMemo
 */
export interface ContentBlockData {
  id: string
  subheading: string
  content: string
  isParagraphOnly?: boolean
}

/**
 * Props for ContentBlock component
 */
export interface ContentBlockProps {
  block: ContentBlockData
  onUpdate: (id: string, field: keyof ContentBlockData, value: string) => void
  onRemove: (id: string) => void
  placeholderSubheading?: string
  placeholderContent?: string
  disabled?: boolean
}

/**
 * Props for ContentBlocksContainer component
 */
export interface ContentBlocksContainerProps {
  blocks: ContentBlockData[]
  onAdd: (isParagraphOnly?: boolean) => void
  onUpdate: (id: string, field: keyof ContentBlockData, value: string) => void
  onRemove: (id: string) => void
  placeholderSubheading?: string
  placeholderContent?: string
  disabled?: boolean
}

/**
 * Props for MarkdownTextarea component
 */
export interface MarkdownTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
}

/**
 * Media Block data for InvestmentMemo
 */
export interface MediaBlockData {
  id: string
  title: string
  imageUrl: string
  caption: string
  s3Key?: string // Optional: used to track S3 key for resolving presigned URL
}

/**
 * Section configuration for MemoSection component
 */
export interface SectionConfig {
  key: string
  title: string
  titleClassName?: string
  placeholder: string
  useMarkdown?: boolean
  minHeight?: string
}

/**
 * Media handlers for MemoSection component
 */
export interface MediaHandlers {
  onAdd: () => void
  onUpdate: (id: string, field: keyof MediaBlockData, value: string) => void
  onRemove: (id: string) => void
}

/**
 * Props for MemoSection component
 */
export interface MemoSectionProps {
  config: SectionConfig
  formValues: MemoFormValues
  onFieldChange: (fieldId: string, value: string) => void
  mediaBlocks: MediaBlockData[]
  mediaHandlers: MediaHandlers
  isViewOnly: boolean
}

/**
 * Props for MediaBlock component
 */
export interface MediaBlockProps {
  block: MediaBlockData
  onUpdate: (id: string, field: keyof MediaBlockData, value: string) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

/**
 * Props for MediaBlocksContainer component
 */
export interface MediaBlocksContainerProps {
  blocks: MediaBlockData[]
  onAdd: () => void
  onUpdate: (id: string, field: keyof MediaBlockData, value: string) => void
  onRemove: (id: string) => void
  buttonLabel?: string
  disabled?: boolean
}

// ==================== Template Data Upload Types ====================

/**
 * Types for template data upload URLs
 */
export interface TemplateDataUploadFileRequest {
  filename: string
  content_type: string
}

export interface GenerateUploadUrlsRequest {
  files: TemplateDataUploadFileRequest[]
}

export interface TemplateDataUploadUrlResponse {
  upload_url: string
  s3_key: string
  content_type: string
  filename: string
}

export type PresignedUploadInfo = Pick<
  TemplateDataUploadUrlResponse,
  'upload_url' | 's3_key' | 'content_type'
>

export interface GenerateUploadUrlsResponse {
  upload_urls: TemplateDataUploadUrlResponse[]
}

export type MutateFn = (
  id: number,
  options: {
    onSuccess?: (data: FileUrlResponse) => void
    onError?: (error: unknown) => void
  }
) => void
export interface FileUrlResponse {
  file_url?: string
}
// ==================== Derived Types from Constants ====================

export type MemoTypeFilter = (typeof MEMO_TYPE_FILTER_OPTIONS)[number]
export type MemoStatusFilter = (typeof MEMO_STATUS_FILTER_OPTIONS)[number]
export type MemoAnalystFilter = (typeof MEMO_ANALYST_FILTER_OPTIONS)[number]
export type UploadDocumentType = (typeof UPLOAD_DOCUMENT_TYPE_OPTIONS)[number]
export type AllowedNavigationKey = (typeof ALLOWED_NAVIGATION_KEYS)[number]
