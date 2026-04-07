import { Mail, MailOpen } from 'lucide-react'
import type { NotificationApiItem, NotificationDropdownItem } from './types'
import type {
  Notification,
  NotificationType,
  NotificationIcon,
  Priority,
  NotificationFilter,
  SortOption,
} from './types'
import type { UserDirectoryMap } from '@/services/api/users.service'
import { formatRelativeTime } from '@/lib/date-utils'
import { normaliseActionUrl } from '@/containers/dashboard/lib/helpers'

/**
 * Build dropdown menu items for a notification row (Mark read/unread, Archive, Delete).
 */
export function getNotificationDropdownItems(
  notification: Notification,
  handlers: {
    onMarkAsRead?: (id: string) => void
    onMarkAsUnread?: (id: string) => void
    onArchive?: (id: string) => void
    onDelete?: (id: string) => void
  }
): NotificationDropdownItem[] {
  const { id } = notification
  const items: NotificationDropdownItem[] = []

  if (notification.isRead) {
    items.push({
      id: 'mark-unread',
      name: 'Mark as Unread',
      className: 'cursor-pointer',
      onClick: () => handlers.onMarkAsUnread?.(id),
      icon: Mail,
    })
  } else {
    items.push({
      id: 'mark-read',
      name: 'Mark as Read',
      className: 'cursor-pointer',
      onClick: () => handlers.onMarkAsRead?.(id),
      icon: MailOpen,
    })
  }

  return items
}

/**
 * Default number of notifications to display per page
 */
export const DEFAULT_PAGE_SIZE = 10

/**
 * Available page size options for the notifications pagination
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * Map API severity to component priority (info | warning | error | critical)
 */
export function mapSeverityToPriority(severity: string): Priority {
  const severityLower = severity.toLowerCase()

  switch (severityLower) {
    case 'critical':
      return 'critical'
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
    // Map legacy/other API values into the four priorities
    case 'urgent':
    case 'high':
      return 'error'
    case 'normal':
      return 'warning'
    case 'low':
      return 'info'
    default:
      return 'info'
  }
}

/**
 * Map API category, event_type, or entity_type to component notification type
 */
export function mapEventToType(
  eventType: string,
  entityType: string,
  category?: string
): NotificationType {
  // Check category first - this gives us the most direct mapping
  if (category === 'alert') return 'alert'
  if (category === 'notification') {
    // For category="notification", fall back to entity_type or event_type logic
  }

  // Check entity_type
  if (entityType === 'approval') return 'approval'
  if (entityType === 'pipeline') return 'pipeline'
  if (entityType === 'document') return 'document'
  if (entityType === 'maintenance') return 'maintenance'

  // Check event_type
  if (eventType.includes('approval')) return 'approval'
  if (eventType.includes('pipeline')) return 'pipeline'
  if (eventType.includes('document')) return 'document'

  // Default to alert
  return 'alert'
}

/**
 * Map notification type to icon
 */
export function mapTypeToIcon(type: NotificationType): NotificationIcon {
  switch (type) {
    case 'approval':
      return 'approval'
    case 'pipeline':
      return 'pipeline'
    case 'meeting':
      return 'meeting'
    case 'rejection':
      return 'rejection'
    case 'alert':
      return 'alert'
    case 'document':
      return 'document'
    case 'maintenance':
      return 'maintenance'
    default:
      return 'alert'
  }
}

/**
 * Extract company ticker from title
 * Titles typically follow pattern: "Approval Update: SHOP" or "Approval RequestStatus.pending: COIN"
 */
export function extractCompanyFromTitle(title: string): string {
  // Try to extract ticker after colon
  const match = title.match(/:\s*([A-Z]{1,5})(?:\s|$)/)
  if (match && match[1]) {
    return match[1]
  }
  return ''
}

/**
 * Transform API NotificationApiItem to component Notification
 */
const toNumericId = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim())
  }
  return undefined
}

export function extractNotificationUserIds(apiNotifications: NotificationApiItem[]): number[] {
  const ids = new Set<number>()
  apiNotifications.forEach((item) => {
    const actorId = toNumericId(item.SystemEvent.actor_user_id)
    if (typeof actorId === 'number') {
      ids.add(actorId)
    }
    if (Array.isArray(item.SystemEvent.target_user_id)) {
      item.SystemEvent.target_user_id.forEach((target) => {
        const parsed = toNumericId(target)
        if (typeof parsed === 'number') {
          ids.add(parsed)
        }
      })
    }
    const userStateId = toNumericId(item.UserEventState?.user_id)
    if (typeof userStateId === 'number') {
      ids.add(userStateId)
    }
  })
  return Array.from(ids)
}

export function transformApiNotification(
  apiNotification: NotificationApiItem,
  userDirectory?: UserDirectoryMap
): Notification {
  const systemEvent = apiNotification.SystemEvent
  const userState = apiNotification.UserEventState

  const type = mapEventToType(systemEvent.event_type, systemEvent.entity_type, systemEvent.category)
  const icon = mapTypeToIcon(type)
  const priority = mapSeverityToPriority(systemEvent.severity)
  const timestamp = formatRelativeTime(systemEvent.created_at)
  const createdAt = systemEvent.created_at // Store raw timestamp for sorting
  const company = extractCompanyFromTitle(systemEvent.title)
  const actorId = toNumericId(systemEvent.actor_user_id)
  const directoryEntry = actorId ? userDirectory?.[actorId] : undefined
  const actorName =
    directoryEntry?.fullName ?? (typeof actorId === 'number' ? `User ${actorId}` : '')
  const actorRole = directoryEntry?.roleLabel ?? directoryEntry?.roleName

  return {
    id: String(systemEvent.id),
    type,
    icon,
    title: systemEvent.title,
    description: systemEvent.message,
    company,
    user: actorName,
    userId: actorId,
    userRole: actorRole,
    timestamp,
    createdAt,
    priority,
    isRead: userState?.is_read ?? false,
    isArchived: userState?.is_archived ?? false,
    actionUrl: normaliseActionUrl(systemEvent) ?? null,
  }
}

/**
 * Transform array of API notifications
 */
export function transformApiNotifications(
  apiNotifications: NotificationApiItem[],
  userDirectory?: UserDirectoryMap
): Notification[] {
  return apiNotifications.map((notification) =>
    transformApiNotification(notification, userDirectory)
  )
}

/**
 * Filter notifications based on search query, filter type, priority, and sort option
 */
export function filterNotifications(
  allNotifications: Notification[],
  searchQuery: string,
  activeFilter: NotificationFilter,
  priorityFilter: Priority | 'all',
  sortOption: SortOption
): Notification[] {
  let filtered = allNotifications

  if (searchQuery) {
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.company.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  if (activeFilter === 'unread') {
    filtered = filtered.filter((n) => !n.isRead)
  } else if (activeFilter === 'approvals') {
    filtered = filtered.filter((n) => n.type === 'approval')
  } else if (activeFilter === 'alerts') {
    filtered = filtered.filter((n) => n.type === 'alert')
  } else if (activeFilter === 'pipeline') {
    filtered = filtered.filter((n) => n.type === 'pipeline')
  } else if (activeFilter === 'documents') {
    filtered = filtered.filter((n) => n.type === 'document')
  } else if (activeFilter === 'maintenance') {
    filtered = filtered.filter((n) => n.type === 'maintenance')
  } else if (activeFilter === 'archived') {
    filtered = filtered.filter((n) => n.isArchived)
  }

  if (priorityFilter !== 'all') {
    filtered = filtered.filter((n) => n.priority === priorityFilter)
  }

  if (sortOption === 'oldest') {
    filtered = [...filtered].reverse()
  }

  return filtered
}

/**
 * Get notification counts for each filter type
 */
export function getNotificationCounts(allNotifications: Notification[]) {
  return {
    all: allNotifications.length,
    unread: allNotifications.filter((n: Notification) => !n.isRead).length,
    approvals: allNotifications.filter((n: Notification) => n.type === 'approval').length,
    alerts: allNotifications.filter((n: Notification) => n.type === 'alert').length,
    pipeline: allNotifications.filter((n: Notification) => n.type === 'pipeline').length,
    documents: allNotifications.filter((n: Notification) => n.type === 'document').length,
    maintenance: allNotifications.filter((n: Notification) => n.type === 'maintenance').length,
    archived: allNotifications.filter((n: Notification) => n.isArchived).length,
  }
}

/**
 * Generate page numbers to display in pagination
 * Matches the DataTable pagination logic
 * Returns an array of page numbers and '...' strings for pagination UI
 */
export function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = []
  const maxPagesToShow = 5

  if (totalPages <= maxPagesToShow + 2) {
    // Show all pages if total pages is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)

    if (currentPage <= 3) {
      // Near the start
      for (let i = 2; i <= Math.min(maxPagesToShow, totalPages - 1); i++) {
        pages.push(i)
      }
      pages.push('...')
    } else if (currentPage >= totalPages - 2) {
      // Near the end
      pages.push('...')
      for (let i = totalPages - maxPagesToShow + 1; i < totalPages; i++) {
        pages.push(i)
      }
    } else {
      // In the middle
      pages.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
    }

    // Always show last page
    pages.push(totalPages)
  }

  return pages
}
