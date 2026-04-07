/**
 * Settings Container Constants
 * Calendar Integration related constants
 */

// ==========================================
// Calendar Integration Constants
// ==========================================

export const CALENDAR_PROVIDER = 'outlook' as const

export const SYNC_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export const OAUTH_SCOPES = ['Calendars.Read', 'Calendars.ReadWrite', 'offline_access'] as const
