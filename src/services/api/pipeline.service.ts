import { BaseApiService } from './base'
import type { ApprovalRequestApi } from './approvals.service'

export interface PipelineStageApi {
  id?: number
  slug: string
  name?: string
  order?: number
  allowed_next?: string[]
  allowedNext?: string[]
  meta?: Record<string, unknown> | null
}

export interface PipelineStageCompanyRecordApi {
  Company: {
    id: number
    ticker: string
    name: string
    exchange?: string | null
    equity?: string | null
    created_at?: string
    updated_at?: string
    meta?: Record<string, unknown> | null
    is_active?: boolean
  }
  StageAssignment?: {
    id: number
    stage_id: number
    company_id: number
    created_at?: string
    updated_at?: string
    effective_date?: string | null
    active_until?: string | null
    active?: boolean
    meta?: Record<string, unknown> | null
  } | null
  Stage?: {
    slug: string
    name: string
    order?: number
    meta?: Record<string, unknown> | null
  } | null
  current_approval_request?: ApprovalRequestApi[]
}

export interface StageCompaniesAllResponse<T = PipelineStageCompanyRecordApi> {
  stages: Record<
    string,
    {
      total: number
      companies: T[]
    }
  >
}

export interface PipelineTimelineLogApi {
  changed_from_stage?: string
  to_stage?: string
  created_at?: string
  changed_by?: number | string | null
  change_reason?: string | null
}

export interface PipelineTimelineEntryApi {
  ticker: string
  exchange?: string | null
  current_stage?: string
  days_in_current_stage?: number
  total_transitions?: number
  all_logs?: PipelineTimelineLogApi[]
}

export interface PipelineTimelineResponse {
  count: number
  results: PipelineTimelineEntryApi[]
}

class PipelineService extends BaseApiService {
  async getStages(): Promise<Record<string, PipelineStageApi>> {
    return this.get('/pipeline/stages')
  }

  async getAllStageCompanies<T = PipelineStageCompanyRecordApi>(params?: {
    view?: string
    stage?: string
    skip?: number
    limit?: number
    search?: string
    analyst_id?: number
  }): Promise<StageCompaniesAllResponse<T>> {
    const searchParams = new URLSearchParams()
    if (params?.view) searchParams.set('view', params.view)
    if (params?.stage) searchParams.set('stage', params.stage)
    if (typeof params?.skip === 'number') searchParams.set('skip', String(params.skip))
    if (typeof params?.limit === 'number') searchParams.set('limit', String(params.limit))
    if (params?.search) searchParams.set('search', params.search)
    if (params?.analyst_id !== undefined) {
      searchParams.set('analyst_id', String(params.analyst_id))
    }

    const query = searchParams.toString()
    const endpoint = query
      ? `/pipeline/stages/all/companies?${query}`
      : `/pipeline/stages/all/companies`

    return this.get(endpoint)
  }

  async getTimeline(params?: Record<string, string | number | boolean>) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value))
        }
      })
    }

    const query = searchParams.toString()
    const endpoint = query ? `/pipeline/timeline?${query}` : '/pipeline/timeline'
    return this.get<PipelineTimelineResponse>(endpoint)
  }
}

export const pipelineService = new PipelineService()
