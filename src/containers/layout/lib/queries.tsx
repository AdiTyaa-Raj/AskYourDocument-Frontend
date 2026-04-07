'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, useEffect } from 'react'
import { layoutService } from '@/services/api'
import { notificationsService } from '@/services/api/notifications.service'
import { usersService } from '@/services/api/users.service'
import { type UniverseTableRow } from '@/containers/coverage/lib/types'
import { type SearchUniverseItem, type FlatCompanyItem } from './types'
import { isSearchUniverseItem, transformFlatCompanyToTableRow } from './helper'
import { useAppDispatch } from '@/store'
import { setUnreadCount, resetUnreadCount } from '@/store/slices/notificationsSlice'
import {
  transformApiNotifications,
  extractNotificationUserIds,
} from '@/containers/notifications/lib/utils'
import type { NotificationFilter } from '@/containers/notifications/lib/types'

/**
 * Transform API search universe data to table row format (Universe+Company shape)
 */
function transformSearchUniverseToTableRow(searchItem: SearchUniverseItem): UniverseTableRow {
  const { Universe, Company } = searchItem
  const meta = Universe.meta || {}

  // Parse numeric values from string format
  const parseNumber = (value: string | undefined, defaultValue: number = 0): number => {
    if (!value) return defaultValue
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
  }

  // Parse risk/reward ratio (remove 'x' suffix)
  const parseRiskReward = (value: string | undefined): number => {
    if (!value) return 0
    const cleaned = value.replace('x', '').trim()
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  // Convert ADTV from millions to actual volume
  const parseAdtv = (value: string | undefined): number => {
    if (!value) return 0
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed * 1_000_000 // Convert millions to actual number
  }

  // Handle exchange field - can be string or array (currently unused but kept for future use)
  const _getExchangeString = (exchange: string | string[] | undefined): string => {
    if (!exchange) return ''
    if (Array.isArray(exchange)) return exchange.join(', ')
    return exchange
  }

  return {
    id: Universe.id,
    ticker: Universe.ticker,
    securityDescription: Company.name,
    price: parseNumber(meta.price),
    ive: parseNumber(meta.ive),
    riskReward: parseRiskReward(meta.rr),
    sector: meta.sector || '',
    country: meta.country || '',
    mCapM: parseNumber(meta.mcap_usd_m),
    adtv: parseAdtv(meta.adtv_m),
    primaryAnalyst: meta.platform || '',
    primaryAnalystName: '', // Not provided in new API response
    requiredAttachments: {}, // Default empty - could be enhanced later
  }
}

export const COMPANY_SEARCH_LIMIT = 10

/**
 * Hook to search companies with debouncing
 */
export function useCompanySearch(searchTerm: string, debounceMs: number = 300) {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce the search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])

  // Only search if we have a meaningful search term (at least 2 characters)
  const shouldSearch = debouncedSearchTerm.length >= 2

  return useQuery({
    queryKey: ['companySearch', debouncedSearchTerm],
    queryFn: async (): Promise<UniverseTableRow[]> => {
      if (!shouldSearch) {
        return []
      }

      // Use the new search API
      const response = await layoutService.searchUniverseCompanies(
        debouncedSearchTerm,
        0,
        COMPANY_SEARCH_LIMIT
      )

      if (!response.data || response.data.length === 0) {
        return []
      }

      // Backend /search/Universe returns flat Company list; support both shapes for compatibility
      return response.data.map((item: SearchUniverseItem | FlatCompanyItem) =>
        isSearchUniverseItem(item)
          ? transformSearchUniverseToTableRow(item)
          : transformFlatCompanyToTableRow(item)
      )
    },
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Imperative helper to fetch a page of company search results (for load more)
 */
export async function fetchCompanySearchPage(
  searchTerm: string,
  skip: number,
  limit: number = COMPANY_SEARCH_LIMIT
): Promise<{ companies: UniverseTableRow[]; hasMore: boolean }> {
  const response = await layoutService.searchUniverseCompanies(searchTerm, skip, limit)

  if (!response.data || response.data.length === 0) {
    return { companies: [], hasMore: false }
  }

  const companies = response.data.map((item: SearchUniverseItem | FlatCompanyItem) =>
    isSearchUniverseItem(item)
      ? transformSearchUniverseToTableRow(item)
      : transformFlatCompanyToTableRow(item)
  )

  return {
    companies,
    hasMore: companies.length === limit,
  }
}

/**
 * Hook to use search input for company suggestions (every keystroke triggers search API)
 */
export function useSearchWithMentions(searchValue: string) {
  const searchTerm = useMemo(() => searchValue.trim(), [searchValue])

  const companySearchResults = useCompanySearch(searchTerm)

  return {
    mentionTerm: searchTerm,
    isSearchingCompanies: searchTerm.length > 0,
    companies: companySearchResults.data || [],
    isLoading: companySearchResults.isLoading,
    error: companySearchResults.error,
  }
}

/**
 * Hook to fetch unread notifications count with automatic refresh every 2 minutes
 * Stores the count in Redux for global access
 */
export function useUnreadNotificationsCount() {
  const dispatch = useAppDispatch()

  return useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      const response = await notificationsService.getUnreadCount()
      const count = response.unread_count

      // Store the count in Redux
      dispatch(setUnreadCount(count))

      return count
    },
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
  })
}

/**
 * Hook to fetch unread notifications for the popover
 * Fetches notifications and stores count in Redux
 */
export function useUnreadNotifications(enabled: boolean = true) {
  const dispatch = useAppDispatch()

  return useQuery({
    queryKey: ['unreadNotifications'],
    queryFn: async () => {
      const response = await notificationsService.getNotificationsByFilter('unread', 0, 20)

      // Filter for unread notifications only
      // A notification is unread if UserEventState is null or is_read is false
      const unreadApiNotifications = response.results.filter(
        (item) => !item.UserEventState || item.UserEventState.is_read === false
      )

      // Update the unread count in Redux store
      dispatch(setUnreadCount(response.total ?? 0))

      return unreadApiNotifications
    },
    enabled,
    staleTime: 1000 * 60 * 2, // Consider data stale after 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
  })
}

/**
 * Hook to fetch notifications with pagination and user details
 * Used by NotificationPopover for fetching and transforming notifications
 */
export function useNotificationsWithUsers(
  filter: NotificationFilter,
  skip: number,
  limit: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['notificationsWithUsers', filter, skip, limit],
    queryFn: async () => {
      const response = await notificationsService.getNotificationsByFilter(filter, skip, limit)

      const filtered = response.results.filter((item) => {
        if (item.UserEventState === null) return true
        return !item.UserEventState.is_deleted
      })

      const userIds = extractNotificationUserIds(filtered)
      const userDirectory = userIds.length ? await usersService.getUsersByIds(userIds) : {}
      const transformed = transformApiNotifications(filtered, userDirectory)

      return {
        notifications: transformed,
        hasMore: transformed.length === limit,
      }
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Mutation hook to mark a single notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: number) => {
      return await notificationsService.markAsRead(notificationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsWithUsers'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] })
    },
  })
}

/**
 * Mutation hook to mark multiple notifications as read
 */
export function useMarkMultipleNotificationsAsRead() {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()

  return useMutation({
    mutationFn: async (notificationIds: number[]) => {
      return await notificationsService.markMultipleAsRead(notificationIds)
    },
    onSuccess: () => {
      dispatch(resetUnreadCount())
      queryClient.invalidateQueries({ queryKey: ['notificationsWithUsers'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] })
    },
  })
}

/**
 * Helper function to fetch notifications with users (for imperative calls like load more)
 * This is not a hook, so it can be called from callbacks
 */
export async function fetchNotificationsWithUsers(
  filter: NotificationFilter,
  skip: number,
  limit: number
) {
  const response = await notificationsService.getNotificationsByFilter(filter, skip, limit)

  const filtered = response.results.filter((item) => {
    if (item.UserEventState === null) return true
    return !item.UserEventState.is_deleted
  })

  const userIds = extractNotificationUserIds(filtered)
  const userDirectory = userIds.length ? await usersService.getUsersByIds(userIds) : {}
  const transformed = transformApiNotifications(filtered, userDirectory)

  return {
    notifications: transformed,
    hasMore: transformed.length === limit,
  }
}
