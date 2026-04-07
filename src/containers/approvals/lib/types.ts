export type ApprovalFilter = 'my' | 'all'
export type ApprovalActionType = 'approve' | 'reject'

export interface DecisionMutationInput {
  requestIds: number[]
  decision: 'approved' | 'rejected' | 'cancelled'
  rationale?: string
  ticker?: string
  successMessage?: {
    title: string
    description?: string
  }
}

export type ApprovalKind = 'stage' | 'memo'

export interface ApprovalDocument {
  name: string
  id?: string | number
}

export interface ApprovalRequester {
  name: string
  role?: string
  userId?: number
}

export interface ApprovalCompanyOverview {
  companyName?: string
  primaryAnalyst?: string
  secondaryAnalyst?: string
  currentStage?: string
  lastActivity?: string
  exchange?: string
}

export type ApprovalDecisionResult = {
  id?: number | string
  error?: string
  note?: string
  status?: string
}

export type ApprovalDecisionResponse = {
  results?: ApprovalDecisionResult[]
}

export type ApprovalDecisionSummary = {
  errors: string[]
  notes: string[]
  results: ApprovalDecisionResult[]
}

export interface ApprovalRequest {
  id: string
  kind: ApprovalKind
  rationale: string
  requester: ApprovalRequester
  daysPending: number
  submittedAt?: string
  documents: ApprovalDocument[]
  status?: string
  requiredRoles?: string[]
  requiredDocuments?: string[]
  canApprove: boolean
  alreadyApproved: boolean
  cannotApprove: boolean
}

export type ApprovalWorkflowLineStatus =
  | 'pending'
  | 'auto-approved'
  | 'approved'
  | 'rejected'
  | 'upcoming'

export interface ApprovalWorkflowLineView {
  id: string
  displayName: string
  roleLabel?: string
  isRequester: boolean
  status: ApprovalWorkflowLineStatus
  approverUserId?: number
  leadInvestorAutoApproved?: boolean
  stageAnalystAutoApproved?: boolean
}

export interface ApprovalWorkflowSectionView {
  level: number
  title: string
  sectionLabel?: string
  lines: ApprovalWorkflowLineView[]
}

export type StageApprovalActionKind = 'stage_change' | 'analyst_reassign'

export interface AnalystNameTransition {
  from?: string
  to?: string
}

export interface StageApprovalRequest extends ApprovalRequest {
  kind: 'stage'
  /** analyst_reassign uses `analystChange`; stage_change uses from/to stages */
  stageApprovalAction: StageApprovalActionKind
  ticker: string
  company: string
  /** Empty strings when `stageApprovalAction` is analyst_reassign without stage data */
  fromStage: string
  toStage: string
  /** Set when `stageApprovalAction === 'analyst_reassign'` (from payload arrays) */
  analystChange?: {
    primary?: AnalystNameTransition
    secondary?: AnalystNameTransition
  }
  overview: ApprovalCompanyOverview
  isReactivationRequest?: boolean
  entity_id?: number
  /** From API `workflow_sections` when present */
  workflowSections?: ApprovalWorkflowSectionView[]
  /** `primary_analyst` / `secondary_analyst` user ids from payload when `stage_change` */
  stageChangeAnalystUserIds?: number[]
}

export interface MemoApprovalCompany {
  id: string
  name: string
  ticker: string
  exchange?: string
}

export interface MemoApprovalRequest extends ApprovalRequest {
  kind: 'memo'
  memoId: number
  title: string
  templateType: string
  templateLabel: string
  companies: MemoApprovalCompany[]
  relevantDocumentIds: string[]
  revisionCount?: number
  entity_id?: number
}

export type AnyApprovalRequest = StageApprovalRequest | MemoApprovalRequest

export interface ApprovalHistoryEntry {
  id: string
  date: string
  company: string
  ticker: string
  decision: string
  approver: string
  comment: string
}

export interface ApprovalsResponse {
  pending: AnyApprovalRequest[]
  history: ApprovalHistoryEntry[]
}

export interface PendingApprovalsListProps {
  approvals: AnyApprovalRequest[]
  selectedApprovalId: string | null
  selectedIds: string[]
  filter: ApprovalFilter
  onFilterChange: (value: ApprovalFilter) => void
  onSelectApproval: (approval: AnyApprovalRequest) => void
  onToggleSelection: (approvalId: string, checked: boolean) => void
  onSelectAll?: (checked: boolean) => void
  isLoading?: boolean
}

export interface BulkActionBarProps {
  count: number
  onApproveAll: () => void
  onRejectAll: () => void
  disabled?: boolean
}

export interface ApprovalActionDialogProps {
  open: boolean
  actionType: ApprovalActionType
  comment: string
  onCommentChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isSubmitting?: boolean
  titleOverride?: string
  descriptionOverride?: string
  helperTextOverride?: string
  confirmLabelOverride?: string
}

export interface ApprovalDetailProps {
  approval: AnyApprovalRequest | null
  onApprove: () => void
  onReject: () => void
  onViewMemo?: (memoId: number) => void
  onOpenDocument?: (doc: ApprovalDocument) => void
  isLoading?: boolean
}

export interface OverviewRowProps {
  label: string
  value?: string
}

export interface ApprovalsQueryOptions {
  mineOnly?: boolean
}

export interface ApprovalHistoryQueryOptions {
  enabled?: boolean
}

export interface CompanySummary {
  id: number
  ticker: string
  name: string
  meta?: Record<string, unknown> | null
  updated_at?: string
  exchange?: string
}

export type CompanyMap = Record<string, CompanySummary>
