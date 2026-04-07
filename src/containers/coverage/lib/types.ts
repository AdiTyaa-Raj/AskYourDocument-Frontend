/**
 * Coverage Container Types
 */

import type { TableData } from '@/components/shared/DataTable'
import type {
  AttachmentQueryInfo,
  AttachmentRequirementMap,
  StageAttachment,
} from '@/lib/attachments'
import type { UseMutationResult } from '@tanstack/react-query'

/**
 * Pipeline stage types
 */
export type PipelineStage =
  | 'WATCHLIST'
  | 'UNIVERSE'
  | 'ACTIVE_DISCUSSION'
  | 'INVESTED'
  | 'EXITED'
  | 'EARLY_TERMINATED'

/**
 * Company metadata from API
 */
export interface CompanyMeta {
  investment_date?: string // Date of investment (ISO date string)
  rr?: string // Risk/Reward ratio (e.g., "2.8x")
  ive?: string // Intrinsic Value Estimate
  isin?: string // ISIN identifier
  price?: string // Current price
  adtv_m?: string // Average Daily Trading Volume in millions
  sector?: string
  country?: string
  exchange?: string // Exchange where the stock is listed
  platform?: string // Platform identifier
  isin_list?: string[] // List of ISINs
  mcap_usd_m?: string // Market cap in millions USD
  // Legacy fields (for backward compatibility)
  primary_analyst?: string // Primary analyst initials
  primary_analyst_name?: string // Primary analyst full name
  secondary_analyst?: string // Secondary analyst initials
  secondary_analyst_name?: string // Secondary analyst full name
  date_of_first_investment?: string // Date of first investment (ISO date string)
  // Allow dynamic meta fields
  [key: string]: unknown
}

/**
 * Company data structure from API
 */
export interface Company {
  id: number
  ticker: string
  name: string // Company name
  meta: CompanyMeta
  created_at: string
  updated_at: string
}

/**
 * Analyst info from stage assignment meta
 */
export interface AnalystInfo {
  user_id: number
  full_name: string
  email: string
  role: string
}

/**
 * Stage assignment meta structure
 */
export interface StageAssignmentMeta {
  primary_analyst?: AnalystInfo[]
  secondary_analyst?: AnalystInfo[]
  [key: string]: unknown
}

/**
 * Stage assignment data
 */
export interface StageAssignment {
  id: number
  company_id: number
  stage_id: number
  active: boolean
  effective_date: string | null
  active_until: string | null
  meta: StageAssignmentMeta
  created_at: string
  updated_at: string
}

/**
 * Pipeline stage data
 */
export interface Stage {
  id: number
  name: string
  slug: string
  order: number
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * Company with stage assignment
 */
export interface CompanyWithStage {
  Company: Company
  StageAssignment: StageAssignment
  Stage: Stage
  current_approval_request: unknown[]
}

/**
 * Paginated companies response
 */
export interface CompaniesResponse {
  companies: CompanyWithStage[]
  total: number
}

/**
 * User data structure from API
 */
export interface User {
  id: number
  email: string
  username: string
  full_name: string
  is_active: boolean
  is_superuser: boolean
  hashed_password: string | null
  created_at: string
  updated_at: string
}

/**
 * Role data structure
 */
export interface Role {
  id: number
  org_id: number
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * User role assignment
 */
export interface UserRole {
  user_id: number
  role_id: number
}

/**
 * User with role data
 */
export interface UserWithRole {
  User: User
  UserRole: UserRole
  Role: Role
}

/**
 * Users response from API
 */
export interface UsersResponse {
  total: number
  users: UserWithRole[]
}

/**
 * Request body for moving a company to a new pipeline stage
 */
export type AttachmentCollectionsPayload = Record<string, number>

export interface MoveCompanyRequest {
  rationale?: string
  primary_analyst?: number[]
  secondary_analyst?: number[]
  documents?: AttachmentCollectionsPayload
  [key: string]: unknown
}

/**
 * Response from moving a company to a new pipeline stage
 */
export interface MoveCompanyResponse {
  success?: boolean
  status?: string
  message?: string
  company?: CompanyWithStage
  request_id?: number
  data?: unknown
}

/**
 * Request body for updating analysts on an existing stage assignment
 */
export interface UpdateStageAssignmentAnalystsRequest {
  primary_analyst: number
  secondary_analyst: number
}

/**
 * Response from updating analysts on stage assignment.
 * When status === "confirmation_required", warnings must be shown and the
 * same request re-sent with confirm_reassignment=true.
 */
export interface UpdateStageAssignmentAnalystsResponse {
  success?: boolean
  status?: string
  message?: string
  warnings?: string[]
  request_id?: number | null
  data?: unknown
}

/**
 * Universe table row structure
 * Now supports dynamic meta fields
 */
export interface UniverseTableRow extends TableData {
  id: number
  ticker: string
  securityDescription: string
  requiredAttachments?: AttachmentRequirementMap
  // Analyst fields (only for watchlist)
  primaryAnalyst?: string
  primaryAnalystName?: string
  secondaryAnalyst?: string
  secondaryAnalystName?: string
  // Dynamic meta fields will be added at runtime
  [key: string]: any
}

/**
 * Portfolio Holdings table row structure
 * Now supports dynamic meta fields
 */
export interface PortfolioHoldingsTableRow extends TableData {
  id: number
  ticker: string
  companyName: string
  primaryAnalyst?: string
  primaryAnalystName?: string
  primaryAnalystId?: number
  secondaryAnalyst?: string
  secondaryAnalystName?: string
  secondaryAnalystId?: number
  stageAssignmentId?: number
  canAssignAnalysts?: boolean
  dateOfFirstInvestment?: string
  // Dynamic meta fields will be added at runtime
  [key: string]: any
}

/**
 * Company Move Modal Types
 */
export type ModalMode = 'watchlist' | 'active-discussion'

export interface CompanyMoveModalProps {
  isOpen: boolean
  onClose: () => void
  mode: ModalMode
  companyData?: AttachmentCompanyState & { name: string }
  titleOverride?: string
  infoBoxText?: string
  rationalePlaceholder?: string
  onSubmit: (data: FormData, attachments?: { documents?: AttachmentCollectionsPayload }) => void
  primaryAnalysts?: AnalystOption[]
  secondaryAnalysts?: AnalystOption[]
  isLoadingPrimaryAnalysts?: boolean
  isLoadingSecondaryAnalysts?: boolean
  attachmentRequirements?: AttachmentRequirementMap
  attachmentOptions?: StageAttachment[]
  requiredAttachmentOptions?: StageAttachment[]
  attachmentSearch?: string
  onAttachmentSearchChange?: (value: string) => void
  attachmentQueryInfo?: AttachmentQueryInfo
  documentOptions?: StageAttachment[]
  memoOptions?: StageAttachment[]
  documentsQueryInfo?: AttachmentQueryInfo
  memosQueryInfo?: AttachmentQueryInfo
  onAttachmentsRefetch?: () => Promise<unknown> | unknown
}

export interface MoveToWatchlistFormData {
  primaryAnalyst: string
  secondaryAnalyst: string
  screen: string
}

export interface MoveToActiveDiscussionFormData {
  reason: string
}

export type FormData = MoveToWatchlistFormData | MoveToActiveDiscussionFormData

/**
 * Analyst option for select dropdowns
 */
export interface AnalystOption {
  id: number
  value: string
  label: string
}

/**
 * Table data structures for different coverage views
 */
export interface UniverseTableData extends TableData {
  ticker: string
  securityDescription: string
  price: number
  ive: number
  riskReward: number
  sector: string
  country: string
  mCapM: number
  adtv: number
  primaryAnalyst: string
  primaryAnalystName: string
  requiredAttachments?: AttachmentRequirementMap
}

export interface PortfolioHoldingsTableData extends TableData {
  ticker: string
  companyName: string
  primaryAnalyst?: string
  primaryAnalystName?: string
  primaryAnalystId?: number
  secondaryAnalyst?: string
  secondaryAnalystName?: string
  secondaryAnalystId?: number
  stageAssignmentId?: number
  canAssignAnalysts?: boolean
  dateOfFirstInvestment?: string
}

export interface WatchListTableData extends TableData {
  ticker: string
  securityDescription: string
  primaryAnalyst?: string
  primaryAnalystName?: string
  primaryAnalystId?: number
  secondaryAnalyst?: string
  secondaryAnalystName?: string
  secondaryAnalystId?: number
  stageAssignmentId?: number
  canAssignAnalysts?: boolean
  requiredAttachments?: AttachmentRequirementMap
  // Dynamic meta fields will be added at runtime
  [key: string]: unknown
}

/**
 * Watchlist row from API mapping before merging stage-assignment analyst fields.
 * Use explicit Pick (not Omit&lt;WatchListTableData, …&gt;) so object spreads preserve id/ticker/securityDescription:
 * Omit collapses when the source type has a string index signature.
 */
export type WatchListTableRowBase = Pick<
  WatchListTableData,
  'id' | 'ticker' | 'securityDescription'
> & {
  requiredAttachments?: WatchListTableData['requiredAttachments']
} & Record<string, unknown>

/** Fields derived from stage assignment meta for watchlist / portfolio analyst UI */
export type WatchlistAnalystFieldsFromAssignment = Pick<
  WatchListTableData,
  | 'primaryAnalyst'
  | 'primaryAnalystName'
  | 'primaryAnalystId'
  | 'secondaryAnalyst'
  | 'secondaryAnalystName'
  | 'secondaryAnalystId'
  | 'stageAssignmentId'
  | 'canAssignAnalysts'
>

/**
 * Component Props Interfaces
 */

export interface AnalystAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  companyData?: PortfolioAnalystCompanyState
  primaryAnalysts?: AnalystOption[]
  secondaryAnalysts?: AnalystOption[]
  isLoadingPrimaryAnalysts?: boolean
  isLoadingSecondaryAnalysts?: boolean
  isSubmitting?: boolean
  onSubmit: (data: UpdateAnalystSubmissionData) => void | Promise<void>
  /** Label for context in copy, e.g. "portfolio holding" or "watchlist". Defaults to "selected". */
  contextLabel?: string
}

export interface AnalystSelectFieldsProps {
  primaryAnalysts?: AnalystOption[]
  secondaryAnalysts?: AnalystOption[]
  selectedPrimaryAnalystId: string
  selectedSecondaryAnalystId: string
  onPrimaryAnalystChange: (value: string) => void
  onSecondaryAnalystChange: (value: string) => void
  isLoadingPrimaryAnalysts?: boolean
  isLoadingSecondaryAnalysts?: boolean
  primaryError?: string
  secondaryError?: string
  idPrefix?: string
}

export interface PortfolioHoldingsProps {
  data: PortfolioHoldingsTableRow[]
  totalCount?: number
  isLoading: boolean
  error: Error | null
  refetch: () => void
  searchQuery?: string
  onOpenAnalystAssignmentModal?: (company: PortfolioAnalystCompanyState & { id: number }) => void
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export interface UniverseProps {
  searchQuery?: string
  universeData?: UniverseTableRow[]
  totalCount?: number
  isLoading?: boolean
  error?: Error | null
  refetch?: () => void
  primaryAnalysts?: AnalystOption[]
  secondaryAnalysts?: AnalystOption[]
  isLoadingPrimaryAnalysts?: boolean
  isLoadingSecondaryAnalysts?: boolean
  attachmentRequirements?: AttachmentRequirementMap
  attachmentOptions?: StageAttachment[]
  attachmentSearch?: string
  onAttachmentSearchChange?: (value: string) => void
  attachmentQueryInfo?: AttachmentQueryInfo
  documentOptions?: StageAttachment[]
  memoOptions?: StageAttachment[]
  documentsQueryInfo?: AttachmentQueryInfo
  memosQueryInfo?: AttachmentQueryInfo
  requiredAttachmentOptions?: StageAttachment[]
  onModalOpen?: (company?: AttachmentCompanyState) => void
  onModalClose?: () => void
  onAttachmentsRefetch?: () => Promise<unknown> | unknown
  moveToWatchlistMutation?: UseMutationResult<any, any, {
    ticker: string
    exchange: string
    companyId: string
    primaryAnalystId: number
    secondaryAnalystId: number
    rationale: string
    attachments?: {
      documents?: AttachmentCollectionsPayload
    }
  }, unknown>
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export interface WatchListProps {
  searchQuery?: string
  watchlistData?: WatchListTableData[]
  totalCount?: number
  isLoading?: boolean
  isError?: boolean
  refetch?: () => void
  attachmentRequirements?: AttachmentRequirementMap
  attachmentOptions?: StageAttachment[]
  attachmentSearch?: string
  onAttachmentSearchChange?: (value: string) => void
  attachmentQueryInfo?: AttachmentQueryInfo
  documentOptions?: StageAttachment[]
  memoOptions?: StageAttachment[]
  documentsQueryInfo?: AttachmentQueryInfo
  memosQueryInfo?: AttachmentQueryInfo
  requiredAttachmentOptions?: StageAttachment[]
  onModalOpen?: (company?: AttachmentCompanyState) => void
  onModalClose?: () => void
  onAttachmentsRefetch?: () => Promise<unknown> | unknown
  onOpenAnalystAssignmentModal?: (company: PortfolioAnalystCompanyState & { id: number }) => void
  moveToActiveDiscussionMutation?: UseMutationResult<any, any, {
    ticker: string
    exchange: string
    companyId: string
    rationale: string
    attachments?: {
      documents?: AttachmentCollectionsPayload
    }
  }, unknown>
  removeFromWatchlistMutation?: UseMutationResult<
    any,
    any,
    { ticker: string; exchange: string; companyId: string },
    unknown
  >
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

/**
 * State Types for CoverageContainer
 */

export interface PortfolioAnalystCompanyState {
  id?: number
  ticker: string
  name: string
  stageAssignmentId?: number
  primaryAnalystId?: number
  secondaryAnalystId?: number
}

export interface AttachmentCompanyState {
  id?: number
  ticker?: string
}

export interface UpdateAnalystSubmissionData {
  stageAssignmentId: number
  primaryAnalystId: number
  secondaryAnalystId: number
}

/**
 * Mutation Variables Types
 */

export interface UpdateStageAssignmentAnalystsVariables {
  stageAssignmentId: number
  primaryAnalystId: number
  secondaryAnalystId: number
  confirmReassignment?: boolean
}
