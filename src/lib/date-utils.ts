/**
 * Date formatting utilities
 * Centralized date formatting functions used across the app
 */

/**
 * Format a date string to a localized date
 * @param dateString - ISO date string or valid date string
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string or '-' if invalid
 */
export function formatDate(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '-'

  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }

    const date = new Date(dateString)
    // Check if date is invalid
    if (isNaN(date.getTime())) {
      return '-'
    }

    return date.toLocaleDateString('en-US', options || defaultOptions)
  } catch {
    return '-'
  }
}

/**
 * Format a date string to a localized time
 * @param dateString - ISO date string or valid date string
 * @returns Formatted time string (e.g., "10:30 AM")
 */
export function formatTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    // Check if date is invalid
    if (isNaN(date.getTime())) {
      return '-'
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '-'
  }
}

/**
 * Format a date string to a relative time (e.g., "2 hours ago")
 * @param dateString - ISO date string or valid date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  try {
    if (!dateString) return '-'

    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(dateString)
    const parsed = Date.parse(hasTimezone ? dateString : `${dateString}Z`)
    if (Number.isNaN(parsed)) {
      return '-'
    }

    const diffInSeconds = Math.floor((Date.now() - parsed) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`

    return formatDate(dateString)
  } catch {
    return '-'
  }
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Format a date string to full date + time (e.g., "Feb 20, 2025, 10:30 AM")
 * @param dateString - ISO date string or valid date string
 * @returns Formatted date-time string or '-' if invalid
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return `${date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })} ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`
  } catch {
    return '-'
  }
}

/* Format a Date instance to short date (e.g., "Feb 20, 2025") */
export function formatShortDate(date: Date = new Date()): string {
  return formatDate(date.toISOString())
}

/* Formats an ISO timestamp to a human-readable "time ago" string with full date fallback */
export function formatTimeAgo(isoString?: string): string {
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
