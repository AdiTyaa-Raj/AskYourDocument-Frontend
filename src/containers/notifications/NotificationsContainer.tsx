'use client'

import { useState, useCallback, useEffect, type ChangeEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationPagination } from './components/NotificationPagination'
import { Mail, MailOpen } from 'lucide-react'
import NotificationItem from './components/NotificationItem'
import { notificationsService } from '@/services/api/notifications.service'
import { usersService } from '@/services/api/users.service'
import { remindersService, computeCustomSnoozeUTC } from '@/services/api/reminders.services'
import {
  transformApiNotifications,
  extractNotificationUserIds,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from './lib/utils'
import { PRIORITY_FILTER_OPTIONS } from './lib/search-filter-helpers'
import { CustomDateTimeDialog } from '@/containers/reminders/components/CustomDateTimeDialog'
import { isLeadInvestorGroup, validateSearchQuery } from '@/lib/utils'
import { useDebounced } from '@/lib/hooks/useDebounce'
import type {
  NotificationFilter,
  Priority,
  SortOption,
  Notification,
  NotificationApiItem,
} from './lib/types'
import { VALID_NOTIFICATION_FILTERS } from './lib/types'
import { useAppSelector } from '@/store'

export function NotificationsContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authUser = useAppSelector((state) => state.auth.user)
  const isLeadInvestor = isLeadInvestorGroup(authUser?.groups)

  // Get unread notifications count from Redux (same as AppHeader)
  const unreadNotificationsCount = useAppSelector((state) => state.notifications.unreadCount)

  // Get tab from URL query parameter, default to 'all'
  const tabFromUrl = (searchParams.get('tab') as NotificationFilter) || 'all'
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10)

  // Validate that the tab from URL is a valid NotificationFilter
  const resolvedTab = !isLeadInvestor && tabFromUrl === 'documents' ? 'all' : tabFromUrl
  const initialTab = VALID_NOTIFICATION_FILTERS.includes(resolvedTab) ? resolvedTab : 'all'

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>(initialTab)
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(pageFromUrl)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  // Remind Me — custom dialog state
  const [showCustomReminderDialog, setShowCustomReminderDialog] = useState(false)
  const [reminderNotificationId, setReminderNotificationId] = useState<string | null>(null)
  const [customReminderDate, setCustomReminderDate] = useState('')
  const [customReminderTime, setCustomReminderTime] = useState('')

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize)

  // Update URL with current state
  const updateUrl = useCallback(
    (tab: NotificationFilter, page: number) => {
      const params = new URLSearchParams(searchParams.toString())

      if (tab === 'all') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }

      if (page === 1) {
        params.delete('page')
      } else {
        params.set('page', String(page))
      }

      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
      router.push(newUrl, { scroll: false })
    },
    [router, searchParams]
  )

  // Handle tab change
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as NotificationFilter
      if (!isLeadInvestor && newTab === 'documents') {
        return
      }
      setActiveFilter(newTab)
      setCurrentPage(1) // Reset to first page on tab change
      setSelectedNotifications(new Set()) // Clear selections
      updateUrl(newTab, 1)
    },
    [isLeadInvestor, updateUrl]
  )

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return
      setCurrentPage(page)
      setSelectedNotifications(new Set()) // Clear selections on page change
      updateUrl(activeFilter, page)
    },
    [activeFilter, totalPages, updateUrl]
  )

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize)
      setCurrentPage(1) // Reset to first page when page size changes
      setSelectedNotifications(new Set()) // Clear selections
      updateUrl(activeFilter, 1)
    },
    [activeFilter, updateUrl]
  )

  // Reset to first page and sync URL when a server-side filter (priority or sort) changes
  const handleFilterOrSortChange = useCallback(() => {
    setCurrentPage(1)
    updateUrl(activeFilter, 1)
  }, [activeFilter, updateUrl])

  // Memoize the search callback to prevent debouncedSearch from changing on every render
  const searchCallback = useCallback((query: string) => {
    setDebouncedSearchQuery(query)
    setCurrentPage(1) // Reset to first page on search
  }, [])

  // Debounced search to avoid excessive filtering
  const debouncedSearch = useDebounced(searchCallback, 300)

  // Handle search query changes with debouncing
  useEffect(() => {
    const trimmedQuery = searchQuery.trim()
    // Only trigger debounced search if there's actual search content
    if (trimmedQuery && validateSearchQuery(searchQuery)) {
      debouncedSearch(searchQuery)
    } else if (!trimmedQuery) {
      // Clear search immediately if query is empty (don't reset page)
      setDebouncedSearchQuery('')
    }
  }, [searchQuery, debouncedSearch])

  // Helper function to filter out deleted notifications and transform
  const processApiResponse = useCallback(async (results: NotificationApiItem[]) => {
    // Filter out notifications where UserEventState is not null and is_deleted is true
    const filteredApiNotifications = results.filter((item) => {
      if (item.UserEventState === null) {
        return true
      }
      return !item.UserEventState.is_deleted
    })

    const userIds = extractNotificationUserIds(filteredApiNotifications)
    const userDirectory = userIds.length ? await usersService.getUsersByIds(userIds) : {}
    return transformApiNotifications(filteredApiNotifications, userDirectory)
  }, [])

  // Fetch notifications based on active filter
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const skip = (currentPage - 1) * pageSize

      const titleSearch =
        debouncedSearchQuery.trim() && validateSearchQuery(debouncedSearchQuery)
          ? debouncedSearchQuery.trim()
          : undefined

      const severityFilter =
        priorityFilter && priorityFilter !== 'all' ? priorityFilter.trim().toLowerCase() : undefined

      // Use consolidated method: search, priority, and sort (created_at) are server-side
      const response = await notificationsService.getNotificationsByFilter(
        activeFilter,
        skip,
        pageSize,
        undefined,
        titleSearch,
        severityFilter,
        sortOption
      )

      const transformedNotifications = await processApiResponse(response.results)
      setNotifications(transformedNotifications)
      setTotalCount(response.total)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setError('Failed to load notifications. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [
    activeFilter,
    currentPage,
    pageSize,
    debouncedSearchQuery,
    priorityFilter,
    sortOption,
    processApiResponse,
  ])

  // Fetch notifications when filter or page changes
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Sort is server-side (SystemEvent.created_at via order param); use notifications as returned
  const filteredNotifications = notifications

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set())
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map((n: Notification) => n.id)))
    }
  }

  const handleSelectNotification = (id: string) => {
    const newSelected = new Set(selectedNotifications)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedNotifications(newSelected)
  }

  // Toggle selection mode on/off
  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      // Exiting selection mode - clear selections
      setSelectedNotifications(new Set())
    }
    setIsSelectionMode(!isSelectionMode)
  }

  // Handle notification click - navigate when not in selection mode, select when in selection mode
  const handleNotificationClick = (notification: Notification) => {
    if (isSelectionMode) {
      handleSelectNotification(notification.id)
    } else {
      if (!notification.isRead) {
        handleMarkAsRead(notification.id)
      }
      if (notification.actionUrl) {
        router.push(notification.actionUrl)
      }
    }
  }

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.size === 0) return

    try {
      const ids = Array.from(selectedNotifications).map((id) => parseInt(id))
      await notificationsService.markMultipleAsRead(ids)

      // Update local state
      setNotifications((notifications) =>
        notifications.map((n) => (selectedNotifications.has(n.id) ? { ...n, isRead: true } : n))
      )
      setSelectedNotifications(new Set())
      setIsSelectionMode(false)
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  const handleBulkMarkAsUnread = async () => {
    if (selectedNotifications.size === 0) return

    try {
      const ids = Array.from(selectedNotifications).map((id) => parseInt(id))
      await notificationsService.markMultipleAsUnread(ids)

      // Update local state
      setNotifications((notifications) =>
        notifications.map((n) => (selectedNotifications.has(n.id) ? { ...n, isRead: false } : n))
      )
      setSelectedNotifications(new Set())
      setIsSelectionMode(false)
    } catch (error) {
      console.error('Failed to mark notifications as unread:', error)
    }
  }

  // Individual notification handlers
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(parseInt(id))

      // Update local state
      setNotifications((notifications) =>
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAsUnread = async (id: string) => {
    try {
      await notificationsService.markAsUnread(parseInt(id))

      // Update local state
      setNotifications((notifications) =>
        notifications.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      )
    } catch (error) {
      console.error('Failed to mark notification as unread:', error)
    }
  }

  // Remind Me — quick preset (snoozedUntil = undefined means "In Progress immediately")
  const handleRemindMe = async (id: string, snoozedUntil?: string) => {
    try {
      await remindersService.addToReminders(
        parseInt(id),
        snoozedUntil ? { snoozedUntil } : undefined
      )
    } catch (error) {
      console.error('Failed to set reminder:', error)
    }
  }

  // Remind Me — open custom date/time dialog.
  // The setTimeout(0) lets the DropdownMenu fully close and unmount its portal overlay
  // before the Dialog mounts its own, preventing the two Radix portals from conflicting.
  const handleCustomRemind = (id: string) => {
    setReminderNotificationId(id)
    setTimeout(() => setShowCustomReminderDialog(true), 0)
  }

  // Remind Me — submit custom date/time
  const handleCustomReminderSubmit = async () => {
    if (!customReminderDate || !customReminderTime || !reminderNotificationId) return
    try {
      const snoozedUntil = computeCustomSnoozeUTC(customReminderDate, customReminderTime)
      await remindersService.addToReminders(parseInt(reminderNotificationId), { snoozedUntil })
    } catch (error) {
      console.error('Failed to set custom reminder:', error)
    } finally {
      setShowCustomReminderDialog(false)
      setCustomReminderDate('')
      setCustomReminderTime('')
      setReminderNotificationId(null)
    }
  }

  const allSelected =
    filteredNotifications.length > 0 && selectedNotifications.size === filteredNotifications.length

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-start justify-center px-6 py-6">
      <div className="border-border/60 w-full max-w-full rounded-2xl border bg-white shadow-sm">
        {/* Search and Filters */}
        <div className="flex flex-col gap-2 p-6 pb-3 sm:flex-row sm:items-center sm:gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="text-muted-foreground/70 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search notifications..."
              className="bg-background/50 border-border/50 h-10 pl-9 text-sm"
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const query = e.target.value
                setSearchQuery(query)
              }}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select
              value={priorityFilter}
              onValueChange={(value: string) => {
                setPriorityFilter(value as Priority | 'all')
                handleFilterOrSortChange()
              }}
            >
              <SelectTrigger className="bg-background/50 border-border/50 h-10 w-[120px] text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_FILTER_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortOption}
              onValueChange={(value: string) => {
                setSortOption(value as SortOption)
                handleFilterOrSortChange()
              }}
            >
              <SelectTrigger className="bg-background/50 border-border/50 h-10 w-[120px] text-sm">
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-4">
          <Tabs
            defaultValue="all"
            value={activeFilter}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="bg-muted/30 flex h-auto w-fit items-center justify-start gap-2 rounded-xl p-1.5">
              <TabsTrigger
                value="all"
                className="text-muted-foreground data-[state=active]:text-foreground hover:text-foreground rounded-lg border-0 px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  All
                  {activeFilter === 'all' && totalCount > 0 && (
                    <span className="bg-muted text-muted-foreground flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 text-xs font-semibold">
                      {totalCount}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="text-muted-foreground data-[state=active]:text-foreground hover:text-foreground rounded-lg border-0 px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  Unread
                  {unreadNotificationsCount > 0 && (
                    <span className="bg-muted text-muted-foreground flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 text-xs font-semibold">
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="approvals"
                className="text-muted-foreground data-[state=active]:text-foreground hover:text-foreground rounded-lg border-0 px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Approvals
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="text-muted-foreground data-[state=active]:text-foreground hover:text-foreground rounded-lg border-0 px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Alerts
              </TabsTrigger>
              <TabsTrigger
                value="pipeline"
                className="text-muted-foreground data-[state=active]:text-foreground hover:text-foreground rounded-lg border-0 px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Pipeline
              </TabsTrigger>
              {isLeadInvestor && (
                <TabsTrigger
                  value="documents"
                  className="text-muted-foreground data-[state=active]:text-foreground hover:text-foreground rounded-lg border-0 px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Documents
                </TabsTrigger>
              )}
              <TabsTrigger
                value="maintenance"
                className="text-muted-foreground data-[state=active]:text-foreground hover:text-foreground rounded-lg border-0 px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Maintenance
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications List */}
        <div className="border-border/60 border-t">
          {/* Selection Header */}
          <div className="border-border/60 bg-muted/5 flex items-center border-b px-6 py-3">
            {isSelectionMode ? (
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="border-border/60 size-4 rounded-[4px]"
                />
                <span className="text-muted-foreground text-sm font-medium">
                  {selectedNotifications.size === filteredNotifications.length
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
                {selectedNotifications.size > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ({selectedNotifications.size} selected)
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectionMode}
                  className="h-7 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  Done
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
                className="h-7 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                Select
              </Button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedNotifications.size > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 flex items-center justify-between border-b border-blue-200 bg-blue-50 px-6 py-3 duration-200">
              <span className="text-sm text-gray-900">
                {selectedNotifications.size} notification
                {selectedNotifications.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkMarkAsRead}
                  className="h-7 text-xs"
                >
                  <MailOpen className="mr-1.5 size-3" />
                  Mark Read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkMarkAsUnread}
                  className="h-7 text-xs"
                >
                  <Mail className="mr-1.5 size-3" />
                  Mark Unread
                </Button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              Loading notifications...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600">{error}</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No notifications found
            </div>
          ) : (
            <div className="divide-border/60 divide-y">
              {filteredNotifications.map((notification: Notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isSelected={selectedNotifications.has(notification.id)}
                  isSelectionMode={isSelectionMode}
                  onSelect={handleSelectNotification}
                  onClick={handleNotificationClick}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAsUnread={handleMarkAsUnread}
                  onRemindMe={handleRemindMe}
                  onCustomRemind={handleCustomRemind}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && (
            <div className="px-6 pb-4">
              <NotificationPagination
                currentPage={currentPage}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                showPageSizeChanger={true}
                itemLabel="notifications"
              />
            </div>
          )}
        </div>
      </div>

      {/* Custom Reminder Dialog */}
      <CustomDateTimeDialog
        open={showCustomReminderDialog}
        onOpenChange={setShowCustomReminderDialog}
        title="Set Custom Reminder"
        description="Choose a date and time to be reminded about this notification."
        submitLabel="Set Reminder"
        date={customReminderDate}
        time={customReminderTime}
        onDateChange={setCustomReminderDate}
        onTimeChange={setCustomReminderTime}
        onSubmit={handleCustomReminderSubmit}
        onCancel={() => setShowCustomReminderDialog(false)}
      />
    </div>
  )
}
