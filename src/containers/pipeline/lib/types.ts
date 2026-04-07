import type {
  AttachmentQueryInfo,
  AttachmentRequirementMap,
  StageAttachment,
} from '@/lib/attachments'
import { getStatusTagConfig } from './helpers'

export interface PipelineStageInfo {
  slug: string
  name: string
  order?: number
  allowedNext?: string[]
  meta?: Record<string, unknown> | null
}

export type PipelineStatus =
  | 'on-track'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in-review'
  | 'unknown'

export type PipelineApprovalStatus = 'pending' | 'in_progress' | 'approved' | 'rejected'

export type PipelineApprovalDecisionStatus = PipelineApprovalStatus | 'cancelled' | 'dismissed'

export interface PipelineApprovalDecisionMeta {
  status: PipelineApprovalDecisionStatus
  comment?: string
  decidedAt?: string
  decidedByUserId?: number
  decidedByName?: string
}

export interface PipelineApprovalSummary {
  id: number
  status: PipelineApprovalStatus
  toStage: string
  fromStage?: string
  rationale?: string
  submittedAt: string
  requestedBy?: number
  requestedByName?: string
  requiredRoles?: string[]
  requiredAttachments?: AttachmentRequirementMap
  rationaleRequired?: number
  payload?: Record<string, unknown> | null
  decisionMeta?: PipelineApprovalDecisionMeta
}

export interface PipelineCard {
  id: string | number
  ticker: string
  exchange: string
  company: string
  analysts: {
    primary?: string | null
    secondary?: string | null
  }
  daysInStage: number
  status: PipelineStatus
  statusLabel: string
  statusDescription?: string
  stageSlug: string
  currentApproval?: PipelineApprovalSummary
  meta?: Record<string, unknown> | null
}

export interface AnalystOption {
  value: string
  label: string
}

export type PipelineBoardData = Record<string, PipelineCard[]>

export interface StageCompaniesState {
  items: PipelineCard[]
  offset: number
  total: number
  hasMore: boolean
  isLoading: boolean
  error?: string | null
}

export interface TimelineEntry {
  date: string
  company: string
  ticker?: string
  exchange?: string
  stageChange: string
  fromStage?: string
  toStage?: string
  approver: string
  approverRole?: string
  rationale: string
  eventType?: 'stage_change' | 'approval' | 'rejection' | 'termination'
  timestamp?: string
  daysInPreviousStage?: number
}

export type PipelineView = 'kanban' | 'timeline'

export interface StageMoveRequirements {
  requiredRoles: string[]
  minRationaleLength?: number
  requiredAttachments?: AttachmentRequirementMap
}

export interface StageMoveDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  onEarlyTerminate: () => void
  rationale: string
  rationaleTouched: boolean
  onRationaleChange: (value: string) => void
  onRationaleTouch: () => void
  card: PipelineCard | null
  companyId?: number | string
  fromStage: string
  targetStageSlug: string | null
  targetStageName?: string
  requirements?: StageMoveRequirements | null
  isSubmitting?: boolean
  errorMessage?: string | null
  canEarlyTerminate?: boolean
  attachmentOptions: StageAttachment[]
  noteAttachments: StageAttachment[]
  onNoteAttachmentSelect: (item: StageAttachment) => void
  onNoteAttachmentRemove: (item: StageAttachment) => void
  attachmentQueryInfo: AttachmentQueryInfo
  selectedDocuments: StageAttachment[]
  selectedMemos: StageAttachment[]
  onDocumentSelect: (item: StageAttachment) => void
  onDocumentRemove: (id: number) => void
  onMemoSelect: (item: StageAttachment) => void
  onMemoRemove: (id: number) => void
  documentOptions: StageAttachment[]
  memoOptions: StageAttachment[]
  documentsQueryInfo: AttachmentQueryInfo
  memosQueryInfo: AttachmentQueryInfo
  requiredAttachmentSearch: string
  onRequiredAttachmentSearchChange: (value: string) => void
  optionalAttachmentSearch: string
  onOptionalAttachmentSearchChange: (value: string) => void
  requiredAttachmentOptions?: StageAttachment[]
  onAttachmentsRefetch?: () => Promise<unknown> | unknown
}

export type PipelineCardSelectHandler = (
  card: PipelineCard,
  stage: PipelineStageInfo,
  preferredTargetSlug?: string | null
) => void

export interface PipelineBoardProps {
  stages: PipelineStageInfo[]
  data: PipelineBoardData
  onCardSelect: PipelineCardSelectHandler
  onEarlyTerminate?: (card: PipelineCard, stage: PipelineStageInfo) => void
  onCancelRequest?: (card: PipelineCard, stage: PipelineStageInfo) => void
  onDismissRequest?: (card: PipelineCard, stage: PipelineStageInfo) => void
  onViewRequest?: (card: PipelineCard) => void
  onReactivate?: (card: PipelineCard, stage: PipelineStageInfo) => void
  currentUserId?: string | number | null
  stageStates?: Record<string, StageCompaniesState>
  onLoadMoreStage?: (stage: PipelineStageInfo) => void
}

export interface StageColumnProps extends Pick<
  PipelineBoardProps,
  | 'onCardSelect'
  | 'onEarlyTerminate'
  | 'onCancelRequest'
  | 'onDismissRequest'
  | 'onViewRequest'
  | 'onReactivate'
> {
  stage: PipelineStageInfo
  cards: PipelineCard[]
  currentUserId?: string | number | null
  stageState?: StageCompaniesState
  onLoadMore?: () => void
}

export interface PipelineToolbarProps {
  filter: string
  onFilterChange: (value: string) => void
  onSearchSubmit?: () => void
  analyst: string
  onAnalystChange: (value: string) => void
  view: PipelineView
  onViewChange: (view: PipelineView) => void
  analystOptions: AnalystOption[]
  onRefresh?: () => void
  showViewToggle?: boolean
}

export interface PipelineTimelineProps {
  entries: TimelineEntry[]
  isLoading?: boolean
}

export interface PipelineErrorStateProps {
  onRetry?: () => void
  message?: string
}

export type FilterPeriod = 'all' | '7d' | '30d' | '90d'
export type FilterEventType = 'all' | 'approved' | 'rejected' | 'pending'

export interface PipelineStageApiShape {
  slug: string
  name?: string
  order?: number
  allowedNext?: string[]
  allowed_next?: string[]
  meta?: Record<string, unknown> | null
}

export interface PipelineTimelineQueryOptions {
  enabled?: boolean
}

/* Analyst dropdown option (value/label). Same shape as AnalystOption in pipeline types. */
export type AnalystFilterOption = { value: string; label: string }

export type AnalystFilterRawItem = { value: string; label?: string; full_name?: string }

export type FiltersAnalystPayload = {
  filters?: { analyst?: AnalystFilterRawItem[] }
  items?: AnalystFilterRawItem[]
}

export interface CardData {
  cardBorderClass: string
  statusDotClass: string
  requestedByLabel: string
  tearsheetHref: string | null
  statusTagConfig: ReturnType<typeof getStatusTagConfig>
  showRequestButton: boolean
}
