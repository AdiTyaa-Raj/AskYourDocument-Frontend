import { BaseApiService } from './base'

export interface BackendTenantSummary {
  id: number
  name: string
  slug: string
  superuser_name: string | null
  superuser_email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BackendTenantListResponse {
  total: number
  skip: number
  limit: number
  tenants: BackendTenantSummary[]
}

export interface CreateTenantRequest {
  name: string
  slug?: string
  superuser_name?: string
  superuser_email?: string
  is_active?: boolean
}

export interface CreateTenantResponse {
  id: number
  name: string
  slug: string
  superuser_name: string | null
  superuser_email: string | null
  is_active: boolean
}

class TenantsService extends BaseApiService {
  async listTenants(skip = 0, limit = 50): Promise<BackendTenantListResponse> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    })
    return this.get<BackendTenantListResponse>(`/tenants?${params.toString()}`)
  }

  async createTenant(payload: CreateTenantRequest): Promise<CreateTenantResponse> {
    return this.post<CreateTenantResponse, CreateTenantRequest>('/tenants', payload)
  }
}

export const tenantsService = new TenantsService()
