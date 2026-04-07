'use client'

import { useCallback } from 'react'

/**
 * Hook for managing URL search parameters for filters
 * @param searchParams - URLSearchParams instance
 * @param setSearchParams - Function to update URL search params
 * @param paramMapping - Mapping of filter keys to URL parameter names
 * @returns Object with functions to manage URL parameters
 */
export function useFilterUrlParams(
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void,
  paramMapping: Record<string, string> = {}
) {
  const updateUrlParam = useCallback(
    (key: string, value: string | null) => {
      const paramKey = paramMapping[key] || key

      if (value && value !== 'all' && value.trim() !== '') {
        searchParams.set(paramKey, value)
      } else {
        searchParams.delete(paramKey)
      }

      // Reset page to 1 when filters change
      if (key !== 'page' && key !== 'pageSize') {
        searchParams.set('page', '1')
      }

      setSearchParams(searchParams)
    },
    [searchParams, setSearchParams, paramMapping]
  )

  const updateMultipleUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      let hasChanges = false

      Object.entries(updates).forEach(([key, value]) => {
        const paramKey = paramMapping[key] || key

        if (value && value !== 'all' && value.trim() !== '') {
          if (searchParams.get(paramKey) !== value) {
            searchParams.set(paramKey, value)
            hasChanges = true
          }
        } else {
          if (searchParams.has(paramKey)) {
            searchParams.delete(paramKey)
            hasChanges = true
          }
        }
      })

      if (hasChanges) {
        // Reset page to 1 when filters change
        if (!updates.page && !updates.pageSize) {
          searchParams.set('page', '1')
        }
        setSearchParams(searchParams)
      }
    },
    [searchParams, setSearchParams, paramMapping]
  )

  const getUrlParam = useCallback(
    (key: string, defaultValue: string = '') => {
      const paramKey = paramMapping[key] || key
      return searchParams.get(paramKey) || defaultValue
    },
    [searchParams, paramMapping]
  )

  return {
    updateUrlParam,
    updateMultipleUrlParams,
    getUrlParam,
  }
}
