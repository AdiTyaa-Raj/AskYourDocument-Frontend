/**
 * Settings Helpers
 * Utility functions for calendar settings
 */

import type {
  AvailableCalendar,
  CalendarToSelect,
  LinkedCalendarAccount,
  SelectCalendarsPayload,
} from './types'
import type { PasswordEvaluation } from './types'

/**
 * Builds the payload for the /calendar/select API, handling the is_default logic.
 *
 * @param availableCalendars - List of calendars from /calendar/available API.
 * @param selectedCalendarIds - IDs of calendars explicitly selected by the user.
 * @returns The payload for the /calendar/select API.
 */
export function buildSelectCalendarsPayload(
  availableCalendars: AvailableCalendar[],
  selectedCalendarIds: Set<string>
): SelectCalendarsPayload {
  const calendars: CalendarToSelect[] = []

  // Include all selected calendars
  selectedCalendarIds.forEach((id) => {
    const calendar = availableCalendars.find((cal) => cal.id === id)
    if (calendar) {
      calendars.push({
        id: calendar.id,
        name: calendar.name,
        // Invert logic: if not removable (default by backend), send as is_default: true
        is_default: !calendar.isRemovable,
      })
    }
  })

  return { calendars }
}

/**
 * Extracts the IDs of calendars that are considered "default" (not removable)
 * from the available calendars list.
 *
 * @param availableCalendars - List of calendars from /calendar/available API.
 * @returns A Set of default calendar IDs.
 */
export function getDefaultCalendarIds(availableCalendars: AvailableCalendar[]): Set<string> {
  return new Set(availableCalendars.filter((cal) => !cal.isRemovable).map((cal) => cal.id))
}

/**
 * Extracts the IDs of calendars that are currently linked/synced from the linked accounts.
 * This is used to pre-select calendars in the UI.
 *
 * @param linkedAccounts - List of linked calendar accounts from /calendar/linked-calendars API.
 * @returns A Set of linked calendar IDs.
 */
export function getInitialSelectedIds(linkedAccounts: LinkedCalendarAccount[]): Set<string> {
  const selectedIds = new Set<string>()
  linkedAccounts.forEach((account) => {
    account.calendars_synced.forEach((cal) => {
      selectedIds.add(cal.id)
    })
  })
  return selectedIds
}

/**
 * Formats a timestamp to a human-readable relative time string.
 *
 * @param isoString - ISO date string to format.
 * @returns Formatted time string (e.g., "5 minutes ago", "2 hours ago", "Nov 19, 2025").
 */
export function formatLastSyncTime(isoString?: string): string {
  if (!isoString) return 'Never'

  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const PASSWORD_MIN_LENGTH = 8

export function evaluatePassword(password: string): PasswordEvaluation {
  const hasInput = password.length > 0
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const hasMinLength = password.trim().length >= PASSWORD_MIN_LENGTH

  const score = [
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    password.length >= PASSWORD_MIN_LENGTH,
  ].filter(Boolean).length

  const label = (() => {
    if (score >= 4) return 'Strong'
    if (score === 3) return 'Medium'
    if (score >= 1) return 'Weak'
    return ''
  })()

  const requirements = [
    { label: 'Uppercase letter', ok: hasUpper },
    { label: 'Lowercase letter', ok: hasLower },
    { label: 'Number', ok: hasNumber },
    { label: 'Symbol', ok: hasSymbol },
    { label: 'Minimum 8 characters', ok: hasMinLength },
  ]

  const meetsPolicy = hasUpper && hasLower && hasNumber && hasSymbol && hasMinLength

  return {
    minLength: PASSWORD_MIN_LENGTH,
    hasInput,
    hasUpper,
    hasLower,
    hasNumber,
    hasSymbol,
    hasMinLength,
    score,
    label,
    meetsPolicy,
    requirements,
  }
}
