import { BaseApiService } from './base'
import type {
  SystemEventSearchApiResponse,
  SystemEventSearchResponse,
  NotificationSearchParams,
  BulkUpdateNotificationsParams,
  NotificationFilter,
} from '@/containers/notifications/lib/types'

/**
 * Type alias for notification filter that matches the UI tabs
 */
export type NotificationFilterType = NotificationFilter

/**
 * Extended search params supporting JSON filters
 */
export interface NotificationSearchParamsExtended extends NotificationSearchParams {
  /** JSON filters object for advanced filtering */
  filters?: Record<string, unknown>
  /** Sort by created_at: 'newest' (desc) or 'oldest' (asc) - server-side */
  order?: 'newest' | 'oldest'
}

/**
 * Notifications Service
 * Handles all notification-related API calls
 */
class NotificationsService extends BaseApiService {
  /**
   * Search/filter system events (notifications)
   * Supports both search string and JSON filters parameter
   * @param params - Search and pagination parameters
   * @returns Promise with normalized search results
   */
  async searchNotifications(
    params?: NotificationSearchParamsExtended
  ): Promise<SystemEventSearchResponse> {
    const searchParams = new URLSearchParams()

    // Legacy search string support
    if (params?.search) {
      searchParams.set('search', params.search)
    }

    // New JSON filters parameter (preferred)
    if (params?.filters && Object.keys(params.filters).length > 0) {
      searchParams.set('filters', JSON.stringify(params.filters))
    }

    if (params?.skip !== undefined) {
      searchParams.set('skip', String(params.skip))
    }
    if (params?.limit !== undefined) {
      searchParams.set('limit', String(params.limit))
    }

    // Sort by SystemEvent.created_at: 'newest' (desc) or 'oldest' (asc)
    if (params?.order) {
      searchParams.set('order', params.order)
    }

    const query = searchParams.toString()
    const endpoint = query ? `/search/notification/events?${query}` : '/search/notification/events'

    // API returns [[notifications], count] format
    const response = await this.get<SystemEventSearchApiResponse>(endpoint)

    // Normalize the response
    const [notificationsArray, total] = response
    const notifications = notificationsArray || []

    return {
      results: notifications,
      total,
      skip: params?.skip,
      limit: params?.limit,
    }
  }

  /**
   * Get all notifications with optional pagination
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   */
  async getAllNotifications(
    skip: number = 0,
    limit: number = 100
  ): Promise<SystemEventSearchResponse> {
    return this.searchNotifications({ skip, limit })
  }

  /**
   * Mark a notification as read
   * @param id - Notification ID
   */
  async markAsRead(id: number): Promise<void> {
    return this.bulkUpdateNotifications({
      notification_ids: [id],
      update_fields: {
        is_read: true,
      },
    })
  }

  /**
   * Mark a notification as unread
   * @param id - Notification ID
   */
  async markAsUnread(id: number): Promise<void> {
    return this.bulkUpdateNotifications({
      notification_ids: [id],
      update_fields: {
        is_read: false,
      },
    })
  }

  /**
   * Mark multiple notifications as read
   * @param ids - Array of notification IDs
   */
  async markMultipleAsRead(ids: number[]): Promise<void> {
    return this.bulkUpdateNotifications({
      notification_ids: ids,
      update_fields: {
        is_read: true,
      },
    })
  }

  /**
   * Delete a notification
   * @param id - Notification ID
   */
  async deleteNotification(id: number): Promise<void> {
    return this.bulkUpdateNotifications({
      notification_ids: [id],
      update_fields: {
        is_deleted: true,
      },
    })
  }

  /**
   * Bulk update notifications (mark as read/unread, archive/unarchive)
   * @param params - Bulk update parameters with notification IDs and update fields
   */
  async bulkUpdateNotifications(params: BulkUpdateNotificationsParams): Promise<void> {
    return this.put('/notifications/all', params)
  }

  /**
   * Mark multiple notifications as unread
   * @param ids - Array of notification IDs
   */
  async markMultipleAsUnread(ids: number[]): Promise<void> {
    return this.bulkUpdateNotifications({
      notification_ids: ids,
      update_fields: {
        is_read: false,
      },
    })
  }

  /**
   * Archive multiple notifications
   * @param ids - Array of notification IDs
   */
  async archiveMultiple(ids: number[]): Promise<void> {
    return this.bulkUpdateNotifications({
      notification_ids: ids,
      update_fields: {
        is_archived: true,
      },
    })
  }

  /**
   * Unarchive multiple notifications
   * @param ids - Array of notification IDs
   */
  async unarchiveMultiple(ids: number[]): Promise<void> {
    return this.bulkUpdateNotifications({
      notification_ids: ids,
      update_fields: {
        is_archived: false,
      },
    })
  }

  /**
   * Delete multiple notifications
   * @param ids - Array of notification IDs
   */
  async deleteMultiple(ids: number[]): Promise<void> {
    return this.bulkUpdateNotifications({
      notification_ids: ids,
      update_fields: {
        is_deleted: true,
      },
    })
  }

  /**
   * Get unread notifications count
   * @returns Promise with unread count
   */
  async getUnreadCount(): Promise<{ unread_count: number }> {
    return this.get<{ unread_count: number }>('/notifications/unread/count')
  }

  /**
   * Filter mapping using JSON filter objects (preferred over search strings)
   * Maps NotificationFilter types to their corresponding API filter objects
   */
  private static readonly FILTER_MAP: Record<
    NotificationFilterType,
    Record<string, unknown> | undefined
  > = {
    all: undefined,
    unread: { 'UserEventState.is_read__eq': 'false' },
    archived: { 'UserEventState.is_archived__eq': 'true' },
    approvals: { entity_type__eq: 'approval' },
    alerts: { category__eq: 'alert' },
    pipeline: { entity_type__eq: 'pipeline' },
    documents: { entity_type__eq: 'document' },
    maintenance: { entity_type__eq: 'maintenance' },
  }

  /**
   * Get notifications by filter type (consolidated method)
   * Uses JSON filters parameter for cleaner API communication.
   * When titleSearch is provided, adds SystemEvent.title__ilike for server-side search.
   * When severityFilter is provided (not 'all'), adds SystemEvent.severity__eq for server-side priority filter.
   * When sortOrder is provided, requests server-side sort by SystemEvent.created_at (newest/oldest).
   * @param filter - The filter type (all, unread, archived, approvals, alerts, pipeline, documents)
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   * @param additionalFilters - Optional additional filters to merge
   * @param titleSearch - Optional search term (caller should trim); when set, requests SystemEvent.title__ilike in the API
   * @param severityFilter - Optional severity (caller should trim/lowercase); when set and not 'all', requests SystemEvent.severity__eq in the API
   * @param sortOrder - Optional sort by created_at: 'newest' or 'oldest' (server-side)
   * @returns Promise with filtered notifications
   */
  async getNotificationsByFilter(
    filter: NotificationFilterType,
    skip: number = 0,
    limit: number = 100,
    additionalFilters?: Record<string, unknown>,
    titleSearch?: string,
    severityFilter?: string,
    sortOrder?: 'newest' | 'oldest'
  ): Promise<SystemEventSearchResponse> {
    const baseFilters = NotificationsService.FILTER_MAP[filter]
    const filters = { ...baseFilters, ...additionalFilters }

    if (titleSearch) {
      filters['SystemEvent.title__ilike'] = titleSearch
    }

    if (severityFilter && severityFilter !== 'all') {
      filters['SystemEvent.severity__eq'] = severityFilter
    }

    return this.searchNotifications({
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      skip,
      limit,
      order: sortOrder,
    })
  }

  /**
   * Get notifications with custom filters
   * Allows passing any combination of filters directly
   * @param filters - Filter object with field__operator: value pairs
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Promise with filtered notifications
   *
   * @example
   * // Get unread alerts
   * await getNotificationsWithFilters({
   *   'UserEventState.is_read__eq': 'false',
   *   'category__eq': 'alert'
   * })
   *
   * @example
   * // Get notifications for a specific entity
   * await getNotificationsWithFilters({
   *   'entity_type__eq': 'document',
   *   'entity_id__eq': '123'
   * })
   */
  async getNotificationsWithFilters(
    filters: Record<string, unknown>,
    skip: number = 0,
    limit: number = 100
  ): Promise<SystemEventSearchResponse> {
    return this.searchNotifications({ filters, skip, limit })
  }
}

export const notificationsService = new NotificationsService()
