/**
 * Search Companies Hook
 * Uses the /search/companies API endpoint instead of pipeline/stages/UNIVERSE
 * This hook is specifically for documents and memos company selection
 */

import { useQuery } from '@tanstack/react-query'
import { companiesService } from '@/services/api/companies.service'

// Types for this hook
export interface CompanyRow {
  id: number
  ticker: string
  securityDescription: string
  [key: string]: unknown
}

export interface SearchCompaniesResponse {
  companies: CompanyRow[]
  total: number
}

/**
 * Hook to search/fetch companies using the new search API
 * @param skip - Number of records to skip
 * @param limit - Maximum number of records to return
 * @param searchTerm - Optional search term
 * @param enabled - Whether the query should run (default: true)
 */
export function useSearchCompanies(
  skip: number = 0,
  limit: number = 1000,
  searchTerm?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['companies', 'search', { skip, limit, search: searchTerm }],
    queryFn: async () => {
      const response = await companiesService.searchCompanies({
        searchTerm,
        skip,
        limit,
      })

      // Transform to match the expected format
      const companies: CompanyRow[] = response.companies.map((company) => ({
        id: company.id,
        ticker: company.ticker,
        securityDescription: company.name,
        // Add meta fields if they exist
        ...(company.meta || {}),
      }))

      return {
        companies,
        total: response.total,
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}
