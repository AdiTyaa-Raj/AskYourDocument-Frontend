import { BaseApiService } from './base'

export type MaintenanceStatusApi = 'TODO' | 'INPROGRESS' | 'DONE'
export type MaintenanceCategoryKeyApi = 'overdue' | 'due_1_week' | 'due_1_month' | 'due_quarter'

export interface MaintenanceAssigneeApi {
  id?: string | number
  name?: string
  full_name?: string
  email?: string
}

export interface MaintenanceTaskApi {
  id: string | number
  company_id?: string | number
  title?: string
  ticker: string
  action: string
  notes?: string
  due_date?: string | null
  assignee?: MaintenanceAssigneeApi[]
  assignees?: MaintenanceAssigneeApi[]
  important?: boolean
  status: MaintenanceStatusApi
  created_by?: { id?: string | number; name?: string } | string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  deleted_by?: string | null
  company?: string
  company_name?: string
  country?: string
  stage_label?: string
  watching?: boolean
  is_watching?: boolean
}

export interface MaintenanceCategoryApi {
  items: MaintenanceTaskApi[]
  count?: number
  total?: number
  limit?: number
  has_more?: boolean
}

export interface MaintenanceSummaryResponse {
  data: Record<MaintenanceCategoryKeyApi, MaintenanceCategoryApi>
  status?: number
  message?: string
}

export interface MaintenanceTabCountsResponse {
  data: {
    active: number
    completed: number
    deleted: number
  }
}

export interface MaintenanceListResponse {
  data: MaintenanceCategoryApi
  status?: number
  message?: string
}

type MaintenanceFiltersModeA = {
  ticker?: Array<{ value: string; label?: string }> | string[]
  analyst?: Array<{ value: string; label?: string }> | string[]
  country?: Array<{ value: string; label?: string }> | string[]
  status?: Array<{ value: string; label?: string }> | string[]
}

type MaintenanceFiltersModeB = {
  filter_type: string
  items: Array<{
    value: string
    label?: string
    full_name?: string
    email?: string
    count?: number
  }>
  count: number
  skip: number
  limit: number
  tab?: string | null
}

export interface MaintenanceFiltersResponse {
  data: MaintenanceFiltersModeA | MaintenanceFiltersModeB
}

export interface MaintenanceCompanyDropdown {
  id?: number
  ticker: string
  name: string
  stage_label?: string
  primary_analyst?: { id?: string | number; full_name?: string; name?: string }
  secondary_analyst?: { id?: string | number; full_name?: string; name?: string }
  country?: string
}

export interface MaintenanceCompaniesDropdownResponse {
  data: MaintenanceCompanyDropdown[]
}

export interface MaintenanceAnalystResponseItem {
  id: string | number
  full_name?: string
  email?: string
  name?: string
}

export interface MaintenanceAnalystsResponse {
  data: MaintenanceAnalystResponseItem[] | { users: MaintenanceAnalystResponseItem[] }
}

class MaintenanceService extends BaseApiService {
  getSummary(params: Record<string, unknown>) {
    return this.get<MaintenanceSummaryResponse>('/maintenance/', { params })
  }

  getCategoryList(params: Record<string, unknown>) {
    return this.get<MaintenanceListResponse>('/maintenance/list', { params })
  }

  createTask(payload: {
    company_id?: string | number
    title?: string
    ticker: string
    action: string
    due_date?: string | null
    assignee?: Array<string | number>
    assignees?: Array<string | number>
    important?: boolean
    status?: MaintenanceStatusApi
  }) {
    return this.post<{ data: MaintenanceTaskApi }>('/maintenance/', payload)
  }

  updateTask(
    id: string | number,
    payload: Partial<{
      company_id?: string | number
      title: string
      ticker: string
      action: string
      notes: string
      due_date: string | null
      assignee: Array<string | number>
      assignees: Array<string | number>
      important: boolean
      status: MaintenanceStatusApi
    }>
  ) {
    return this.post<{ data: MaintenanceTaskApi }>(`/maintenance/${id}`, payload)
  }

  updateStatus(id: string | number, status: MaintenanceStatusApi) {
    return this.post<{ data: MaintenanceTaskApi }>(`/maintenance/${id}/status`, { status })
  }

  deleteTask(id: string | number) {
    return this.put<{ data?: MaintenanceTaskApi }>(`/maintenance/${id}/delete`)
  }

  restoreTask(id: string | number) {
    return this.post<{ data?: MaintenanceTaskApi }>(`/maintenance/${id}/restore`)
  }

  watchTask(id: string | number) {
    return this.post<{ data?: MaintenanceTaskApi }>(`/maintenance/${id}/watch`)
  }

  unwatchTask(id: string | number) {
    return this.put<{ data?: MaintenanceTaskApi }>(`/maintenance/${id}/watch/delete`)
  }

  getDropdownCompanies(params?: Record<string, unknown>) {
    return this.get<MaintenanceCompaniesDropdownResponse>('/maintenance/companies/for-dropdown', {
      params,
    })
  }

  getAnalysts(params?: Record<string, unknown>) {
    return this.get<MaintenanceAnalystsResponse>('/maintenance/assignees', { params })
  }

  getFilters(params?: Record<string, unknown>) {
    return this.get<MaintenanceFiltersResponse>('/maintenance/filters', { params })
  }

  getTabCounts(params?: Record<string, unknown>) {
    return this.get<MaintenanceTabCountsResponse>('/maintenance/tabs/counts', { params })
  }
  getOnlyAnalysts(params?: Record<string, unknown>) {
    return this.get<MaintenanceAnalystsResponse>('/maintenance/analysts', { params })
  }
}

export const maintenanceService = new MaintenanceService()
