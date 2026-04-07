import { BaseApiService } from './base'
import type {
  PipelineStage,
  CompaniesResponse,
  UsersResponse,
  MoveCompanyRequest,
  MoveCompanyResponse,
  UpdateStageAssignmentAnalystsRequest,
  UpdateStageAssignmentAnalystsResponse,
} from '@/containers/coverage/lib/types'

class CoverageService extends BaseApiService {
  /**
   * Get companies from a specific pipeline stage with pagination
   * @param stage - Pipeline stage (WATCHLIST, UNIVERSE, etc.)
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   * @param search - Optional search query
   */
  async getCompaniesByStage(
    stage: PipelineStage,
    skip: number = 0,
    limit: number = 100,
    search?: string
  ): Promise<CompaniesResponse> {
    const params = new URLSearchParams()
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())

    if (search && search.trim()) {
      // Format stage name: first letter capital, rest lowercase (e.g., WATCHLIST -> Watchlist)
      const formattedStage = stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase()
      const searchParam = `${formattedStage}.name__ilike:${search.trim()}`
      params.append('search', searchParam)
    }

    return this.get<CompaniesResponse>(`/pipeline/stages/${stage}/companies?${params.toString()}`)
  }

  /**
   * Get watchlist companies
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   * @param search - Optional search query
   */
  async getWatchlistCompanies(
    skip: number = 0,
    limit: number = 100,
    search?: string
  ): Promise<CompaniesResponse> {
    return this.getCompaniesByStage('WATCHLIST', skip, limit, search)
  }

  /**
   * Get universe companies
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   * @param search - Optional search query
   */
  async getUniverseCompanies(
    skip: number = 0,
    limit: number = 100,
    search?: string
  ): Promise<CompaniesResponse> {
    return this.getCompaniesByStage('UNIVERSE', skip, limit, search)
  }

  /**
   * Get portfolio holdings
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   * @param search - Optional search query
   */
  async getPortfolioHoldings(
    skip: number = 0,
    limit: number = 100,
    search?: string
  ): Promise<CompaniesResponse> {
    return this.getCompaniesByStage('INVESTED', skip, limit, search)
  }

  /**
   * Get users by role
   * @param roleName - Role name to filter users (e.g., 'arnie-primary-analyst')
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   */
  async getUsersByRole(
    roleName?: string,
    skip: number = 0,
    limit: number = 100
  ): Promise<UsersResponse> {
    const params = new URLSearchParams()
    if (roleName) {
      params.append('role_name', roleName)
    }
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())

    const endpoint = `/users/by-role?${params.toString()}`

    const response = await this.get<UsersResponse>(endpoint)

    return response
  }

  /**
   * Move a company to a new pipeline stage (generalized method)
   * @param ticker - Company ticker symbol
   * @param exchange - Company exchange symbol
   * @param company_id - Company identifier
   * @param newStageSlug - Target stage slug (WATCHLIST, UNIVERSE, etc.) or any valid stage string
   * @param data - Request body containing rationale and optional analyst assignments, documents, etc.
   */
  async moveCompanyToStage(
    ticker: string,
    exchange: string,
    company_id: string,
    newStageSlug: PipelineStage | string,
    data?: MoveCompanyRequest
  ): Promise<MoveCompanyResponse> {
    const params = new URLSearchParams()
    params.append('ticker', ticker)
    params.append('new_stage_slug', newStageSlug)
    params.append('company_id', company_id)
    params.append('exchange', exchange)

    const endpoint = `/pipeline/move?${params.toString()}`

    const response = await this.post<MoveCompanyResponse>(endpoint, data)

    return response
  }

  /**
   * Update primary/secondary analysts for an existing stage assignment.
   * Pass confirmReassignment=true on the second call when the first returned
   * status === "confirmation_required".
   */
  async updateStageAssignmentAnalysts(
    stageAssignmentId: number,
    data: UpdateStageAssignmentAnalystsRequest,
    confirmReassignment?: boolean
  ): Promise<UpdateStageAssignmentAnalystsResponse> {
    const params = new URLSearchParams()
    params.append('stage_assignment_id', stageAssignmentId.toString())
    if (confirmReassignment) {
      params.append('confirm_reassignment', 'true')
    }

    const endpoint = `/pipeline/analysts/update?${params.toString()}`
    return this.post<UpdateStageAssignmentAnalystsResponse>(endpoint, data)
  }
}

// Export singleton instance
export const coverageService = new CoverageService()
