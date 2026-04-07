import { BaseApiService } from './base'

export interface CompanyApi {
  id: number
  ticker: string
  name: string
  equity?: string
  exchange?: string
  gics?: string
  is_active?: boolean
  meta?: Record<string, unknown> | null
  stage?: {
    id: number
    name: string
    slug: string
  }
  stage_assignment?: {
    updated_at?: string | null
  } | null
  primary_analyst?: {
    id: number
    full_name: string
    email: string
    username: string
  } | null
  secondary_analyst?: {
    id: number
    full_name: string
    email: string
    username: string
  } | null
  created_at?: string
  updated_at?: string
}

interface CompaniesApiResponse {
  data: CompanyApi[]
  total_count: number
  skip: number
  limit: number
}

export interface SearchCompaniesParams {
  searchTerm?: string
  skip?: number
  limit?: number
}

/** Builds `search` for /companies: `ticker__eq:…;id__eq:…` — omits empty/undefined parts. */
export function buildCompaniesSearchFilter(params: {
  ticker?: string | null
  entityId?: number | null
}): string | undefined {
  const parts: string[] = []
  const ticker = typeof params.ticker === 'string' ? params.ticker.trim() : ''
  if (ticker) {
    parts.push(`ticker__eq:${ticker}`)
  }
  if (params.entityId != null && Number.isFinite(params.entityId)) {
    parts.push(`id__eq:${String(Math.trunc(params.entityId))}`)
  }
  return parts.length > 0 ? parts.join(';') : undefined
}

export interface SearchCompaniesResult {
  companies: CompanyApi[]
  total: number
}

// TODO: @aryanArora to take care of consolidating the searching logic for whole app
class CompaniesService extends BaseApiService {
  /**
   * Search companies by ticker or name with pagination
   * Uses the new /api/v1/companies/ endpoint
   * @param params - Search parameters
   * @returns Promise with companies and total count
   */
  async searchCompanies(params: SearchCompaniesParams = {}): Promise<SearchCompaniesResult> {
    const { searchTerm, skip = 0, limit = 100 } = params

    const searchParams = new URLSearchParams()
    searchParams.set('skip', skip.toString())
    searchParams.set('limit', limit.toString())

    // Add search parameter if provided
    if (searchTerm?.trim()) {
      searchParams.set('search', searchTerm.trim())
    }

    const response = await this.get<CompaniesApiResponse>(`/companies/?${searchParams.toString()}`)

    return {
      companies: response.data || [],
      total: response.total_count || 0,
    }
  }

  async getCompaniesByTickers(tickers: string[]): Promise<Record<string, CompanyApi>> {
    if (!tickers.length) {
      return {}
    }

    const filters = { ticker__in: tickers.join(',') }
    const params = new URLSearchParams()
    params.set('filters', JSON.stringify(filters))
    params.set('limit', '1000')

    const response = await this.get<CompaniesApiResponse>(`/companies/?${params.toString()}`)

    return response.data.reduce<Record<string, CompanyApi>>((acc, company) => {
      if (company?.ticker) {
        acc[company.ticker] = company
      }
      return acc
    }, {})
  }

  async getCompaniesByIds(ids: string[]): Promise<CompanyApi[]> {
    if (!ids.length) {
      return []
    }

    const params = new URLSearchParams()
    const trimmedIds = ids.map((id) => String(id).trim()).filter((id) => id.length > 0)
    const search =
      trimmedIds.length === 1
        ? `id__eq:${trimmedIds[0]}`
        : `or:${trimmedIds.map((id) => `id__eq:${id}`).join(';')}`
    // /companies endpoint supports "search" filters (not "filters"), so we use search to fetch by id.
    params.set('search', search)
    params.set('limit', String(Math.max(trimmedIds.length, 1)))

    const response = await this.get<CompaniesApiResponse>(`/companies/?${params.toString()}`)

    return response.data
  }

  async getCompanyBySearch(
    ticker: string,
    options?: { entityId?: number | null }
  ): Promise<CompanyApi | null> {
    const searchTerm = buildCompaniesSearchFilter({
      ticker,
      entityId: options?.entityId,
    })
    if (!searchTerm) {
      return null
    }

    const { companies } = await this.searchCompanies({
      searchTerm,
      limit: 100,
    })
    return companies[0] ?? null
  }
}

export const companiesService = new CompaniesService()
