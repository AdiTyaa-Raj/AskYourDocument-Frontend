'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Bell, Clock, User, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppSelector } from '@/store'
import { isLeadInvestorGroup } from '@/lib/utils'
import {
  getIconComponent,
  getIconBackgroundColor,
  getPriorityBadgeClasses,
} from '@/containers/notifications/lib/types'
import type { Notification, NotificationFilter } from '@/containers/notifications/lib/types'
import { filterPopoverNotifications } from '@/containers/layout/lib/helper'
import { POPOVER_FILTERS, POPOVER_LIMIT, LOAD_MORE_LIMIT } from '@/containers/layout/lib/utils'
import {
  useNotificationsWithUsers,
  useMarkNotificationAsRead,
  useMarkMultipleNotificationsAsRead,
  fetchNotificationsWithUsers,
} from '@/containers/layout/lib/queries'

export function NotificationPopover() {
  const router = useRouter()
  const authUser = useAppSelector((state) => state.auth.user)
  const unreadNotificationsCount = useAppSelector((state) => state.notifications.unreadCount)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isLeadInvestor = isLeadInvestorGroup(authUser?.groups)

  const [open, setOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('unread')
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [currentSkip, setCurrentSkip] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Fetch initial notifications
  const { data: notificationsData, isLoading } = useNotificationsWithUsers(
    'unread',
    0,
    POPOVER_LIMIT,
    open
  )

  // Mutations
  const markAsReadMutation = useMarkNotificationAsRead()
  const markMultipleAsReadMutation = useMarkMultipleNotificationsAsRead()

  // Load initial notifications when popover opens
  useEffect(() => {
    if (open && notificationsData) {
      setAllNotifications(notificationsData.notifications)
      setHasMore(notificationsData.hasMore)
      setCurrentSkip(POPOVER_LIMIT)
    }
  }, [open, notificationsData])

  // Reset state when popover closes
  useEffect(() => {
    if (!open) {
      setAllNotifications([])
      setCurrentSkip(0)
      setHasMore(true)
      setIsLoadingMore(false)
    }
  }, [open])

  const loadMoreNotifications = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    try {
      setIsLoadingMore(true)

      const response = await fetchNotificationsWithUsers('unread', currentSkip, LOAD_MORE_LIMIT)

      setAllNotifications((prev) => [...prev, ...response.notifications])
      setHasMore(response.hasMore)
      setCurrentSkip((prev) => prev + LOAD_MORE_LIMIT)
    } catch (err) {
      console.error('Failed to load more notifications:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentSkip, hasMore, isLoadingMore])

  // Handle scroll for infinite loading
  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea
      const threshold = 100

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        if (hasMore && !isLoadingMore) {
          loadMoreNotifications()
        }
      }
    }

    scrollArea.addEventListener('scroll', handleScroll)
    return () => scrollArea.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingMore, loadMoreNotifications])

  // Filter notifications based on active filter
  const filteredNotifications = useMemo(
    () => filterPopoverNotifications(allNotifications, activeFilter),
    [allNotifications, activeFilter]
  )

  const handleFilterChange = (filter: NotificationFilter) => {
    setActiveFilter(filter)
  }

  useEffect(() => {
    if (!isLeadInvestor && activeFilter === 'documents') {
      setActiveFilter('unread')
    }
  }, [activeFilter, isLeadInvestor])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markAsReadMutation.mutateAsync(parseInt(notification.id))
        setAllNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        )
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    }
    setOpen(false)
    router.push(notification.actionUrl ?? '/notifications')
  }

  const handleMarkAllAsRead = async () => {
    const unreadIds = filteredNotifications.filter((n) => !n.isRead).map((n) => parseInt(n.id))

    if (unreadIds.length === 0) return

    try {
      await markMultipleAsReadMutation.mutateAsync([])
      setAllNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleViewAll = () => {
    setOpen(false)
    router.push('/notifications')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="text-foreground/80 size-5" />
          {unreadNotificationsCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px] font-semibold"
            >
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="border-border/60 w-[400px] rounded-xl border p-0 shadow-lg"
      >
        {/* Header */}
        <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-foreground text-sm font-semibold">Notifications</h3>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-6 w-6"
            onClick={() => setOpen(false)}
          >
            <X className="size-3.5" />
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="border-border/60 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/20 flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2.5">
          {POPOVER_FILTERS.filter((filter) =>
            isLeadInvestor ? true : filter.id !== 'documents'
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleFilterChange(filter.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'bg-foreground text-background'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{filter.label}</span>
              {filter.id === 'unread' && unreadNotificationsCount > 0 && (
                <span
                  className={`flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px] font-semibold ${
                    activeFilter === filter.id
                      ? 'bg-background/20 text-background'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="h-[360px] overflow-hidden">
          <div
            ref={scrollAreaRef}
            className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/20 h-full overflow-y-auto"
          >
            {isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center py-10 text-sm">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-10">
                <Bell className="text-muted-foreground/40 size-8" />
                <p className="text-muted-foreground text-sm">
                  {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
              </div>
            ) : (
              <div className="divide-border/50 divide-y">
                {filteredNotifications.map((notification) => {
                  const IconComponent = getIconComponent(notification.icon)
                  const iconColor = getIconBackgroundColor(notification.icon)
                  const priorityClasses = getPriorityBadgeClasses(notification.priority)

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`hover:bg-muted/30 flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${
                        !notification.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${iconColor}`}
                      >
                        <IconComponent className="size-4" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm leading-tight ${
                              notification.isRead
                                ? 'text-muted-foreground font-normal'
                                : 'text-foreground font-medium'
                            }`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />
                          )}
                        </div>

                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-snug">
                          {notification.description}
                        </p>

                        {/* Meta */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {notification.user && (
                            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                              <User className="size-3" />
                              {notification.user}
                            </span>
                          )}
                          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                            <Clock className="size-3" />
                            {notification.timestamp}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${priorityClasses}`}
                          >
                            {notification.priority.charAt(0).toUpperCase() +
                              notification.priority.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Load More Indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-muted-foreground ml-2 text-sm">Loading more...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-border/60 flex items-center justify-between border-t px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-7 text-xs"
            onClick={handleMarkAllAsRead}
            disabled={
              markMultipleAsReadMutation.isPending || filteredNotifications.every((n) => n.isRead)
            }
          >
            {markMultipleAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-7 text-xs"
            onClick={handleViewAll}
          >
            View all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationPopover
