/**
 * Settings Queries
 * TanStack Query hooks for settings-related data fetching
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { calendarService } from '@/services/api/calendar.service'
import type { SelectCalendarsPayload } from './types'
import notify from '@/lib/notifications'
import { authService } from '@/services/api/auth.service'

// Query keys for better cache management
export const settingsKeys = {
  all: ['settings'] as const,
  calendar: () => [...settingsKeys.all, 'calendar'] as const,
  availableCalendars: () => [...settingsKeys.calendar(), 'available'] as const,
  linkedCalendars: (page: number, limit: number) =>
    [...settingsKeys.calendar(), 'linked', page, limit] as const,
}

/**
 * Hook to initiate calendar connection
 * Redirects directly to backend OAuth endpoint to avoid CORS
 */
export function useConnectCalendar() {
  return useMutation({
    mutationFn: async () => {
      // Direct redirect to backend OAuth endpoint (no API call to avoid CORS)
      const connectUrl = calendarService.getConnectUrl()
      window.location.href = connectUrl
      return { success: true }
    },
  })
}

/**
 * Hook to handle OAuth callback
 */
export function useCalendarCallback() {
  return useMutation({
    mutationFn: async ({
      code,
      state,
      clientInfo,
    }: {
      code: string
      state?: string
      clientInfo?: string
    }) => {
      return await calendarService.callback(code, state, clientInfo)
    },
  })
}

/**
 * Hook to disconnect calendar
 */
export function useDisconnectCalendar() {
  return useMutation({
    mutationFn: async () => {
      return await calendarService.disconnect()
    },
  })
}

/**
 * Hook to trigger manual calendar sync
 */
export function useSyncCalendar() {
  return useMutation({
    mutationFn: async () => {
      return await calendarService.syncNow()
    },
  })
}

/**
 * Hook to fetch available calendars
 */
export function useAvailableCalendars(enabled: boolean = true) {
  return useQuery({
    queryKey: settingsKeys.availableCalendars(),
    queryFn: async () => {
      return await calendarService.getAvailableCalendars()
    },
    enabled,
  })
}

/**
 * Hook to fetch linked calendars (already selected/synced)
 */
export function useLinkedCalendars(page = 1, limit = 25) {
  return useQuery({
    queryKey: settingsKeys.linkedCalendars(page, limit),
    queryFn: async () => {
      return await calendarService.getLinkedCalendars(page, limit)
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

/**
 * Hook to select calendars to sync
 * Handles the is_default logic inversion:
 * - isRemovable: false (from available API) → is_default: true (in request)
 * - User selected calendars → is_default: false (in request)
 */
export function useSelectCalendars() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SelectCalendarsPayload) => {
      return await calendarService.selectCalendars(payload)
    },
    onSuccess: () => {
      // Invalidate linked calendars to refresh the list
      queryClient.invalidateQueries({ queryKey: settingsKeys.calendar() })
      notify.success({
        title: 'Calendars updated',
        description: 'Your calendar selection has been saved successfully.',
      })
    },
    onError: (error: Error) => {
      console.error('Failed to select calendars:', error)
      notify.error({
        title: 'Failed to update calendars',
        description: 'Could not save your calendar selection. Please try again.',
      })
    },
  })
}

/**
 * Hook to sync events for a specific calendar
 */
export function useSyncCalendarEvents() {
  return useMutation({
    mutationFn: async (calendarId: string) => {
      return await calendarService.syncCalendarEvents(calendarId)
    },
  })
}

/**
 * Hook to set/update the current user's password
 */
export function useSetPassword() {
  return useMutation({
    mutationFn: async (password: string) => authService.setPassword(password),
  })
}
