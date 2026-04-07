import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { remindersService, computeCustomSnoozeUTC } from '@/services/api/reminders.services'
import type {
  GetRemindersParams,
  BulkUpdateRemindersResponse,
} from '@/services/api/reminders.services'
import { reminderKeys, transformReminderEvents } from './helper'
import type { UseRemindersQueryParams, SnoozePreset } from './types'
export type { UseRemindersQueryParams, SnoozePreset }

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch reminders for a given tab with optional search / filter / pagination.
 * The response includes `counts` for all four tabs so callers can drive badge
 * numbers without separate queries.
 */
export function useRemindersQuery({
  tab,
  search,
  entityType,
  skip = 0,
  limit = 25,
  enabled = true,
}: UseRemindersQueryParams) {
  const params: GetRemindersParams = {
    tab,
    ...(search ? { search } : {}),
    ...(entityType && entityType !== 'all' ? { entity_type: entityType } : {}),
    skip,
    limit,
  }

  return useQuery({
    queryKey: reminderKeys.list(params),
    queryFn: async () => {
      const response = await remindersService.getReminders(params)
      return {
        items: transformReminderEvents(response.events),
        total: response.total,
        counts: response.counts,
      }
    },
    enabled,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 30_000, // 30 s — reminders don't change often
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

/** Invalidate all reminder list queries after a mutation succeeds */
function useInvalidateReminders() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: reminderKeys.all })
}

/** Mark a single reminder as completed (→ Completed tab) */
export function useCompleteReminderMutation() {
  const invalidate = useInvalidateReminders()
  return useMutation<BulkUpdateRemindersResponse, Error, number>({
    mutationFn: (id) => remindersService.completeReminder(id),
    onSuccess: invalidate,
  })
}

/** Dismiss / cancel a reminder (disappears from all tabs) */
export function useDismissReminderMutation() {
  const invalidate = useInvalidateReminders()
  return useMutation<BulkUpdateRemindersResponse, Error, number>({
    mutationFn: (id) => remindersService.dismissReminder(id),
    onSuccess: invalidate,
  })
}

/** Snooze a reminder with a well-known preset (→ Upcoming tab until time passes) */
export function useSnoozeReminderMutation() {
  const invalidate = useInvalidateReminders()
  return useMutation<BulkUpdateRemindersResponse, Error, { id: number; preset: SnoozePreset }>({
    mutationFn: ({ id, preset }) => remindersService.snoozeReminder(id, preset),
    onSuccess: invalidate,
  })
}

/** Snooze with a user-specified date + time string (local timezone → UTC) */
export function useCustomSnoozeReminderMutation() {
  const invalidate = useInvalidateReminders()
  return useMutation<
    BulkUpdateRemindersResponse,
    Error,
    { id: number; date: string; time: string }
  >({
    mutationFn: ({ id, date, time }) =>
      remindersService.snoozeReminderCustom(id, computeCustomSnoozeUTC(date, time)),
    onSuccess: invalidate,
  })
}
