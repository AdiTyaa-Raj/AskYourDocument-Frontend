import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ReactNode } from 'react'
import type { SortConfig } from '@/components/shared/DataTable'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generic function to sort data based on sort configuration
 * @param data - Array of data to sort
 * @param sortConfig - Sort configuration with key and direction
 * @returns Sorted array (or original if no sort applied)
 */
/**
 * Check if a string is an ISO 8601 date format
 */
function isISODateString(value: string): boolean {
  // Match ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ or with timezone offset
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3,6})?([+-]\d{2}:\d{2}|Z)?$/.test(value)
}

export function sortData<T extends Record<string, unknown>>(
  data: T[],
  sortConfig: SortConfig
): T[] {
  if (!sortConfig.direction || !sortConfig.key) {
    return data
  }

  return [...data].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof T]
    const bValue = b[sortConfig.key as keyof T]

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0
    if (aValue == null) return 1
    if (bValue == null) return -1

    // Compare values
    let comparison = 0
    if (isISODateString(String(aValue)) && isISODateString(String(bValue))) {
      const aTime = new Date(String(aValue)).getTime()
      const bTime = new Date(String(bValue)).getTime()
      comparison = aTime - bTime
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue)
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else {
      comparison = String(aValue).localeCompare(String(bValue))
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison
  })
}

/**
 * Maps company IDs to ticker symbols and formats display text
 * @param companyIds - Array of company IDs (can be strings or numbers)
 * @param companies - Array of company objects with id, ticker, and name
 * @param fallbackValue - Fallback value if no tickers found
 * @returns Object with displayText and tooltip information
 */
/** UI label: `TICKER:EXCHANGE` when exchange is present, otherwise ticker only. */
export function formatTickerWithExchange(
  ticker: string | null | undefined,
  exchange?: string | null
): string {
  const t = typeof ticker === 'string' ? ticker.trim() : ''
  if (!t) return ''
  const e = typeof exchange === 'string' ? exchange.trim() : ''
  return e ? `${t} : ${e}` : `${t} :  `
}

export function mapCompanyIdsToTickers(
  companyIds: string[],
  companies: Array<{ id: string; ticker: string; name: string }>,
  fallbackValue: string
): { displayText: string; hasMultiple: boolean; allTickers: string[] } {
  const tickers = companyIds
    .map((id) => {
      // Convert ID to string for comparison since API might return numbers or strings
      const idStr = String(id)
      const company = companies.find((c) => String(c.id) === idStr)
      return company?.ticker
    })
    .filter(Boolean) as string[]

  const displayText = tickers.length > 0 ? tickers[0] : fallbackValue
  const hasMultiple = tickers.length > 1

  return {
    displayText,
    hasMultiple,
    allTickers: tickers,
  }
}

export function isLeadInvestorGroup(groups?: string[] | null): boolean {
  if (!groups || !groups.length) return false
  return groups.some((group) => {
    if (!group) return false
    const normalized = group.toLowerCase().replace(/[_\s]/g, '-')
    return normalized === 'lead-investor' || normalized === 'arnie-lead-investor'
  })
}

/**
 * Get status icon for memo status
 */
/**
 * Format value - displays backend data as-is
 */
export function formatValue(_key: string, value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return '—'
  }

  // Handle arrays (like exchange)
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  // Return value as-is from backend
  return String(value)
}

// ===================================
// GENERIC SEARCH AND FILTER UTILITIES
// ===================================

/**
 * Generic filter configuration type
 */
export interface FilterConfig<T> {
  key: keyof T
  values: string[]
  operator?: 'includes' | 'equals' | 'in'
}

/**
 * Generic search and filter options
 */
export interface SearchFilterOptions<T> {
  searchQuery?: string
  searchFields?: (keyof T)[]
  filters?: FilterConfig<T>[]
  sortConfig?: SortConfig
}

/**
 * Validates search query to prevent special characters that could cause issues
 * @param query - The search query to validate
 * @returns True if query is valid
 */
export function validateSearchQuery(query: string): boolean {
  // Allow alphanumeric characters, spaces, and basic punctuation
  const validSearchRegex = /^[a-zA-Z0-9\s\-_.(),!?]*$/
  return validSearchRegex.test(query)
}

/**
 * Generic text search function that searches across multiple fields
 * @param items - Array of items to search
 * @param searchQuery - Search term
 * @param searchFields - Fields to search in
 * @returns Filtered array
 */
export function performTextSearch<T extends Record<string, unknown>>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchQuery.trim() || !validateSearchQuery(searchQuery)) {
    return items
  }

  const query = searchQuery.toLowerCase().trim()

  return items.filter((item) =>
    searchFields.some((field) => {
      const value = item[field]
      if (value == null) return false
      return String(value).toLowerCase().includes(query)
    })
  )
}

/**
 * Generic filter function that applies multiple filter conditions
 * @param items - Array of items to filter
 * @param filters - Array of filter configurations
 * @returns Filtered array
 */
export function performFiltering<T extends Record<string, unknown>>(
  items: T[],
  filters: FilterConfig<T>[]
): T[] {
  return items.filter((item) =>
    filters.every((filter) => {
      if (!filter.values.length) return true

      const itemValue = item[filter.key]
      if (itemValue == null) return false

      const operator = filter.operator || 'includes'

      switch (operator) {
        case 'equals':
          return filter.values.includes(String(itemValue))
        case 'in':
          return Array.isArray(itemValue)
            ? itemValue.some((val) => filter.values.includes(String(val)))
            : filter.values.includes(String(itemValue))
        case 'includes':
        default:
          return filter.values.some((filterValue) =>
            String(itemValue).toLowerCase().includes(filterValue.toLowerCase())
          )
      }
    })
  )
}

/**
 * Combined search, filter, and sort function
 * @param items - Array of items to process
 * @param options - Search, filter, and sort options
 * @returns Processed array
 */
export function performSearchAndFilter<T extends Record<string, unknown>>(
  items: T[],
  options: SearchFilterOptions<T>
): T[] {
  let result = items

  // Apply text search
  if (options.searchQuery && options.searchFields) {
    result = performTextSearch(result, options.searchQuery, options.searchFields)
  }

  // Apply filters
  if (options.filters && options.filters.length > 0) {
    result = performFiltering(result, options.filters)
  }

  // Apply sorting
  if (options.sortConfig) {
    result = sortData(result, options.sortConfig)
  }

  return result
}

/**
 * Extract the `detail` string from an API error response (e.g. Axios 4xx/5xx).
 * Returns the detail string if present, otherwise `undefined`.
 */
export function getApiErrorDetail(error: unknown): string | undefined {
  if (error != null && typeof error === 'object' && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
    if (typeof detail === 'string' && detail.length > 0) return detail
  }
  return undefined
}
