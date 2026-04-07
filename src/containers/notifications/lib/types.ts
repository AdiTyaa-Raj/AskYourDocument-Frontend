// Notifications type definitions
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  FileText,
  Calendar,
  XCircle,
  Wrench,
} from 'lucide-react'

export type Priority = 'info' | 'warning' | 'error' | 'critical'

export type NotificationType =
  | 'approval'
  | 'alert'
  | 'pipeline'
  | 'document'
  | 'meeting'
  | 'rejection'
  | 'maintenance'

export type NotificationIcon =
  | 'approval'
  | 'pipeline'
  | 'alert'
  | 'document'
  | 'meeting'
  | 'rejection'
  | 'maintenance'

export type Notification = {
  id: string
  type: NotificationType
  icon: NotificationIcon
  title: string
  description: string
  company: string
  user: string
  userId?: number
  userRole?: string
  timestamp: string // Formatted relative time for display (e.g., "2 hours ago")
  createdAt: string // Raw ISO 8601 timestamp for sorting
  priority: Priority
  isRead: boolean
  isArchived: boolean
  actionUrl?: string | null
}

export type NotificationFilter =
  | 'all'
  | 'unread'
  | 'approvals'
  | 'alerts'
  | 'pipeline'
  | 'documents'
  | 'archived'
  | 'maintenance'

export type SortOption = 'newest' | 'oldest'

/**
 * Valid notification filter tabs for validation
 */
export const VALID_NOTIFICATION_FILTERS: NotificationFilter[] = [
  'all',
  'unread',
  'archived',
  'approvals',
  'alerts',
  'pipeline',
  'documents',
  'maintenance',
]

/**
 * Single item for the notification row dropdown menu
 */
export type NotificationDropdownItem = {
  id: string
  name: string
  className?: string
  onClick: () => void
  icon: LucideIcon
}

// NotificationItem types
export type NotificationItemProps = {
  notification: Notification
  isSelected: boolean
  isSelectionMode: boolean
  onSelect: (id: string) => void
  onClick?: (notification: Notification) => void
  onMarkAsRead?: (id: string) => void
  onMarkAsUnread?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
  /** Called with a UTC ISO snooze string for quick presets, or undefined for "Remind Me immediately" */
  onRemindMe?: (id: string, snoozedUntil?: string) => void
  /** Called when user clicks "Custom…" — opens the custom date/time dialog in the parent */
  onCustomRemind?: (id: string) => void
}

// API types from notifications.service.ts
/**
 * System Event (Notification) API Response - SystemEvent part
 */
export interface SystemEventApi {
  id: number
  actor_user_id: string | number | null
  actor?: {
    id: number
    full_name?: string | null
    email?: string | null
    username?: string | null
  } | null
  target_user_id: (string | number)[]
  target_role_ids: number[]
  message: string
  expires_at: string | null
  created_at: string
  title: string
  severity: string
  updated_at: string
  event_type: string
  meta: Record<string, unknown> | null
  category: string
  action_url: string | null
  source_system: string
  entity_type: string
  entity_id: string
  ticker?: string | null
}

/**
 * User Event State - User-specific state for notifications
 */
export interface UserEventStateApi {
  id: number
  event_id: number
  user_id: number
  is_read: boolean
  is_archived: boolean
  is_deleted: boolean
  read_at: string | null
  archived_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Combined notification object as returned by API
 */
export interface NotificationApiItem {
  SystemEvent: SystemEventApi
  UserEventState: UserEventStateApi | null
}

/**
 * Raw API response format: [notifications_array, total_count]
 * The API returns a tuple with notifications wrapped in an array and the count
 */
export type SystemEventSearchApiResponse = [NotificationApiItem[], number]

/**
 * Normalized search response with pagination
 */
export interface SystemEventSearchResponse {
  total: number
  results: NotificationApiItem[]
  skip?: number
  limit?: number
}

/**
 * Search parameters for filtering notifications
 */
export interface NotificationSearchParams {
  search?: string
  skip?: number
  limit?: number
}

/**
 * Bulk update request parameters
 */
export interface BulkUpdateNotificationsParams {
  notification_ids: number[]
  update_fields: {
    is_read?: boolean
    is_archived?: boolean
    is_deleted?: boolean
  }
}

// Constants and utility functions from NotificationItem.tsx
export const getIconComponent = (iconType: NotificationIcon) => {
  switch (iconType) {
    case 'approval':
      return CheckCircle
    case 'pipeline':
      return TrendingUp
    case 'alert':
      return AlertTriangle
    case 'document':
      return FileText
    case 'meeting':
      return Calendar
    case 'rejection':
      return XCircle
    case 'maintenance':
      return Wrench
    default:
      return FileText
  }
}

export const getIconBackgroundColor = (iconType: NotificationIcon) => {
  switch (iconType) {
    case 'approval':
      return 'bg-green-50 text-green-600'
    case 'pipeline':
      return 'bg-blue-50 text-blue-600'
    case 'alert':
      return 'bg-orange-50 text-orange-600'
    case 'document':
      return 'bg-purple-50 text-purple-600'
    case 'meeting':
      return 'bg-amber-50 text-amber-600'
    case 'rejection':
      return 'bg-red-50 text-red-600'
    case 'maintenance':
      return 'bg-gray-50 text-gray-600'
    default:
      return 'bg-gray-50 text-gray-600'
  }
}

export const getPriorityBadgeVariant = (priority: Priority): 'destructive' | 'secondary' => {
  switch (priority) {
    case 'error':
    case 'critical':
      return 'destructive'
    case 'info':
    case 'warning':
    default:
      return 'secondary'
  }
}

export const getPriorityBadgeClasses = (priority: Priority) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800'
    case 'error':
      return 'bg-red-50 text-red-700'
    case 'warning':
      return 'bg-orange-50 text-orange-700'
    case 'info':
      return 'bg-blue-50 text-blue-700'
    default:
      return ''
  }
}

/**
 * Props for NotificationPagination component
 */
export interface NotificationPaginationProps {
  currentPage: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  showPageSizeChanger?: boolean
  itemLabel?: string
}
