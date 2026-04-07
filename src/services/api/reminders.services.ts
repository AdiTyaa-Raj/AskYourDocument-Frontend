import { BaseApiService } from './base'

// ─── Request / Response shapes ────────────────────────────────────────────────

export type ReminderTab = 'in_progress' | 'upcoming' | 'completed'

export interface ReminderSystemEvent {
  id: number
  title: string
  message: string
  category: string
  entity_type: string
  entity_id: string
  event_type: string
  severity: string
  meta: Record<string, unknown> | null
  action_url: string | null
  actor_user_id: number | null
  source_system: string
  created_at: string
  is_reminder: boolean
  actor: { id: number; email: string; full_name: string } | null
}

export interface ReminderUserEventState {
  id: number
  event_id: number
  user_id: number
  is_read: boolean
  is_archived: boolean
  is_deleted: boolean
  read_at: string | null
  archived_at: string | null
  deleted_at: string | null
  is_reminder: boolean
  is_completed: boolean
  completed_at: string | null
  snoozed_until: string | null
  created_at: string
  updated_at: string
}

export interface ReminderEventApi {
  SystemEvent: ReminderSystemEvent
  UserEventState: ReminderUserEventState | null
  /** Server-computed — only present when is_reminder=true */
  effective_due_at?: string
  /** Server-computed — only present when is_reminder=true */
  is_overdue?: boolean
  /** Server-computed label e.g. "1d overdue" — only present when is_reminder=true */
  time_display?: string
}

export interface ReminderCounts {
  all: number
  in_progress: number
  upcoming: number
  completed: number
}

export interface RemindersResponse {
  events: ReminderEventApi[]
  total: number
  counts: ReminderCounts
}

export interface GetRemindersParams {
  tab?: ReminderTab
  search?: string
  entity_type?: string
  skip?: number
  limit?: number
}

export interface BulkUpdateReminderFields {
  is_read?: boolean
  is_archived?: boolean
  is_deleted?: boolean
  is_completed?: boolean
  is_reminder?: boolean
  snoozed_until?: string | null
}

export interface BulkUpdateRemindersParams {
  /** Omit to update ALL authorized events for the user */
  notification_ids?: number[]
  update_fields: BulkUpdateReminderFields
}

export interface BulkUpdateRemindersResponse {
  message: string
  updated_count: number
}

// ─── Snooze datetime helpers ───────────────────────────────────────────────────

/**
 * Compute a UTC ISO 8601 string for well-known snooze presets.
 * All times are relative to the user's local timezone (browser interprets
 * date strings without TZ offset in local time; .toISOString() converts to UTC).
 */
export function computeSnoozeUTC(
  preset: '30_min' | '1_hour' | 'tomorrow_9am' | 'next_week_9am'
): string {
  const now = new Date()

  switch (preset) {
    case '30_min':
      return new Date(now.getTime() + 30 * 60_000).toISOString()
    case '1_hour':
      return new Date(now.getTime() + 60 * 60_000).toISOString()
    case 'tomorrow_9am': {
      const d = new Date(now)
      d.setDate(d.getDate() + 1)
      d.setHours(9, 0, 0, 0)
      return d.toISOString()
    }
    case 'next_week_9am': {
      const d = new Date(now)
      d.setDate(d.getDate() + 7)
      d.setHours(9, 0, 0, 0)
      return d.toISOString()
    }
  }
}

/**
 * Compute UTC ISO string for a custom date + time string picked by the user.
 * The browser interprets `${date}T${time}:00` in the user's LOCAL timezone.
 */
export function computeCustomSnoozeUTC(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

// ─── Service class ─────────────────────────────────────────────────────────────

class RemindersService extends BaseApiService {
  /**
   * Fetch reminders from the backend.
   * Uses `GET /notifications/events?is_reminder=true&tab=<tab>&...`
   */
  async getReminders(params?: GetRemindersParams): Promise<RemindersResponse> {
    const sp = new URLSearchParams()
    sp.set('is_reminder', 'true')

    if (params?.tab) sp.set('tab', params.tab)
    if (params?.search) sp.set('search', params.search)
    if (params?.entity_type) sp.set('entity_type', params.entity_type)
    if (params?.skip !== undefined) sp.set('skip', String(params.skip))
    if (params?.limit !== undefined) sp.set('limit', String(params.limit))

    return this.get<RemindersResponse>(`/notifications/events?${sp.toString()}`)
  }

  /**
   * Bulk-update one or more reminder events.
   * `PUT /notifications/all`
   *
   * @example Complete a reminder
   * bulkUpdate({ notification_ids: [101], update_fields: { is_completed: true } })
   *
   * @example Cancel / dismiss a reminder
   * bulkUpdate({ notification_ids: [101], update_fields: { is_deleted: true } })
   *
   * @example Snooze 30 minutes
   * bulkUpdate({ notification_ids: [101], update_fields: { snoozed_until: computeSnoozeUTC('30_min') } })
   */
  async bulkUpdate(params: BulkUpdateRemindersParams): Promise<BulkUpdateRemindersResponse> {
    return this.put<BulkUpdateRemindersResponse, BulkUpdateRemindersParams>(
      '/notifications/all',
      params
    )
  }

  /** Mark a single reminder as completed → moves to Completed tab */
  async completeReminder(id: number): Promise<BulkUpdateRemindersResponse> {
    return this.bulkUpdate({ notification_ids: [id], update_fields: { is_completed: true } })
  }

  /** Dismiss / cancel a reminder — disappears from all tabs */
  async dismissReminder(id: number): Promise<BulkUpdateRemindersResponse> {
    return this.bulkUpdate({ notification_ids: [id], update_fields: { is_deleted: true } })
  }

  /** Snooze a reminder using a preset */
  async snoozeReminder(
    id: number,
    preset: '30_min' | '1_hour' | 'tomorrow_9am' | 'next_week_9am'
  ): Promise<BulkUpdateRemindersResponse> {
    return this.bulkUpdate({
      notification_ids: [id],
      update_fields: { snoozed_until: computeSnoozeUTC(preset) },
    })
  }

  /** Snooze a reminder with a custom UTC ISO string */
  async snoozeReminderCustom(
    id: number,
    snoozedUntil: string
  ): Promise<BulkUpdateRemindersResponse> {
    return this.bulkUpdate({
      notification_ids: [id],
      update_fields: { snoozed_until: snoozedUntil },
    })
  }

  /**
   * Move any notification to the Reminders page.
   * Sets both `system_events.is_reminder` and `user_event_states.is_reminder`.
   * Optionally combine with a snooze to place it directly in Upcoming tab.
   */
  async addToReminders(
    id: number,
    opts?: { snoozedUntil?: string }
  ): Promise<BulkUpdateRemindersResponse> {
    return this.bulkUpdate({
      notification_ids: [id],
      update_fields: {
        is_reminder: true,
        ...(opts?.snoozedUntil ? { snoozed_until: opts.snoozedUntil } : {}),
      },
    })
  }
}

export const remindersService = new RemindersService()
