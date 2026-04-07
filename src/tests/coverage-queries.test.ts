/**
 * Tests for Coverage Queries
 */

import { describe, it, expect } from 'vitest'
import {
  transformCompanyToTableRow,
  transformCompanyToWatchlistBaseRow,
  transformCompanyToPortfolioHoldingsRow,
  formatLabel,
  coverageKeys,
} from '@/containers/coverage/lib/queries'
import { buildWatchlistAnalystFieldsFromRecord } from '@/containers/coverage/lib/helper'
import type { WatchListTableData } from '@/containers/coverage/lib/types'
import type { PipelineStageCompanyRecordApi } from '@/services/api/pipeline.service'

/** Mirrors CoverageContainer: base transform in queries, analyst fields from helper */
function toWatchListTableRow(record: PipelineStageCompanyRecordApi): WatchListTableData {
  return {
    ...transformCompanyToWatchlistBaseRow(record),
    ...buildWatchlistAnalystFieldsFromRecord(record),
  }
}

describe('Coverage Queries', () => {
  describe('coverageKeys', () => {
    it('generates correct key for all coverage', () => {
      expect(coverageKeys.all).toEqual(['coverage'])
    })

    it('generates correct key for stage', () => {
      expect(coverageKeys.byStage('UNIVERSE')).toEqual(['coverage', 'UNIVERSE'])
    })

    it('generates correct key for stage with params', () => {
      expect(coverageKeys.byStageWithParams('UNIVERSE', 0, 10, 'search')).toEqual([
        'coverage',
        'UNIVERSE',
        { skip: 0, limit: 10, search: 'search' },
      ])
    })

    it('generates correct key for users', () => {
      expect(coverageKeys.users).toEqual(['coverage', 'users'])
    })

    it('generates correct key for users by role', () => {
      expect(coverageKeys.usersByRole('analyst')).toEqual([
        'coverage',
        'users',
        { roleName: 'analyst' },
      ])
    })
  })

  describe('transformCompanyToTableRow', () => {
    const baseStageAssignment: NonNullable<PipelineStageCompanyRecordApi['StageAssignment']> = {
      id: 100,
      company_id: 1,
      stage_id: 1,
      active: true,
      effective_date: null,
      active_until: null,
      meta: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const baseStage: NonNullable<PipelineStageCompanyRecordApi['Stage']> = {
      slug: 'UNIVERSE',
      name: 'Universe',
      order: 1,
      meta: {},
    }

    const mockCompanyData: PipelineStageCompanyRecordApi = {
      Company: {
        id: 1,
        ticker: 'AAPL',
        name: 'Apple Inc.',
        meta: {
          sector: 'Technology',
          country: 'USA',
          price: '150.25',
          mcap_usd_m: '2500000',
          adtv_m: '75.5',
          isin: 'US0378331005', // Should be excluded
          isin_list: ['US0378331005'], // Should be excluded
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      StageAssignment: baseStageAssignment,
      Stage: baseStage,
      current_approval_request: [],
    }

    it('transforms company data to table row', () => {
      const result = transformCompanyToTableRow(mockCompanyData)

      expect(result.id).toBe(1)
      expect(result.ticker).toBe('AAPL')
      expect(result.securityDescription).toBe('Apple Inc.')
    })

    it('includes meta fields in the transformed row', () => {
      const result = transformCompanyToTableRow(mockCompanyData)

      expect(result.sector).toBe('Technology')
      expect(result.country).toBe('USA')
      expect(result.price).toBe('150.25')
      expect(result.mcap_usd_m).toBe('2500000')
      expect(result.adtv_m).toBe('75.5')
    })

    it('excludes isin and isin_list from meta fields', () => {
      const result = transformCompanyToTableRow(mockCompanyData)

      expect(result.isin).toBeUndefined()
      expect(result.isin_list).toBeUndefined()
    })

    it('handles missing meta gracefully', () => {
      const dataWithoutMeta: PipelineStageCompanyRecordApi = {
        ...mockCompanyData,
        Company: {
          ...mockCompanyData.Company,
          meta: {},
        },
      }

      const result = transformCompanyToTableRow(dataWithoutMeta)

      expect(result.id).toBe(1)
      expect(result.ticker).toBe('AAPL')
    })

    it('normalizes attachment requirements from stage meta', () => {
      const dataWithRequirements: PipelineStageCompanyRecordApi = {
        ...mockCompanyData,
        Stage: {
          ...baseStage,
          meta: {
            required_documents: {
              documents: ['SCREEN'],
              memos: [],
            },
          },
        },
      }

      const result = transformCompanyToTableRow(dataWithRequirements)

      expect(result.requiredAttachments).toBeDefined()
    })
  })

  describe('transformCompanyToWatchlistBaseRow + buildWatchlistAnalystFieldsFromRecord', () => {
    const baseStageAssignment: NonNullable<PipelineStageCompanyRecordApi['StageAssignment']> = {
      id: 100,
      company_id: 1,
      stage_id: 2,
      active: true,
      effective_date: null,
      active_until: null,
      meta: {
        primary_analyst: [
          {
            user_id: 1,
            full_name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'analyst',
          },
        ],
        secondary_analyst: [
          {
            user_id: 2,
            full_name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'analyst',
          },
        ],
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const baseStage: NonNullable<PipelineStageCompanyRecordApi['Stage']> = {
      slug: 'WATCHLIST',
      name: 'Watchlist',
      order: 2,
      meta: {},
    }

    const mockWatchlistData: PipelineStageCompanyRecordApi = {
      Company: {
        id: 1,
        ticker: 'AAPL',
        name: 'Apple Inc.',
        meta: {
          sector: 'Technology',
          country: 'USA',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      StageAssignment: baseStageAssignment,
      Stage: baseStage,
      current_approval_request: [],
    }

    it('transforms watchlist company data with analyst info', () => {
      const result = toWatchListTableRow(mockWatchlistData)

      expect(result.id).toBe(1)
      expect(result.ticker).toBe('AAPL')
      expect(result.securityDescription).toBe('Apple Inc.')
      expect(result.primaryAnalyst).toBe('JD')
      expect(result.primaryAnalystName).toBe('John Doe')
      expect(result.secondaryAnalyst).toBe('JS')
      expect(result.secondaryAnalystName).toBe('Jane Smith')
    })

    it('handles missing analyst info gracefully', () => {
      const dataWithoutAnalysts: PipelineStageCompanyRecordApi = {
        ...mockWatchlistData,
        StageAssignment: {
          ...baseStageAssignment,
          meta: {},
        },
      }

      const result = toWatchListTableRow(dataWithoutAnalysts)

      expect(result.primaryAnalyst).toBeUndefined()
      expect(result.primaryAnalystName).toBeUndefined()
      expect(result.secondaryAnalyst).toBeUndefined()
      expect(result.secondaryAnalystName).toBeUndefined()
    })

    it('extracts initials correctly from full name', () => {
      const result = toWatchListTableRow(mockWatchlistData)

      expect(result.primaryAnalyst).toBe('JD')
      expect(result.secondaryAnalyst).toBe('JS')
    })

    it('uses email as fallback when full name equals email', () => {
      const dataWithEmailOnly: PipelineStageCompanyRecordApi = {
        ...mockWatchlistData,
        StageAssignment: {
          ...baseStageAssignment,
          meta: {
            primary_analyst: [
              {
                user_id: 1,
                full_name: 'john.doe@example.com',
                email: 'john.doe@example.com',
                role: 'analyst',
              },
            ],
          },
        },
      }

      const result = toWatchListTableRow(dataWithEmailOnly)

      expect(result.primaryAnalystName).toBe('john.doe@example.com')
    })
  })

  describe('transformCompanyToPortfolioHoldingsRow', () => {
    const baseStageAssignment: NonNullable<PipelineStageCompanyRecordApi['StageAssignment']> = {
      id: 100,
      company_id: 1,
      stage_id: 3,
      active: true,
      effective_date: null,
      active_until: null,
      meta: {
        primary_analyst: [
          {
            user_id: 1,
            full_name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'analyst',
          },
        ],
        secondary_analyst: [
          {
            user_id: 2,
            full_name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'analyst',
          },
        ],
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    const baseStage: NonNullable<PipelineStageCompanyRecordApi['Stage']> = {
      slug: 'INVESTED',
      name: 'Invested',
      order: 3,
      meta: {},
    }

    const mockPortfolioData: PipelineStageCompanyRecordApi = {
      Company: {
        id: 1,
        ticker: 'AAPL',
        name: 'Apple Inc.',
        meta: {
          date_of_first_investment: '2024-01-15',
          sector: 'Technology',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      StageAssignment: baseStageAssignment,
      Stage: baseStage,
      current_approval_request: [],
    }

    it('transforms portfolio holdings data with analyst IDs', () => {
      const result = transformCompanyToPortfolioHoldingsRow(mockPortfolioData)

      expect(result.id).toBe(1)
      expect(result.ticker).toBe('AAPL')
      expect(result.companyName).toBe('Apple Inc.')
      expect(result.stageAssignmentId).toBe(100)
      expect(result.primaryAnalystId).toBe(1)
      expect(result.secondaryAnalystId).toBe(2)
    })

    it('sets canAssignAnalysts to false when both analysts are assigned', () => {
      const result = transformCompanyToPortfolioHoldingsRow(mockPortfolioData)

      expect(result.canAssignAnalysts).toBe(false)
    })

    it('sets canAssignAnalysts to true when primary analyst is missing', () => {
      const dataWithoutPrimary: PipelineStageCompanyRecordApi = {
        ...mockPortfolioData,
        StageAssignment: {
          ...baseStageAssignment,
          meta: {
            secondary_analyst: [
              {
                user_id: 2,
                full_name: 'Jane Smith',
                email: 'jane.smith@example.com',
                role: 'analyst',
              },
            ],
          },
        },
      }

      const result = transformCompanyToPortfolioHoldingsRow(dataWithoutPrimary)

      expect(result.canAssignAnalysts).toBe(true)
    })

    it('sets canAssignAnalysts to true when secondary analyst is missing', () => {
      const dataWithoutSecondary: PipelineStageCompanyRecordApi = {
        ...mockPortfolioData,
        StageAssignment: {
          ...baseStageAssignment,
          meta: {
            primary_analyst: [
              {
                user_id: 1,
                full_name: 'John Doe',
                email: 'john.doe@example.com',
                role: 'analyst',
              },
            ],
          },
        },
      }

      const result = transformCompanyToPortfolioHoldingsRow(dataWithoutSecondary)

      expect(result.canAssignAnalysts).toBe(true)
    })

    it('includes meta fields in portfolio row', () => {
      const result = transformCompanyToPortfolioHoldingsRow(mockPortfolioData)

      expect(result.date_of_first_investment).toBe('2024-01-15')
      expect(result.sector).toBe('Technology')
    })
  })

  describe('formatLabel', () => {
    it('formats snake_case to Title Case', () => {
      expect(formatLabel('mcap_usd_m')).toBe('Mcap Usd M')
    })

    it('formats single word', () => {
      expect(formatLabel('sector')).toBe('Sector')
    })

    it('formats multiple underscores', () => {
      expect(formatLabel('date_of_first_investment')).toBe('Date Of First Investment')
    })

    it('formats adtv_m correctly', () => {
      expect(formatLabel('adtv_m')).toBe('Adtv M')
    })

    it('handles empty string', () => {
      expect(formatLabel('')).toBe('')
    })

    it('handles uppercase input', () => {
      expect(formatLabel('UPPERCASE_TEXT')).toBe('Uppercase Text')
    })
  })
})
