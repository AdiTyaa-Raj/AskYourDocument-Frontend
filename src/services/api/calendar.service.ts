/**
 * Calendar API Service
 * Handles calendar integration, synchronization, and events
 */

import { BaseApiService } from './base'

// API Base URL for direct redirects (to avoid CORS on OAuth redirects)
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://dev-webserver.arnie.shyftops.io/api/v1'

// ============================================================================
// Calendar Integration Types (Outlook OAuth & Sync)
// ============================================================================

export interface CalendarConnectionStatus {
  is_connected: boolean
  email?: string
  last_sync_time?: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
  token_expired?: boolean
  error_message?: string
}

export interface CalendarCallbackResponse {
  status: string
  connection_id?: number
  message?: string
  email?: string
  last_sync_time?: string
}

export interface AvailableCalendar {
  id: string
  name: string
  color: string
  hexColor: string
  groupClassId: string
  isDefaultCalendar: boolean
  changeKey: string
  canShare: boolean
  canViewPrivateItems: boolean
  canEdit: boolean
  allowedOnlineMeetingProviders: string[]
  defaultOnlineMeetingProvider: string
  isTallyingResponses: boolean
  isRemovable: boolean
  owner: {
    name: string
    address: string
  }
}

export interface CalendarToSelect {
  id: string
  name: string
  is_default: boolean
}

export interface SelectCalendarsPayload {
  calendars: CalendarToSelect[]
}

export interface SelectCalendarsResponse {
  status: string
  calendar_ids: string[]
}

export interface LinkedCalendar {
  id: string
  name: string
  is_default: boolean
}

export interface LinkedCalendarAccount {
  id: number
  provider: string
  email: string
  graph_user_id: string
  calendars_synced: LinkedCalendar[]
  token_expiry: string
  is_active: boolean
}

export interface LinkedCalendarsResponse {
  meta: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  items: LinkedCalendarAccount[]
}

export interface SyncCalendarEventsResponse {
  status: string
  fetched: number
  new_or_updated: number
  skipped_public: number
  synced_at: string
}

// ============================================================================
// Calendar Events Types (Dashboard/Event Management)
// ============================================================================

export interface CalendarMetaApi {
  page: number
  limit: number
  total_calendar_events: number
  total_internal_meetings: number
  total_field_research: number
  total_other_events: number
  total_fmp_tearsheets: number
  start: string
  end: string
}

export interface CalendarEventRecordApi {
  id: number
  title: string
  category: string
  start_time?: string
  end_time?: string
  user_id?: number
  tickers?: Array<number | string> | null
  location?: string | null
  all_day?: boolean
  created_at?: string
  updated_at?: string
  recurrence?: unknown
  org_id?: number
  connection_id?: number
  description?: string | null
  calendar_id?: string
  external_event_id?: string
  web_link?: string | null
  raw_payload?: Record<string, unknown> | null
}

export interface FmpExternalEventApi {
  type?: string
  source?: string
  symbol?: string
  event_date?: string
  details?: Record<string, unknown> | null
}

export interface FmpTearsheetRecordApi {
  id: number
  company_id?: number
  created_at?: string
  updated_at?: string
  meta?: {
    external_events?: FmpExternalEventApi[]
    [key: string]: unknown
  } | null
}

export interface CalendarAllEventsResponse {
  meta: CalendarMetaApi
  calendar_events: {
    internal_meetings: CalendarEventRecordApi[]
    field_research: CalendarEventRecordApi[]
    others: CalendarEventRecordApi[]
  }
  fmp_tearsheets: FmpTearsheetRecordApi[]
}

// ============================================================================
// Calendar Service (Combined)
// ============================================================================

class CalendarService extends BaseApiService {
  // ========== Calendar Integration Methods (OAuth & Sync) ==========

  /**
   * Get the calendar connect URL
   * Use this with window.location.href to avoid CORS issues
   * Redirects to Microsoft OAuth with callback to /oauth/microsoft/callback
   */
  getConnectUrl(): string {
    const callbackUrl = `${window.location.origin}/oauth/microsoft/callback`
    return `${API_BASE_URL}/calendar/connect?callback_url=${encodeURIComponent(callbackUrl)}`
  }

  /**
   * Handle OAuth callback
   * @param code - Authorization code from OAuth provider
   * @param state - State parameter for CSRF protection
   * @param clientInfo - Client info from Microsoft OAuth
   */
  async callback(
    code: string,
    state?: string | null,
    clientInfo?: string | null
  ): Promise<CalendarCallbackResponse> {
    const params = new URLSearchParams()
    params.append('code', code)
    if (state) {
      params.append('state', state)
    }
    if (clientInfo) {
      params.append('client_info', clientInfo)
    }

    const apiUrl = `/calendar/callback?${params.toString()}`
    console.log('🌐 Calendar Service - Calling API:', apiUrl)

    return this.get<CalendarCallbackResponse>(apiUrl)
  }

  /**
   * Disconnect calendar
   */
  async disconnect(): Promise<{ message: string }> {
    return this.delete<{ message: string }>('/calendar/disconnect')
  }

  /**
   * Get available calendars
   * Returns array directly from backend, wrapped in object for consistency
   */
  async getAvailableCalendars(): Promise<{ calendars: AvailableCalendar[] }> {
    const calendars = await this.get<AvailableCalendar[]>('/calendar/available')
    return { calendars }
  }

  /**
   * Get linked calendars (already selected/synced calendars)
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   */
  async getLinkedCalendars(page = 1, limit = 25): Promise<LinkedCalendarsResponse> {
    return this.get<LinkedCalendarsResponse>(
      `/calendar/linked-calendars?page=${page}&limit=${limit}`
    )
  }

  /**
   * Select calendars to sync
   * Note: is_default logic is inverted:
   * - If calendar.isRemovable === false in available API → send is_default: true
   * - If user selected from dropdown → send is_default: false
   */
  async selectCalendars(payload: SelectCalendarsPayload): Promise<SelectCalendarsResponse> {
    return this.post<SelectCalendarsResponse, SelectCalendarsPayload>('/calendar/select', payload)
  }

  /**
   * Sync events for a specific calendar
   */
  async syncCalendarEvents(calendarId: string): Promise<SyncCalendarEventsResponse> {
    return this.post<SyncCalendarEventsResponse>(
      `/calendar/events/sync?calendar_id=${encodeURIComponent(calendarId)}`
    )
  }

  /**
   * Trigger manual calendar sync
   */
  async syncNow(): Promise<{ message: string; sync_started: boolean }> {
    return this.post<{ message: string; sync_started: boolean }>('/calendar/sync')
  }

  // ========== Calendar Events Methods (Dashboard) ==========

  /**
   * Get all calendar events for dashboard/event management
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   */
  async getAllEvents(page: number = 1, limit: number = 25): Promise<CalendarAllEventsResponse> {
    const searchParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    })
    return this.get<CalendarAllEventsResponse>(`/calendar/all-events?${searchParams.toString()}`)
  }
}

// Export singleton instance
export const calendarService = new CalendarService()
