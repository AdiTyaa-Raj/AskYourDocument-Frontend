/**
 * Tests for Coverage Search and Filter Helpers
 */

import { describe, it, expect } from 'vitest'
import {
  searchCoverageData,
  formatApiSearchQuery,
  searchPortfolioHoldings,
  searchWatchList,
  searchUniverse,
  filterUniverseBySector,
  getUniqueSectors,
  COVERAGE_SEARCH_FIELDS,
} from '@/containers/coverage/lib/search-filter-helpers'
import type {
  PortfolioHoldingsTableRow,
  WatchListTableData,
  UniverseTableRow,
} from '@/containers/coverage/lib/types'

describe('Coverage Search and Filter Helpers', () => {
  describe('COVERAGE_SEARCH_FIELDS', () => {
    it('defines search fields for portfolio', () => {
      expect(COVERAGE_SEARCH_FIELDS.PORTFOLIO).toEqual([
        'ticker',
        'companyName',
        'primaryAnalystName',
        'secondaryAnalystName',
      ])
    })

    it('defines search fields for watchlist', () => {
      expect(COVERAGE_SEARCH_FIELDS.WATCHLIST).toEqual([
        'ticker',
        'securityDescription',
        'sector',
        'country',
        'primaryAnalyst',
      ])
    })

    it('defines search fields for universe', () => {
      expect(COVERAGE_SEARCH_FIELDS.UNIVERSE).toEqual([
        'ticker',
        'securityDescription',
        'sector',
        'country',
        'primaryAnalystName',
      ])
    })
  })

  describe('formatApiSearchQuery', () => {
    it('formats search query for API', () => {
      const result = formatApiSearchQuery('AAPL')
      expect(result).toBe('or:ticker__ilike:AAPL;name__ilike:AAPL')
    })

    it('trims whitespace from query', () => {
      const result = formatApiSearchQuery('  AAPL  ')
      expect(result).toBe('or:ticker__ilike:AAPL;name__ilike:AAPL')
    })

    it('returns empty string for empty query', () => {
      const result = formatApiSearchQuery('')
      expect(result).toBe('')
    })

    it('returns empty string for whitespace-only query', () => {
      const result = formatApiSearchQuery('   ')
      expect(result).toBe('')
    })

    it('handles special characters', () => {
      const result = formatApiSearchQuery('ABC-123')
      expect(result).toBe('or:ticker__ilike:ABC-123;name__ilike:ABC-123')
    })
  })

  describe('searchCoverageData', () => {
    const mockData = [
      { id: 1, ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
      { id: 2, ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
      { id: 3, ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    ]

    it('searches by ticker', () => {
      const result = searchCoverageData(mockData, 'AAPL', ['ticker', 'name'])
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
    })

    it('searches by name', () => {
      const result = searchCoverageData(mockData, 'Apple', ['ticker', 'name'])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Apple Inc.')
    })

    it('returns all data when search query is empty', () => {
      const result = searchCoverageData(mockData, '', ['ticker', 'name'])
      expect(result).toHaveLength(3)
    })

    it('searches case-insensitively', () => {
      const result = searchCoverageData(mockData, 'apple', ['ticker', 'name'])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Apple Inc.')
    })

    it('searches across multiple fields', () => {
      const result = searchCoverageData(mockData, 'Tech', ['ticker', 'name', 'sector'])
      expect(result).toHaveLength(3)
    })

    it('applies sort configuration', () => {
      const sortConfig = { key: 'ticker', direction: 'desc' as const }
      const result = searchCoverageData(mockData, '', ['ticker', 'name'], sortConfig)
      expect(result[0].ticker).toBe('MSFT')
      expect(result[2].ticker).toBe('AAPL')
    })
  })

  describe('searchPortfolioHoldings', () => {
    const mockPortfolioData: PortfolioHoldingsTableRow[] = [
      {
        id: 1,
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        primaryAnalyst: 'JD',
        primaryAnalystName: 'John Doe',
        secondaryAnalyst: 'JS',
        secondaryAnalystName: 'Jane Smith',
      },
      {
        id: 2,
        ticker: 'GOOGL',
        companyName: 'Alphabet Inc.',
        primaryAnalyst: 'BJ',
        primaryAnalystName: 'Bob Johnson',
        secondaryAnalyst: 'AS',
        secondaryAnalystName: 'Alice Smith',
      },
    ]

    it('searches portfolio holdings by ticker', () => {
      const result = searchPortfolioHoldings(mockPortfolioData, 'AAPL')
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
    })

    it('searches portfolio holdings by company name', () => {
      const result = searchPortfolioHoldings(mockPortfolioData, 'Apple')
      expect(result).toHaveLength(1)
      expect(result[0].companyName).toBe('Apple Inc.')
    })

    it('searches portfolio holdings by analyst name', () => {
      const result = searchPortfolioHoldings(mockPortfolioData, 'John')
      // Both companies might match if 'John' appears in any searchable field
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].primaryAnalystName).toBe('John Doe')
    })

    it('returns all holdings when query is empty', () => {
      const result = searchPortfolioHoldings(mockPortfolioData, '')
      expect(result).toHaveLength(2)
    })

    it('applies sorting to portfolio holdings', () => {
      const sortConfig = { key: 'ticker', direction: 'desc' as const }
      const result = searchPortfolioHoldings(mockPortfolioData, '', sortConfig)
      expect(result[0].ticker).toBe('GOOGL')
    })
  })

  describe('searchWatchList', () => {
    const mockWatchlistData: WatchListTableData[] = [
      {
        id: 1,
        ticker: 'AAPL',
        securityDescription: 'Apple Inc.',
        sector: 'Technology',
        country: 'USA',
        primaryAnalyst: 'JD',
      },
      {
        id: 2,
        ticker: 'GOOGL',
        securityDescription: 'Alphabet Inc.',
        sector: 'Technology',
        country: 'USA',
        primaryAnalyst: 'BJ',
      },
    ]

    it('searches watchlist by ticker', () => {
      const result = searchWatchList(mockWatchlistData, 'AAPL')
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
    })

    it('searches watchlist by security description', () => {
      const result = searchWatchList(mockWatchlistData, 'Apple')
      expect(result).toHaveLength(1)
      expect(result[0].securityDescription).toBe('Apple Inc.')
    })

    it('searches watchlist by sector', () => {
      const result = searchWatchList(mockWatchlistData, 'Technology')
      expect(result).toHaveLength(2)
    })

    it('searches watchlist by country', () => {
      const result = searchWatchList(mockWatchlistData, 'USA')
      expect(result).toHaveLength(2)
    })

    it('applies sorting to watchlist', () => {
      const sortConfig = { key: 'ticker', direction: 'asc' as const }
      const result = searchWatchList(mockWatchlistData, '', sortConfig)
      expect(result[0].ticker).toBe('AAPL')
    })
  })

  describe('searchUniverse', () => {
    const mockUniverseData: UniverseTableRow[] = [
      {
        id: 1,
        ticker: 'AAPL',
        securityDescription: 'Apple Inc.',
        sector: 'Technology',
        country: 'USA',
        primaryAnalystName: 'John Doe',
      },
      {
        id: 2,
        ticker: 'GOOGL',
        securityDescription: 'Alphabet Inc.',
        sector: 'Technology',
        country: 'USA',
        primaryAnalystName: 'Bob Johnson',
      },
    ]

    it('searches universe by ticker', () => {
      const result = searchUniverse(mockUniverseData, 'AAPL')
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
    })

    it('searches universe by security description', () => {
      const result = searchUniverse(mockUniverseData, 'Alphabet')
      expect(result).toHaveLength(1)
      expect(result[0].securityDescription).toBe('Alphabet Inc.')
    })

    it('searches universe by sector', () => {
      const result = searchUniverse(mockUniverseData, 'Technology')
      expect(result).toHaveLength(2)
    })

    it('applies sorting to universe', () => {
      const sortConfig = { key: 'ticker', direction: 'desc' as const }
      const result = searchUniverse(mockUniverseData, '', sortConfig)
      expect(result[0].ticker).toBe('GOOGL')
    })
  })

  describe('filterUniverseBySector', () => {
    const mockUniverseData: UniverseTableRow[] = [
      {
        id: 1,
        ticker: 'AAPL',
        securityDescription: 'Apple Inc.',
        sector: 'Technology',
        country: 'USA',
      },
      {
        id: 2,
        ticker: 'JPM',
        securityDescription: 'JPMorgan Chase',
        sector: 'Financial',
        country: 'USA',
      },
      {
        id: 3,
        ticker: 'GOOGL',
        securityDescription: 'Alphabet Inc.',
        sector: 'Technology',
        country: 'USA',
      },
    ]

    it('filters by sector', () => {
      const result = filterUniverseBySector(mockUniverseData, '', 'Technology')
      expect(result).toHaveLength(2)
      expect(result.every((item) => item.sector === 'Technology')).toBe(true)
    })

    it('returns all data when sector filter is "all"', () => {
      const result = filterUniverseBySector(mockUniverseData, '', 'all')
      expect(result).toHaveLength(3)
    })

    it('combines sector filter with search', () => {
      const result = filterUniverseBySector(mockUniverseData, 'Apple', 'Technology')
      expect(result).toHaveLength(1)
      expect(result[0].ticker).toBe('AAPL')
    })

    it('applies sorting after filtering', () => {
      const sortConfig = { key: 'ticker', direction: 'desc' as const }
      const result = filterUniverseBySector(mockUniverseData, '', 'Technology', sortConfig)
      expect(result[0].ticker).toBe('GOOGL')
      expect(result[1].ticker).toBe('AAPL')
    })
  })

  describe('getUniqueSectors', () => {
    const mockUniverseData: UniverseTableRow[] = [
      {
        id: 1,
        ticker: 'AAPL',
        securityDescription: 'Apple Inc.',
        sector: 'Technology',
        country: 'USA',
      },
      {
        id: 2,
        ticker: 'JPM',
        securityDescription: 'JPMorgan Chase',
        sector: 'Financial',
        country: 'USA',
      },
      {
        id: 3,
        ticker: 'GOOGL',
        securityDescription: 'Alphabet Inc.',
        sector: 'Technology',
        country: 'USA',
      },
    ]

    it('returns unique sectors', () => {
      const result = getUniqueSectors(mockUniverseData)
      expect(result).toHaveLength(2)
      expect(result).toContain('Technology')
      expect(result).toContain('Financial')
    })

    it('filters out falsy values', () => {
      const dataWithUndefined: UniverseTableRow[] = [
        ...mockUniverseData,
        {
          id: 4,
          ticker: 'TEST',
          securityDescription: 'Test Company',
          sector: undefined,
          country: 'USA',
        },
      ]

      const result = getUniqueSectors(dataWithUndefined)
      expect(result).not.toContain(undefined)
    })

    it('handles empty data', () => {
      const result = getUniqueSectors([])
      expect(result).toHaveLength(0)
    })
  })
})
