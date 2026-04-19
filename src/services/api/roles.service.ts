import { BaseApiService } from './base'

export interface BackendRoleSummary {
  id: number
  tenant_id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BackendRoleListResponse {
  total: number
  skip: number
  limit: number
  roles: BackendRoleSummary[]
}

class RolesService extends BaseApiService {
  async listRoles(skip = 0, limit = 50): Promise<BackendRoleListResponse> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    })
    return this.get<BackendRoleListResponse>(`/roles?${params.toString()}`)
  }
}

export const rolesService = new RolesService()
