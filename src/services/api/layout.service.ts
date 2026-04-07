/**
 * Layout Service API
 * Handles layout-related API calls including company search
 */

import { apiClient } from '@/config/axios'
import type { SearchUniverseResponse } from '@/containers/layout/lib/types'

/**
 * Search universe companies by ticker or company name
 */
export const searchUniverseCompanies = async (
  searchTerm: string,
  skip: number = 0,
  limit: number = 100
): Promise<SearchUniverseResponse> => {
  try {
    // Construct the search parameter in the format: or:ticker__ilike:TERM;Company.name__ilike:TERM
    const searchParam = `or:ticker__ilike:${searchTerm};Company.name__ilike:${searchTerm}`

    const response = await apiClient.get('/search/Universe', {
      params: {
        search: searchParam,
        skip,
        limit,
      },
      headers: {
        accept: 'application/json',
      },
    })

    // The API returns [data_array, total_count]
    const [data, total] = response.data

    return {
      data: data || [],
      total: total || 0,
    }
  } catch (error) {
    console.error('Error searching universe companies:', error)
    throw error
  }
}

export const layoutService = {
  searchUniverseCompanies,
}
