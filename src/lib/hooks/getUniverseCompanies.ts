/**
 * Infinite Universe Companies Hook
 * Provides infinite scroll functionality for universe companies
 * Uses backend search API for real-time searching
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { companiesService } from '@/services/api/companies.service'
import type { CompanyApi } from '@/services/api/companies.service'

// Types for this hook
export interface CompanyTableRow {
  id: number
  ticker: string
  securityDescription: string
  exchange: string
  gics: string
  stage?: {
    name: string
    slug: string
  }
  [key: string]: unknown
}

export interface InfiniteCompaniesPage {
  companies: CompanyTableRow[]
  total: number
  nextOffset: number | null
}

// Transform company API response to table row format
function transformCompanyToTableRow(company: CompanyApi): CompanyTableRow {
  const row: CompanyTableRow = {
    id: company.id,
    ticker: company.ticker,
    securityDescription: company.name,
    exchange: company.exchange || '',
    gics: company.gics || '',
    stage: company.stage,
  }

  // Add all meta fields except isin_list and isin
  if (company.meta) {
    Object.keys(company.meta).forEach((key) => {
      if (key !== 'isin_list' && key !== 'isin') {
        row[key] = company.meta![key]
      }
    })
  }

  return row
}

const PAGE_SIZE = 50 // Show 30 companies at a time, load more on scroll

export function useUniverseCompanies(searchTerm?: string, enabled: boolean = true) {
  return useInfiniteQuery({
    queryKey: ['companies', 'search', 'infinite', { search: searchTerm }],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const response = await companiesService.searchCompanies({
          searchTerm,
          skip: pageParam,
          limit: PAGE_SIZE,
        })

        // Transform API data to table format
        const transformedCompanies = response.companies.map(transformCompanyToTableRow)
        const nextOffset = pageParam + PAGE_SIZE < response.total ? pageParam + PAGE_SIZE : null

        const result: InfiniteCompaniesPage = {
          companies: transformedCompanies,
          total: response.total,
          nextOffset,
        }

        return result
      } catch (error) {
        throw error // Re-throw to let React Query handle it
      }
    },
    enabled, // Only fetch when enabled
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 1, // 1 minute (shorter for search results)
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Retry once on failure
  })
}
