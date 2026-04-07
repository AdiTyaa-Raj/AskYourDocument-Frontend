'use client'

/**
 * Coverage Search and Filter Helpers
 * 
 * This file demonstrates the pattern of using global utilities from @/lib/utils
 * combined with domain-specific logic for coverage components (Portfolio, Watchlist, Universe).
 * 
 * Pattern:
 * 1. Use global utilities for generic operations (search, sort, basic filtering)
 * 2. Handle domain-specific logic locally (ticker formatting, analyst names, etc.)
 * 3. Combine them in a clean, reusable way
 */

import React from 'react'
import {
  performSearchAndFilter,
  validateSearchQuery,
  type SearchFilterOptions,
} from '@/lib/utils'
import { useDebounced } from '@/lib/hooks/useDebounce'
import type { UniverseTableRow, PortfolioHoldingsTableRow } from './types'
import type { WatchListTableData } from './types'

/**
 * Search fields for different coverage tabs
 */
export const COVERAGE_SEARCH_FIELDS = {
  PORTFOLIO: ['ticker', 'companyName', 'primaryAnalystName', 'secondaryAnalystName'] as (keyof PortfolioHoldingsTableRow)[],
  WATCHLIST: ['ticker', 'securityDescription', 'sector', 'country', 'primaryAnalyst'] as (keyof WatchListTableData)[],
  UNIVERSE: ['ticker', 'securityDescription', 'sector', 'country', 'primaryAnalystName'] as (keyof UniverseTableRow)[],
}

/**
 * Generic search function for coverage data
 * Demonstrates the pattern of using global search utilities
 */
export function searchCoverageData<T extends Record<string, unknown>>(
  data: T[],
  searchQuery: string,
  searchFields: (keyof T)[],
  sortConfig?: { key: string; direction: 'asc' | 'desc' | null }
): T[] {
  const options: SearchFilterOptions<T> = {
    searchQuery,
    searchFields,
    sortConfig
  }

  return performSearchAndFilter(data, options)
}

/**
 * Format a raw search query into the API search format
 * Returns: or:ticker__ilike:searchQuery;name__ilike:searchQuery
 */
export function formatApiSearchQuery(query: string): string {
  if (!query || !query.trim()) return ''
  const trimmedQuery = query.trim()
  return `or:ticker__ilike:${trimmedQuery};name__ilike:${trimmedQuery}`
}

/**
 * Hook for managing coverage search with debouncing
 * Shows how to use global debouncing utility in domain-specific context
 */
export function useCoverageSearch(
  initialQuery: string = '',
  delay: number = 300
) {
  const [searchQuery, setSearchQuery] = React.useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = React.useState(initialQuery)

  const debouncedSearch = useDebounced((query: string) => {
    setDebouncedQuery(query)
  }, delay)

  React.useEffect(() => {
    if (validateSearchQuery(searchQuery)) {
      debouncedSearch(searchQuery)
    } else {
      setDebouncedQuery('')
    }
  }, [searchQuery, debouncedSearch])

  // Format the debounced query for API consumption
  const formattedSearchQuery = React.useMemo(
    () => formatApiSearchQuery(debouncedQuery),
    [debouncedQuery]
  )

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    formattedSearchQuery,
    isValidQuery: validateSearchQuery(searchQuery)
  }
}

/**
 * Portfolio Holdings specific search function
 */
export function searchPortfolioHoldings(
  portfolioData: PortfolioHoldingsTableRow[],
  searchQuery: string,
  sortConfig?: { key: string; direction: 'asc' | 'desc' | null }
): PortfolioHoldingsTableRow[] {
  return searchCoverageData(
    portfolioData,
    searchQuery,
    COVERAGE_SEARCH_FIELDS.PORTFOLIO,
    sortConfig
  )
}

/**
 * WatchList specific search function
 */
export function searchWatchList(
  watchlistData: WatchListTableData[],
  searchQuery: string,
  sortConfig?: { key: string; direction: 'asc' | 'desc' | null }
): WatchListTableData[] {
  return searchCoverageData(
    watchlistData,
    searchQuery,
    COVERAGE_SEARCH_FIELDS.WATCHLIST,
    sortConfig
  )
}

/**
 * Universe specific search function
 */
export function searchUniverse(
  universeData: UniverseTableRow[],
  searchQuery: string,
  sortConfig?: { key: string; direction: 'asc' | 'desc' | null }
): UniverseTableRow[] {
  return searchCoverageData(
    universeData,
    searchQuery,
    COVERAGE_SEARCH_FIELDS.UNIVERSE,
    sortConfig
  )
}

/**
 * Sector filter function for Universe data
 * Example of domain-specific filtering combined with global search
 */
export function filterUniverseBySector(
  universeData: UniverseTableRow[],
  searchQuery: string,
  sectorFilter: string,
  sortConfig?: { key: string; direction: 'asc' | 'desc' | null }
): UniverseTableRow[] {
  let filtered = universeData

  // Apply sector filter first (domain-specific logic)
  if (sectorFilter !== 'all') {
    filtered = filtered.filter((company) => company.sector === sectorFilter)
  }

  // Then apply global search
  return searchCoverageData(filtered, searchQuery, COVERAGE_SEARCH_FIELDS.UNIVERSE, sortConfig)
}

/**
 * Get unique sectors from universe data
 * Utility function to extract filter options
 */
export function getUniqueSectors(universeData: UniverseTableRow[]): string[] {
  return [...new Set(universeData.map(company => company.sector))].filter(Boolean)
}

/**
 * Example usage pattern for coverage components:
 * 
 * ```tsx
 * import { useCoverageSearch, searchPortfolioHoldings } from './lib/search-filter-helpers'
 * 
 * function PortfolioHoldings({ data, sortConfig }: PortfolioHoldingsProps) {
 *   const { searchQuery, setSearchQuery, debouncedQuery } = useCoverageSearch()
 *   
 *   const filteredData = useMemo(() => {
 *     return searchPortfolioHoldings(data, debouncedQuery, sortConfig)
 *   }, [data, debouncedQuery, sortConfig])
 * 
 *   return (
 *     <div>
 *       <Input 
 *         value={searchQuery} 
 *         onChange={(e) => setSearchQuery(e.target.value)} 
 *         placeholder="Search portfolio..." 
 *       />
 *       <DataTable data={filteredData} {...otherProps} />
 *     </div>
 *   )
 * }
 * ```
 */

// Re-export global utilities that are commonly used with coverage
export {
  validateSearchQuery,
  performTextSearch
} from '@/lib/utils'

export { useDebounced } from '@/lib/hooks/useDebounce'
