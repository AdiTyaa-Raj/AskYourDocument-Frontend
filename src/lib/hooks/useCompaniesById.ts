/**
 * Hook to fetch company details by IDs
 * Used for loading company information for selected companies in forms
 */

import { useQuery } from '@tanstack/react-query'
import { companiesService } from '@/services/api/companies.service'
import type { CompanyApi } from '@/services/api/companies.service'

export interface CompanyDetails {
  id: string
  ticker: string
  name: string
  stage?: {
    id: number
    name: string
    slug: string
  }
  primary_analyst?: {
    id: number
    full_name: string
    email: string
  } | null
  secondary_analyst?: {
    id: number
    full_name: string
    email: string
  } | null
}

export function useCompaniesById(companyIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['companies', 'by-ids', companyIds.sort().join(',')],
    queryFn: async (): Promise<CompanyDetails[]> => {
      if (companyIds.length === 0) {
        return []
      }

      const companies = await companiesService.getCompaniesByIds(companyIds)

      return companies.map((company: CompanyApi) => ({
        id: String(company.id),
        ticker: company.ticker,
        name: company.name,
        stage: company.stage,
        primary_analyst: company.primary_analyst,
        secondary_analyst: company.secondary_analyst,
      }))
    },
    enabled: enabled && companyIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}
