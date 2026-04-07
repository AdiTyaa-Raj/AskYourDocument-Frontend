import { StageAttachment } from '@/lib/attachments'

export type MaintenanceStatus = 'TODO' | 'INPROGRESS' | 'DONE'

export type MaintenanceCategoryKey = 'overdue' | 'due_1_week' | 'due_1_month' | 'due_quarter'

export type MaintenanceStatusFilter = MaintenanceStatus | 'all'

export interface MaintenanceFilters {
  company?: string
  analyst?: string
  country?: string
  status?: MaintenanceStatusFilter
}

export interface MaintenanceAssignee {
  id?: string | number
  name: string
  email?: string
  avatarColor?: string
}

export interface MaintenanceSelectOption {
  value: string
  label: string
}

export interface MaintenanceCompany {
  id?: number
  ticker: string
  name: string
  stageLabel?: string
  primaryAnalyst?: string
  secondaryAnalyst?: string
  primaryAnalystId?: string | number
  secondaryAnalystId?: string | number
  country?: string
  assignees?: Array<{ id?: string | number; name?: string; full_name?: string; email?: string }>
}

export interface MaintenanceUpdatePayload {
  title?: string
  action?: string
  due_date?: string | null
  important?: boolean
  status?: MaintenanceStatus
  company_id?: string | number
}

export interface MaintenanceCreatePayload {
  title: string
  companyId?: number | string
  ticker: string
  action: string
  due_date: string
  assignees: MaintenanceAssignee[]
  important?: boolean
}

export interface MaintenanceTask {
  id: number | string
  company_id?: number | string
  company_name?: string
  title?: string
  ticker: string
  action: string
  notes?: string
  company?: string
  country?: string
  due_date?: string | null
  assignees: MaintenanceAssignee[]
  important?: boolean
  status: MaintenanceStatus
  created_by?: string
  created_at?: string
  deleted_at?: string | null
  updated_at?: string
  pendingApproval?: boolean
  rejected?: boolean
  deleteRequested?: boolean
  deleted_by?: string
  deleted_on?: string
  stageLabel?: string
  category?: MaintenanceCategoryKey
  can_watch?: boolean
  watching?: boolean
}

export interface MaintenanceCategoryState {
  key: MaintenanceCategoryKey
  label: string
  items: MaintenanceTask[]
  total?: number
  limit?: number
  has_more?: boolean
}

export interface UseAttachmentCreatedFromOpenerOptions {
  baseList: StageAttachment[]
  onSelect: (item: StageAttachment) => void
  onRefetch?: () => unknown | Promise<unknown>
  expectedTicker?: string | null
  expectedCompanyId?: string | number | null
}
