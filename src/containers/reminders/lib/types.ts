import type { ReminderTab } from '@/services/api/reminders.services'

export type { ReminderTab }

// ─── UI entity type filter ─────────────────────────────────────────────────────

export type ReminderEntityType =
  | 'all'
  | 'approval'
  | 'alert'
  | 'pipeline'
  | 'document'
  | 'maintenance'

// ─── Normalised UI model ───────────────────────────────────────────────────────

/**
 * Normalised reminder item used by all UI components.
 * Derived from the flat `ReminderEventApi` shape returned by the backend.
 */
export interface ReminderItem {
  id: number
  title: string
  message: string
  entityType: ReminderEntityType | string
  eventType: string
  severity: string
  actionUrl: string | null
  createdAt: string
  isCompleted: boolean
  completedAt: string | null
  snoozedUntil: string | null
  /** Effective due time (UTC ISO). Used to determine In Progress vs Upcoming. */
  effectiveDueAt: string
  /** Whether the reminder is currently overdue (server-computed) */
  isOverdue: boolean
  /** Human-readable time label e.g. "1d overdue" or "in 2h" */
  timeDisplay: string
}

// ─── Tab badge counts ──────────────────────────────────────────────────────────

export interface ReminderCounts {
  all: number
  in_progress: number
  upcoming: number
  completed: number
}

// ─── Query param types ─────────────────────────────────────────────────────────

export interface UseRemindersQueryParams {
  tab: ReminderTab
  search?: string
  entityType?: string
  skip?: number
  limit?: number
  enabled?: boolean
}

export type SnoozePreset = '30_min' | '1_hour' | 'tomorrow_9am' | 'next_week_9am'

// ─── Component prop types ──────────────────────────────────────────────────────

export interface ReminderItemProps {
  reminder: ReminderItem
  isCompleted: boolean
  onComplete: (id: number) => void
  onDismiss: (id: number) => void
  onSnooze: (id: number, preset: SnoozePreset) => void
  onCustomSnooze: (id: number) => void
  onNavigate?: (actionUrl: string) => void
  isLoading?: boolean
}
