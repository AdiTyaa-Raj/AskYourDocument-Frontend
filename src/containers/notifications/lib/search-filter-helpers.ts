'use client'

/**
 * Notification Search and Filter Helpers
 *
 * This file demonstrates the pattern of using global utilities from @/lib/utils
 * combined with domain-specific logic for notifications.
 *
 * Pattern:
 * 1. Use global utilities for generic operations (search, sort, basic filtering)
 * 2. Handle domain-specific logic locally (boolean fields, complex conditions)
 * 3. Combine them in a clean, reusable way
 */

import React from 'react'
import { performSearchAndFilter, validateSearchQuery, type SearchFilterOptions } from '@/lib/utils'
import { useDebounced } from '@/lib/hooks/useDebounce'
import type { Notification, NotificationFilter, Priority, SortOption } from './types'

/**
 * Search fields that are available for text search in notifications
 */
export const NOTIFICATION_SEARCH_FIELDS: (keyof Notification)[] = [
  'title',
  'description',
  'company',
  'user',
]

/**
 * Options for the priority filter dropdown (value + label)
 */
export const PRIORITY_FILTER_OPTIONS: { value: Priority | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
]

/**
 * Domain-specific filter function for notification categories
 * Handles boolean fields and complex notification-specific logic
 */
export function filterNotificationsByCategory(
  notifications: Notification[],
  activeFilter: NotificationFilter,
  priorityFilter: Priority | 'all'
): Notification[] {
  let filtered = notifications

  // Apply category filter - handles notification-specific boolean logic
  if (activeFilter !== 'all') {
    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter((n) => !n.isRead)
        break
      case 'archived':
        filtered = filtered.filter((n) => n.isArchived)
        break
      case 'approvals':
        filtered = filtered.filter((n) => n.type === 'approval')
        break
      case 'alerts':
        filtered = filtered.filter((n) => n.type === 'alert')
        break
      case 'pipeline':
        filtered = filtered.filter((n) => n.type === 'pipeline')
        break
      case 'maintenance':
        filtered = filtered.filter((n) => n.type === 'maintenance')
        break
    }
  }

  // Apply priority filter using global utility approach
  if (priorityFilter !== 'all') {
    filtered = filtered.filter((n) => n.priority === priorityFilter)
  }

  return filtered
}

/**
 * Combined search and filter function for notifications
 * Demonstrates the pattern of combining global utilities with domain-specific logic
 */
export function searchAndFilterNotifications(
  notifications: Notification[],
  searchQuery: string,
  activeFilter: NotificationFilter,
  priorityFilter: Priority | 'all',
  sortOption: SortOption
): Notification[] {
  // Step 1: Apply domain-specific filters first
  const filtered = filterNotificationsByCategory(notifications, activeFilter, priorityFilter)

  // Step 2: Use global utilities for search and sort
  const options: SearchFilterOptions<Notification> = {
    searchQuery,
    searchFields: NOTIFICATION_SEARCH_FIELDS,
    sortConfig: {
      key: 'timestamp',
      direction: sortOption === 'newest' ? 'desc' : 'asc',
    },
  }

  // Apply global search and sort utility
  return performSearchAndFilter(filtered, options)
}

/**
 * Hook for managing notification search with debouncing
 * Shows how to use global debouncing utility in domain-specific context
 */
export function useNotificationSearch(initialQuery: string = '', delay: number = 300) {
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

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isValidQuery: validateSearchQuery(searchQuery),
  }
}

/**
 * Example of how other components can use these helpers:
 *
 * ```tsx
 * import { searchAndFilterNotifications, useNotificationSearch } from './lib/search-filter-helpers'
 *
 *function MyNotificationComponent({ notifications }: { notifications: Notification[] }) {
 *   const { searchQuery, setSearchQuery, debouncedQuery } = useNotificationSearch()
 *   const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')
 *   const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
 *   const [sortOption, setSortOption] = useState<SortOption>('newest')
 *
 *   const filteredNotifications = useMemo(() => {
 *     return searchAndFilterNotifications(
 *       notifications,
 *       debouncedQuery,
 *       activeFilter,
 *       priorityFilter,
 *       sortOption
 *     )
 *   }, [notifications, debouncedQuery, activeFilter, priorityFilter, sortOption])
 *
 *   return (
 *     <div>
 *       <input
 *         value={searchQuery}
 *         onChange={(e) => setSearchQuery(e.target.value)}
 *         placeholder="Search notifications..."
 *       />
 *       {filteredNotifications.map(notification => (
 *         <NotificationItem key={notification.id} notification={notification} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */

// Re-export global utilities that are commonly used with notifications
export { validateSearchQuery } from '@/lib/utils'

export { useDebounced } from '@/lib/hooks/useDebounce'
