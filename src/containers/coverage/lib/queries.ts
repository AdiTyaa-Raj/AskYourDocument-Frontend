/**
 * Coverage Queries
 * TanStack Query hooks for coverage-related data fetching
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coverageService } from '@/services/api/coverage.service'
import {
  pipelineService,
  type PipelineStageCompanyRecordApi,
} from '@/services/api/pipeline.service'
import { PipelineStage } from './types'
import type {
  AnalystOption,
  PortfolioHoldingsTableRow,
  UniverseTableRow,
  UpdateStageAssignmentAnalystsVariables,
  WatchListTableRowBase,
} from './types'
import { normaliseAttachmentRequirements } from '@/lib/attachments'
import { resolveCompanyExchange } from '@/lib/resolveCompanyExchange'
import { getAnalystInitials, toNumericId } from '@/containers/coverage/lib/helper'

// Query keys for better cache management
export const coverageKeys = {
  all: ['coverage'] as const,
  byStage: (stage: PipelineStage) => [...coverageKeys.all, stage] as const,
  byStageWithParams: (stage: PipelineStage, skip: number, limit: number, search?: string) =>
    [...coverageKeys.byStage(stage), { skip, limit, search }] as const,
  users: ['coverage', 'users'] as const,
  usersByRole: (roleName?: string) => [...coverageKeys.users, { roleName }] as const,
}

/**
 * Transform API company data to table row format
 * Dynamically includes all meta fields except isin_list and isin
 */
export function transformCompanyToTableRow(
  companyData: PipelineStageCompanyRecordApi
): UniverseTableRow {
  const { Company } = companyData
  const meta = Company.meta
  const assignmentMeta = (companyData.StageAssignment?.meta ?? {}) as Record<string, unknown>
  const stageMeta = (companyData.Stage?.meta ?? {}) as Record<string, unknown>
  const recordRequirements = (
    companyData as unknown as { required_documents?: unknown }
  ).required_documents
  const requiredAttachments = normaliseAttachmentRequirements(
    assignmentMeta.required_documents ?? stageMeta.required_documents ?? recordRequirements
  )

  // Start with base fields
  const row: UniverseTableRow = {
    id: Company.id,
    ticker: Company.ticker,
    securityDescription: Company.name,
    requiredAttachments,
  }

  // Dynamically add all meta fields except isin_list and isin
  if (meta) {
    Object.keys(meta).forEach(key => {
      if (key !== 'isin_list' && key !== 'isin') {
        row[key] = meta[key]
      }
    })
  }
  return row
}

/**
 * Transform API company data to watchlist table row base (company + meta + attachments).
 * Analyst fields are merged in the container via `buildWatchlistAnalystFieldsFromRecord`.
 */
export function transformCompanyToWatchlistBaseRow(
  companyData: PipelineStageCompanyRecordApi
): WatchListTableRowBase {
  const { Company, StageAssignment } = companyData
  const meta = Company.meta
  const assignmentMeta = (StageAssignment?.meta ?? {}) as Record<string, unknown>
  const stageMeta = (companyData.Stage?.meta ?? {}) as Record<string, unknown>
  const recordRequirements = (
    companyData as unknown as { required_documents?: unknown }
  ).required_documents
  const requiredAttachments = normaliseAttachmentRequirements(
    assignmentMeta.required_documents ?? stageMeta.required_documents ?? recordRequirements
  )

  const row: WatchListTableRowBase = {
    id: Company.id,
    ticker: Company.ticker,
    securityDescription: Company.name,
    requiredAttachments,
  }

  // Dynamically add all meta fields except isin_list and isin
  if (meta) {
    Object.keys(meta).forEach(key => {
      if (key !== 'isin_list' && key !== 'isin') {
        row[key] = meta[key]
      }
    })
  }
  return row
}

/**
 * Generic fetcher for coverage companies via aggregated pipeline endpoint
 */
async function fetchCoverageStageCompanies<T>(
  stage: PipelineStage,
  skip: number,
  limit: number,
  search: string | undefined,
  mapper: (record: PipelineStageCompanyRecordApi) => T
): Promise<{ companies: T[]; total: number }> {
  const response = await pipelineService.getAllStageCompanies({
    view: 'crm',
    stage,
    skip,
    limit,
    search,
  })

  const stagePayload = response.stages?.[stage] ?? { companies: [], total: 0 }
  return {
    companies: stagePayload.companies.map(mapper),
    total: stagePayload.total || 0,
  }
}

/**
 * Hook to fetch universe companies
 */
export function useUniverseCompanies(
  skip: number = 0,
  limit: number = 100,
  search?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: coverageKeys.byStageWithParams('UNIVERSE', skip, limit, search),
    queryFn: () =>
      fetchCoverageStageCompanies('UNIVERSE', skip, limit, search, transformCompanyToTableRow),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook to fetch watchlist companies
 */
export function useWatchlistCompanies(
  skip: number = 0,
  limit: number = 100,
  search?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: coverageKeys.byStageWithParams('WATCHLIST', skip, limit, search),
    queryFn: () =>
      fetchCoverageStageCompanies('WATCHLIST', skip, limit, search, (record) => record),
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })
}

/**
 * Format label for display - strips underscores and adds spaces between words
 * Example: mcap_usd_m -> Mcap Usd M, adtv_m -> Adtv M
 */
const UPPERCASE_ACRONYMS = new Set(['irr'])

export function formatLabel(key: string): string {
  return key
    .split('_')
    .map((word) => {
      const lower = word.toLowerCase()
      if (UPPERCASE_ACRONYMS.has(lower)) return lower.toUpperCase()
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Transform API company data to portfolio holdings table row format
 * Dynamically includes all meta fields except isin_list and isin
 */
export function transformCompanyToPortfolioHoldingsRow(
  companyData: PipelineStageCompanyRecordApi
): PortfolioHoldingsTableRow {
  const { Company, StageAssignment } = companyData
  const companyMeta = (Company.meta ?? {}) as Record<string, unknown>
  const stageAssignmentMeta = (StageAssignment?.meta ?? {}) as Record<string, unknown>
  const primaryAnalystEntry = (stageAssignmentMeta.primary_analyst as Array<Record<string, unknown>> | undefined)?.[0]
  const secondaryAnalystEntry = (stageAssignmentMeta.secondary_analyst as Array<Record<string, unknown>> | undefined)?.[0]

  // Extract primary analyst info from StageAssignment.meta
  const primaryAnalyst = primaryAnalystEntry
    ? getAnalystInitials(
        (primaryAnalystEntry.email as string) ?? '',
        (primaryAnalystEntry.full_name as string) ?? ''
      )
    : undefined
  const primaryAnalystName = primaryAnalystEntry?.full_name !== primaryAnalystEntry?.email
    ? (primaryAnalystEntry?.full_name as string | undefined)
    : (primaryAnalystEntry?.email as string | undefined)
  const primaryAnalystId = toNumericId(primaryAnalystEntry?.user_id ?? primaryAnalystEntry?.id)

  // Extract secondary analyst info from StageAssignment.meta
  const secondaryAnalyst = secondaryAnalystEntry
    ? getAnalystInitials(
        (secondaryAnalystEntry.email as string) ?? '',
        (secondaryAnalystEntry.full_name as string) ?? ''
      )
    : undefined
  const secondaryAnalystName = secondaryAnalystEntry?.full_name !== secondaryAnalystEntry?.email
    ? (secondaryAnalystEntry?.full_name as string | undefined)
    : (secondaryAnalystEntry?.email as string | undefined)
  const secondaryAnalystId = toNumericId(secondaryAnalystEntry?.user_id ?? secondaryAnalystEntry?.id)
  const stageAssignmentId = toNumericId(StageAssignment?.id)

  // Start with base fields
  const row: PortfolioHoldingsTableRow = {
    id: Company.id,
    ticker: Company.ticker,
    companyName: Company.name,
    stageAssignmentId,
    primaryAnalyst,
    primaryAnalystName,
    primaryAnalystId,
    secondaryAnalyst,
    secondaryAnalystName,
    secondaryAnalystId,
    canAssignAnalysts: !primaryAnalystEntry || !secondaryAnalystEntry,
  }

  // Dynamically add all meta fields except isin_list, isin, and fields already extracted
  if (companyMeta) {
    Object.keys(companyMeta).forEach(key => {
      if (key !== 'isin_list' && key !== 'isin') {
        row[key] = companyMeta[key]
      }
    })
  }
  return row
}

/**
 * Hook to fetch portfolio holdings
 */
export function usePortfolioHoldings(
  skip: number = 0,
  limit: number = 100,
  search?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: coverageKeys.byStageWithParams('INVESTED', skip, limit, search),
    queryFn: () =>
      fetchCoverageStageCompanies(
        'INVESTED',
        skip,
        limit,
        search,
        transformCompanyToPortfolioHoldingsRow
      ),
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })
}

export function useUpdateStageAssignmentAnalysts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: UpdateStageAssignmentAnalystsVariables) =>
      coverageService.updateStageAssignmentAnalysts(
        variables.stageAssignmentId,
        {
          primary_analyst: variables.primaryAnalystId,
          secondary_analyst: variables.secondaryAnalystId,
        },
        variables.confirmReassignment
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('INVESTED') })
      queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('WATCHLIST') })
    },
  })
}


/**
 * Hook to fetch analysts by role
 */
export function useAnalysts(roleName?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: coverageKeys.usersByRole(roleName),
    queryFn: async () => {
      if (!roleName) {
        return []
      }

      const response = await coverageService.getUsersByRole(roleName, 0, 100)


      if (!response.users) {
        console.warn('⚠️ useAnalysts - No users in response, returning empty array')
        return []
      }

      // Transform API data to select options format
      const transformedAnalysts = response.users.map((userWithRole): AnalystOption => ({
        id: userWithRole.User.id,
        value: userWithRole.User.id.toString(),
        label: userWithRole.User.full_name,
      }))


      return transformedAnalysts
    },
    enabled: enabled && Boolean(roleName),
    staleTime: 1000 * 60 * 10, // 10 minutes - user data changes less frequently
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}
