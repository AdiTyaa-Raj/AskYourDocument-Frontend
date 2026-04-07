import { CheckCircle, TrendingUp, AlertTriangle, FileText, Wrench, Bell } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReminderEventApi, GetRemindersParams } from '@/services/api/reminders.services'
import type { ReminderTab, ReminderEntityType, ReminderItem } from './types'
import { normaliseActionUrl } from '@/containers/dashboard/lib/helpers'

// ─── Tab config ────────────────────────────────────────────────────────────────

export const TABS: { id: ReminderTab; label: string }[] = [
  { id: 'in_progress', label: 'In Progress' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]

// ─── Tab badge colours ─────────────────────────────────────────────────────────

export function tabBadgeClass(tab: ReminderTab, active: boolean): string {
  if (!active) return 'bg-gray-200 text-gray-700'
  switch (tab) {
    case 'in_progress':
      return 'bg-red-100 text-red-700'
    case 'upcoming':
      return 'bg-blue-100 text-blue-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
  }
}

// ─── UI entity type filter ─────────────────────────────────────────────────────

export const REMINDER_ENTITY_TYPE_OPTIONS: { value: ReminderEntityType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'alert', label: 'Alert' },
  { value: 'approval', label: 'Approval' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'document', label: 'Document' },
  { value: 'maintenance', label: 'Maintenance' },
]

// ─── Pagination defaults ───────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// ─── Query keys ────────────────────────────────────────────────────────────────

export const reminderKeys = {
  all: ['reminders'] as const,
  list: (params: GetRemindersParams) => ['reminders', 'list', params] as const,
}

// ─── Icon / colour helpers ─────────────────────────────────────────────────────

export function getReminderIcon(entityType: string): LucideIcon {
  switch (entityType) {
    case 'approval':
      return CheckCircle
    case 'pipeline':
      return TrendingUp
    case 'alert':
      return AlertTriangle
    case 'document':
      return FileText
    case 'maintenance':
      return Wrench
    default:
      return Bell
  }
}

/** Returns Tailwind bg + text classes for the icon container */
export function getReminderIconClasses(entityType: string, isCompleted: boolean): string {
  if (isCompleted) return 'bg-gray-100 text-gray-500'
  switch (entityType) {
    case 'approval':
      return 'bg-green-100 text-green-600'
    case 'pipeline':
      return 'bg-blue-100 text-blue-600'
    case 'alert':
      return 'bg-red-100 text-red-600'
    case 'document':
      return 'bg-purple-100 text-purple-600'
    case 'maintenance':
      return 'bg-indigo-100 text-indigo-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// ─── Transform API → UI ────────────────────────────────────────────────────────

/**
 * Transform a flat `ReminderEventApi` object into the `ReminderItem` shape
 * consumed by UI components.
 *
 * `effective_due_at`, `is_overdue`, and `time_display` are computed by the
 * backend and included in reminders-mode responses; we fall back to `created_at`
 * for safety so the component never receives undefined.
 */
export function transformReminderEvent(event: ReminderEventApi): ReminderItem {
  const { SystemEvent: se, UserEventState: ues } = event
  return {
    id: se.id,
    title: se.title,
    message: se.message,
    entityType: se.entity_type.toLowerCase(),
    eventType: se.event_type,
    severity: se.severity,
    actionUrl: normaliseActionUrl(se) ?? se.action_url,
    createdAt: se.created_at,
    isCompleted: ues?.is_completed ?? false,
    completedAt: ues?.completed_at ?? null,
    snoozedUntil: ues?.snoozed_until ?? null,
    effectiveDueAt: event.effective_due_at ?? se.created_at,
    isOverdue: event.is_overdue ?? false,
    timeDisplay: event.time_display ?? '',
  }
}

/** Transform an array of API reminder events. */
export function transformReminderEvents(events: ReminderEventApi[]): ReminderItem[] {
  return events.map(transformReminderEvent)
}

// ─── Date / time formatting ────────────────────────────────────────────────────

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

/**
 * Format an ISO date string for display in reminder cards.
 * e.g. "Mar 25, 9:00 AM"
 */
export function formatReminderDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', DATE_FORMAT)
}

// ─── Client-side snooze time computation (fallback / local filtering) ─────────

/**
 * Returns whether `isoString` is in the future relative to now.
 * Used client-side only for optimistic UI; the server is the source of truth.
 */
export function isInFuture(isoString: string | null | undefined): boolean {
  if (!isoString) return false
  return new Date(isoString).getTime() > Date.now()
}

// ─── Custom date/time picker helpers ──────────────────────────────────────────

/** Returns today's date as a YYYY-MM-DD string (browser local timezone). */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA')
}

/** Returns the current time as an HH:MM string (browser local timezone). */
export function getCurrentTimeString(): string {
  return new Date().toTimeString().slice(0, 5)
}

/**
 * Returns true when both `date` (YYYY-MM-DD) and `time` (HH:MM) are provided
 * and the resulting local datetime is in the past (≤ now).
 */
export function isDateTimeInPast(date: string, time: string): boolean {
  if (!date || !time) return false
  return new Date(`${date}T${time}:00`) <= new Date()
}
