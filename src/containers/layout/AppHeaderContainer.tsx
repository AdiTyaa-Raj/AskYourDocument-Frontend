'use client'

import { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store'
import { AppHeader } from './components/AppHeader'
import { type UserMenuUser } from '@/components/layout/UserMenu'
import {
  useSearchWithMentions,
  useUnreadNotifications,
  fetchCompanySearchPage,
  COMPANY_SEARCH_LIMIT,
} from './lib/queries'
import { type UniverseTableRow } from '@/containers/coverage/lib/types'
import { type AppHeaderContainerProps, type SearchResults } from './lib/types'
import { transformApiNotifications } from '@/containers/notifications/lib/utils'
import type { Notification } from '@/containers/notifications/lib/types'

// Container component that handles business logic and state management
export const AppHeaderContainer = memo(function AppHeaderContainer({
  title = 'Dashboard',
}: AppHeaderContainerProps) {
  const router = useRouter()
  const authUser = useAppSelector((state) => state.auth?.user)
  const [searchValue, setSearchValue] = useState('')
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState('')
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false)

  // Search API runs only when user presses Enter (submittedSearchTerm updates)
  const rawSearchResults = useSearchWithMentions(submittedSearchTerm)

  // Pagination state for company search load-more
  const [extraCompanies, setExtraCompanies] = useState<UniverseTableRow[]>([])
  const [searchSkip, setSearchSkip] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const prevSubmittedTerm = useRef('')

  // Reset pagination when search term changes
  useEffect(() => {
    if (prevSubmittedTerm.current !== submittedSearchTerm) {
      prevSubmittedTerm.current = submittedSearchTerm
      setExtraCompanies([])
      setSearchSkip(0)
      setHasMore(false)
    }
  }, [submittedSearchTerm])

  // Detect hasMore from the initial page of results
  useEffect(() => {
    if (!rawSearchResults.isLoading) {
      setHasMore(rawSearchResults.companies.length === COMPANY_SEARCH_LIMIT)
    }
  }, [rawSearchResults.companies, rawSearchResults.isLoading])

  const handleLoadMoreCompanies = useCallback(async () => {
    if (!hasMore || isLoadingMore || !submittedSearchTerm) return
    const nextSkip = searchSkip + COMPANY_SEARCH_LIMIT
    setIsLoadingMore(true)
    try {
      const result = await fetchCompanySearchPage(submittedSearchTerm, nextSkip)
      setExtraCompanies((prev) => [...prev, ...result.companies])
      setHasMore(result.hasMore)
      setSearchSkip(nextSkip)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, submittedSearchTerm, searchSkip])

  const searchResults = useMemo<SearchResults>(
    () => ({
      ...rawSearchResults,
      companies: [...rawSearchResults.companies, ...extraCompanies],
      hasMore,
      isLoadingMore,
      loadMore: handleLoadMoreCompanies,
    }),
    [rawSearchResults, extraCompanies, hasMore, isLoadingMore, handleLoadMoreCompanies]
  )

  // Fetch unread notifications when popover is open or on initial mount
  const {
    data: apiNotifications,
    isLoading: isNotificationsLoading,
    refetch,
  } = useUnreadNotifications(true)

  // Refetch notifications when popover opens
  useEffect(() => {
    if (isNotificationPopoverOpen) {
      refetch()
    }
  }, [isNotificationPopoverOpen, refetch])

  // Transform API notifications to UI format
  const notifications = useMemo<Notification[]>(() => {
    if (!apiNotifications) return []
    return transformApiNotifications(apiNotifications)
  }, [apiNotifications])

  const menuUser = useMemo<UserMenuUser>(() => {
    if (authUser) {
      return {
        name: authUser.name ?? authUser.preferredUsername ?? authUser.email ?? 'User',
        email: authUser.email ?? '',
      }
    }

    return {
      name: 'Guest',
      email: '',
    }
  }, [authUser])

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  const handleSearchSubmit = useCallback(() => {
    setSubmittedSearchTerm(searchValue.trim())
  }, [searchValue])

  const handleCompanySelect = useCallback(
    (company: UniverseTableRow) => {
      // Navigate to the tearsheet page for the selected company
      router.push(`/tearsheet/${company.id}`)
      // Clear the search value after navigation
      setSearchValue('')
    },
    [router]
  )

  const handleNotificationPopoverOpenChange = useCallback((open: boolean) => {
    setIsNotificationPopoverOpen(open)
  }, [])

  return (
    <AppHeader
      title={title}
      user={menuUser}
      searchValue={searchValue}
      onSearchChange={handleSearchChange}
      onSearchSubmit={handleSearchSubmit}
      searchResults={searchResults}
      onCompanySelect={handleCompanySelect}
      notifications={notifications}
      isNotificationsLoading={isNotificationsLoading}
      isNotificationPopoverOpen={isNotificationPopoverOpen}
      onNotificationPopoverOpenChange={handleNotificationPopoverOpenChange}
    />
  )
})

export default AppHeaderContainer
