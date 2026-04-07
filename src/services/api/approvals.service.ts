import { BaseApiService } from './base'

export interface ApprovalStageConfigSnapshotApi {
  required_roles?: string[]
  required_documents?: string[]
  rationale_required?: number
  levels?: Array<{ required_roles?: string[] }>
}

export interface ApprovalRequestApi {
  id: number
  status: 'pending' | 'in_progress' | 'approved' | 'rejected'
  created_at?: string
  updated_at?: string
  decision_rationale?: string | null
  decided_by_user_id?: number | string | null
  decided_at?: string | null
  requester_user_id?: number
  entity_type?: string
  entity_id?: number
  action?: string
  type?: string
  approval_config_snapshot?: {
    stages?: Record<string, ApprovalStageConfigSnapshotApi>
    [key: string]: unknown
  }
  payload?: {
    ticker?: string
    to_stage?: string
    from_stage?: string
    rationale?: string
    decision?: string
    decision_rationale?: string | null
    decided_by_user_id?: number | string | null
    [key: string]: unknown
  }
  audit_logs?: Array<{
    id?: number | string
    action?: string
    created_at?: string
    actor_user_id?: number | string | null
    details?: Record<string, unknown> | null
  }>
}

export interface ApprovalLineApi {
  id?: string | number
  request_id?: string
  approver_user_id?: number | null
  approver_role_id?: number | null
  approver_user?: ApprovalUserApi | null
  approver_role?: ApprovalRoleApi | null
  decided_by_user?: ApprovalUserApi | null
  level?: number
  order_in_level?: number
  group_id?: string | null
  quorum?: number | null
  is_optional?: boolean
  decision?: string | null
  decision_rationale?: string | null
  decided_by_user_id?: number | null
  decided_at?: string | null
  resolved?: boolean
  auto_approved?: boolean
  active?: boolean
  created_at?: string
  updated_at?: string
}

export interface ApprovalUserApi {
  id: number
  full_name?: string | null
  email?: string | null
  username?: string | null
}

export interface ApprovalRoleApi {
  id?: number
  name?: string | null
}

/** Grouped workflow from GET /approvals/v2/ */
export interface ApprovalWorkflowSectionApi {
  level: number
  label: string
  required_roles?: string[]
  lines: ApprovalLineApi[]
}

export interface ApprovalListRowApi {
  ApprovalRequest?: ApprovalRequestApi
  /** Alternate v2 response key */
  request?: ApprovalRequestApi
  ApprovalLine?: ApprovalLineApi | ApprovalLineApi[] | null
  lines?: ApprovalLineApi[] | null
  User?: ApprovalUserApi | null
  requester?: ApprovalUserApi | null
  Role?: ApprovalRoleApi | null
  workflow_sections?: ApprovalWorkflowSectionApi[] | null
  can_approve?: boolean
  already_approved?: boolean
  cannot_approve?: boolean
}

export interface ApprovalListResponseApi {
  results: ApprovalListRowApi[]
  total: number
}

export type ApprovalHistoryRowApi = [ApprovalRequestApi, ApprovalLineApi | null]

export interface ApprovalHistoryResponseApi {
  ticker: string
  approvals: ApprovalHistoryRowApi[]
  total: number
}

export interface ApprovalDecisionPayloadApi {
  request_ids: Array<string | number>
  decision: 'approved' | 'rejected' | 'pending' | 'abstained' | 'cancelled' | 'dismissed'
  rationale?: string
}

export type ApprovalDecisionResultApi = {
  id?: number | string
  error?: string
  note?: string
  status?: string
}

export type ApprovalDecisionResponseApi = {
  results?: ApprovalDecisionResultApi[]
}

type ListApprovalsParams = {
  mine_only?: boolean
}

class ApprovalsService extends BaseApiService {
  async listApprovals(params?: ListApprovalsParams): Promise<ApprovalListResponseApi> {
    const searchParams = new URLSearchParams()
    const mineOnly = params?.mine_only ?? true
    searchParams.set('mine_only', mineOnly ? 'true' : 'false')

    const query = searchParams.toString()
    // Always use trailing slash to match FastAPI router
    const endpoint = `/approvals/v2/?${query}`
    return this.get<ApprovalListResponseApi>(endpoint)
  }

  async decide(payload: ApprovalDecisionPayloadApi): Promise<ApprovalDecisionResponseApi> {
    return this.post<ApprovalDecisionResponseApi, ApprovalDecisionPayloadApi>(
      '/approvals/decision',
      payload
    )
  }

  async getApprovalHistory(ticker: string): Promise<ApprovalHistoryResponseApi> {
    // No trailing slash here - /history is a specific endpoint, not a router
    const endpoint = `/approvals/history?ticker=${encodeURIComponent(ticker)}`
    return this.get<ApprovalHistoryResponseApi>(endpoint)
  }
}

export const approvalsService = new ApprovalsService()
