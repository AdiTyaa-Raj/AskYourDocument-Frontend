/**
 * Settings Container Types
 * Calendar Integration related type definitions
 */

// Re-export types from calendar service for convenience
export type {
  CalendarConnectionStatus,
  CalendarCallbackResponse,
  AvailableCalendar,
  CalendarToSelect,
  SelectCalendarsPayload,
  SelectCalendarsResponse,
  LinkedCalendar,
  LinkedCalendarAccount,
  LinkedCalendarsResponse,
  SyncCalendarEventsResponse,
  CalendarMetaApi,
  CalendarEventRecordApi,
  FmpExternalEventApi,
  FmpTearsheetRecordApi,
  CalendarAllEventsResponse,
} from '@/services/api/calendar.service'

// Import types for use in interfaces
import type { AvailableCalendar, LinkedCalendarAccount } from '@/services/api/calendar.service'

// ==========================================
// Calendar Component Types
// ==========================================

export interface CalendarSelectionDropdownProps {
  isConnected: boolean
  availableCalendars: AvailableCalendar[]
  selectedIds: Set<string>
  isLoading: boolean
  error: Error | null
  syncingCalendarId: string | null
  isSaving: boolean
  onToggleCalendar: (calendarId: string) => void
  onSaveSelection: () => void
  onSyncCalendar: (calendarId: string, calendarName: string) => void
}

export interface CalendarSyncSettingsProps {
  isConnected: boolean
  isLoading: boolean
  connectedAccount: LinkedCalendarAccount | null
  lastSyncTime: string | undefined
  onConnect: () => void
  isConnecting: boolean
  calendarSelection: CalendarSelectionDropdownProps
}

export interface CalendarSyncConfig {
  twoWaySync: boolean
  includePrivateEvents: boolean
  autoCreateReminders: boolean
}

export interface SetPasswordPayload {
  password: string
}

export interface PasswordRequirement {
  label: string
  ok: boolean
}

export interface PasswordEvaluation {
  minLength: number
  hasInput: boolean
  hasUpper: boolean
  hasLower: boolean
  hasNumber: boolean
  hasSymbol: boolean
  hasMinLength: boolean
  score: number
  label: string
  meetsPolicy: boolean
  requirements: PasswordRequirement[]
}
