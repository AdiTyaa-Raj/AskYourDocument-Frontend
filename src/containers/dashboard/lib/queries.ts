import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { notificationsService } from '@/services/api/notifications.service'
import { calendarService } from '@/services/api/calendar.service'
import { usersService } from '@/services/api/users.service'
import type {
  CalendarAllEventsResponse,
  CalendarEventRecordApi,
  FmpExternalEventApi,
  FmpTearsheetRecordApi,
} from '@/services/api/calendar.service'
import type { UserDirectoryMap } from '@/services/api/users.service'
import type { NotificationApiItem } from '@/containers/notifications/lib/types'
import type {
  ActivityItem,
  FieldResearchTrip,
  InternalMeeting,
  PendingReviewItem,
  PublicEvent,
} from './types'
import { formatRelativeTime } from '@/lib/date-utils'
import { useApprovalsQuery } from '@/containers/approvals/lib/queries'
import type { StageApprovalRequest } from '@/containers/approvals/lib/types'
import { extractCompanyFromTitle } from '@/containers/notifications/lib/utils'
import { normaliseActionUrl } from './helpers'

const parseTicker = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const parseExchange = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const extractTickerFromMeta = (meta: unknown): string | undefined => {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const record = meta as Record<string, unknown>
    return (
      parseTicker(record.ticker) ??
      parseTicker((record.payload as Record<string, unknown> | undefined)?.ticker)
    )
  }

  if (Array.isArray(meta)) {
    const first = meta[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const payload = (first as Record<string, unknown>).payload as
        | Record<string, unknown>
        | undefined
      return parseTicker(payload?.ticker)
    }
  }

  return undefined
}

const extractExchangeFromMeta = (meta: unknown): string | undefined => {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const record = meta as Record<string, unknown>
    return (
      parseExchange(record.exchange) ??
      parseExchange((record.payload as Record<string, unknown> | undefined)?.exchange)
    )
  }

  if (Array.isArray(meta)) {
    const first = meta[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const payload = (first as Record<string, unknown>).payload as
        | Record<string, unknown>
        | undefined
      return parseExchange(payload?.exchange)
    }
  }

  return undefined
}

const extractTickerFromEvent = (event: NotificationApiItem['SystemEvent']): string | undefined => {
  return parseTicker(event.ticker) ?? extractTickerFromMeta(event.meta)
}

const extractExchangeFromEvent = (
  event: NotificationApiItem['SystemEvent']
): string | undefined => {
  return (
    parseExchange((event as { exchange?: unknown }).exchange) ?? extractExchangeFromMeta(event.meta)
  )
}

const dashboardKeys = {
  all: ['dashboard'] as const,
  recentActivity: (limit: number) => [...dashboardKeys.all, 'recent-activity', limit] as const,
  events: (page: number, limit: number) => [...dashboardKeys.all, 'events', page, limit] as const,
}

const MAX_RECENT_ITEMS = 15
const EVENTS_PAGE = 1
const EVENTS_LIMIT = 25

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
}

const formatUserName = (
  userId?: number,
  directory?: UserDirectoryMap,
  fallback = 'Research Team'
) => (typeof userId === 'number' ? (directory?.[userId]?.fullName ?? `User ${userId}`) : fallback)

const formatDate = (value?: string) => {
  if (!value) return 'TBD'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'TBD'
  return parsed.toLocaleDateString(undefined, DATE_FORMAT)
}

const formatDateTimeRange = (start?: string, end?: string, allDay?: boolean) => {
  if (!start) return 'TBD'
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date(startDate)
  const sameDay = startDate.toDateString() === endDate.toDateString()
  const datePart = sameDay
    ? startDate.toLocaleDateString(undefined, DATE_FORMAT)
    : `${startDate.toLocaleDateString(undefined, DATE_FORMAT)} – ${endDate.toLocaleDateString(undefined, DATE_FORMAT)}`
  if (allDay) {
    return sameDay ? `${datePart} • All day` : `${datePart}`
  }
  const startTime = startDate.toLocaleTimeString(undefined, TIME_FORMAT)
  const endTime = endDate.toLocaleTimeString(undefined, TIME_FORMAT)
  return `${datePart} • ${startTime} – ${endTime}`
}

const formatPublicEventType = (value?: string): PublicEvent['type'] => {
  switch (value) {
    case 'dividend':
      return 'dividend'
    case 'earnings_call':
      return 'earnings'
    default:
      return 'conference'
  }
}

const formatPublicEventTitle = (event: FmpExternalEventApi) => {
  const label = event.type ? event.type.replace(/_/g, ' ') : 'Event'
  const formattedLabel = label
    .split(' ')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
  const symbol = event.symbol ?? (event.details?.symbol as string | undefined) ?? 'Company'
  return `${symbol} ${formattedLabel}`
}

function mapSystemEventToActivity(apiItem: NotificationApiItem): ActivityItem {
  const event = apiItem.SystemEvent
  const actorLabel =
    event.actor && event.actor.id === 0
      ? undefined
      : (event.actor?.full_name ?? event.actor?.email ?? event.actor?.username ?? undefined)

  const timestampSource = event.updated_at ?? event.created_at ?? ''
  const ticker = extractTickerFromEvent(event) || extractCompanyFromTitle(event.title) || ''
  const exchange = extractExchangeFromEvent(event)
  const actionUrl = normaliseActionUrl(event)

  return {
    id: event.id,
    analyst: actorLabel ?? '',
    action: event.message || event.title || 'Activity update available.',
    company: ticker,
    exchange,
    timestamp: formatRelativeTime(timestampSource),
    actionUrl,
  }
}

export function useRecentActivity(limit: number = MAX_RECENT_ITEMS) {
  const cappedLimit = Math.min(Math.max(limit, 1), MAX_RECENT_ITEMS)

  return useQuery({
    queryKey: dashboardKeys.recentActivity(cappedLimit),
    queryFn: async () => {
      const response = await notificationsService.searchNotifications({
        skip: 0,
        limit: cappedLimit,
        order: 'newest',
      })

      const items = response.results ?? []

      const seen = new Set<string>()
      const deduped: ActivityItem[] = []

      for (const event of items) {
        const sysEvent = event.SystemEvent
        if (!sysEvent) continue

        const key = `${sysEvent.id ?? 'unknown'}-${sysEvent.updated_at ?? sysEvent.created_at ?? ''}`
        if (seen.has(key)) continue

        seen.add(key)
        deduped.push(mapSystemEventToActivity(event))

        if (deduped.length >= cappedLimit) break
      }

      return deduped
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })
}

function mapPublicEvents(records: FmpTearsheetRecordApi[]): PublicEvent[] {
  const events: PublicEvent[] = []
  records.forEach((record) => {
    const externalEvents = record.meta?.external_events ?? []
    externalEvents.forEach((event, index) => {
      const date = event.event_date ?? (event.details?.date as string | undefined)
      const details = event.details && typeof event.details === 'object' ? event.details : null
      const exchange =
        details && 'exchange' in details ? parseExchange(details.exchange) : undefined
      events.push({
        id: Number(`${record.id}${index}`),
        company: event.symbol ?? (event.details?.symbol as string | undefined) ?? 'N/A',
        exchange,
        title: formatPublicEventTitle(event),
        date: formatDate(date),
        type: formatPublicEventType(event.type),
      })
    })
  })
  return events
}

function mapInternalMeetings(
  meetings: CalendarEventRecordApi[],
  directory?: UserDirectoryMap
): InternalMeeting[] {
  return meetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title || 'Internal Meeting',
    time: formatDateTimeRange(meeting.start_time, meeting.end_time, meeting.all_day),
    analyst: formatUserName(meeting.user_id, directory),
  }))
}

function mapFieldResearchTrips(
  trips: CalendarEventRecordApi[],
  directory?: UserDirectoryMap
): FieldResearchTrip[] {
  return trips.map((trip) => ({
    id: trip.id,
    analyst: formatUserName(trip.user_id, directory),
    location: trip.location || 'TBD',
    dates: formatDateTimeRange(trip.start_time, trip.end_time, trip.all_day),
    companies: Array.isArray(trip.tickers) ? trip.tickers.length : 0,
  }))
}

const collectEventUserIds = (response: CalendarAllEventsResponse): number[] => {
  const ids = new Set<number>()
  response.calendar_events.internal_meetings.forEach((meeting) => {
    if (typeof meeting.user_id === 'number') ids.add(meeting.user_id)
  })
  response.calendar_events.field_research.forEach((trip) => {
    if (typeof trip.user_id === 'number') ids.add(trip.user_id)
  })
  return Array.from(ids)
}

function mapCalendarEventsResponse(
  response: CalendarAllEventsResponse,
  directory?: UserDirectoryMap
) {
  return {
    publicEvents: mapPublicEvents(response.fmp_tearsheets),
    internalMeetings: mapInternalMeetings(response.calendar_events.internal_meetings, directory),
    fieldResearchTrips: mapFieldResearchTrips(response.calendar_events.field_research, directory),
  }
}

export function useDashboardEvents(page: number = EVENTS_PAGE, limit: number = EVENTS_LIMIT) {
  return useQuery({
    queryKey: dashboardKeys.events(page, limit),
    queryFn: async () => {
      const response = await calendarService.getAllEvents(page, limit)
      const userIds = collectEventUserIds(response)
      const directory = userIds.length ? await usersService.getUsersByIds(userIds) : {}
      return mapCalendarEventsResponse(response, directory)
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })
}

const normaliseNumericId = (value: string | number): number => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? Math.abs(hashCode(String(value))) : parsed
}

const hashCode = (input: string): number => {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function mapStageApprovalToPendingItem(approval: StageApprovalRequest): PendingReviewItem {
  const priority: PendingReviewItem['priority'] =
    approval.canApprove && !approval.alreadyApproved ? 'high' : 'low'

  const approvalLabel = approval.canApprove
    ? approval.alreadyApproved
      ? 'Approved by you'
      : 'Action required'
    : 'Waiting on others'

  const approvalTooltip = approval.canApprove
    ? approval.alreadyApproved
      ? 'You have already approved this request.'
      : 'Review and submit your decision.'
    : approval.cannotApprove
      ? 'Awaiting prior approvers in the sequence.'
      : 'View only.'

  return {
    id: normaliseNumericId(approval.id),
    ticker: approval.ticker,
    exchange: approval.overview.exchange,
    company: approval.company,
    title: `Move from ${approval.fromStage} to ${approval.toStage}`,
    submittedBy: approval.requester.name,
    submittedDate: formatRelativeTime(approval.submittedAt ?? ''),
    priority,
    category: 'stage',
    approvalLabel,
    approvalTooltip,
    fromStage: approval.fromStage,
    toStage: approval.toStage,
  }
}

export function useMyPendingApprovals(limit: number = 5) {
  const approvalsQuery = useApprovalsQuery({ mineOnly: true })

  const items: PendingReviewItem[] = useMemo(() => {
    if (!approvalsQuery.data) return []
    const stageItems = approvalsQuery.data
      .filter((approval): approval is StageApprovalRequest => approval.kind === 'stage')
      .map(mapStageApprovalToPendingItem)
    const memoItems = approvalsQuery.data
      .filter((approval) => approval.kind === 'memo')
      .map((memo) => {
        const firstCo = memo.companies && memo.companies.length > 0 ? memo.companies[0] : null
        const ticker = firstCo?.ticker ?? 'MEMO'
        const exchange = firstCo?.exchange
        return {
          id: normaliseNumericId(memo.id),
          ticker,
          exchange,
          company: memo.title,
          title: memo.title,
          submittedBy: memo.requester.name,
          submittedDate: formatRelativeTime(memo.submittedAt ?? ''),
          priority: (memo.canApprove ? 'medium' : 'low') as PendingReviewItem['priority'],
          category: 'memo' as const,
          approvalLabel: memo.canApprove ? 'Memo review' : 'View only',
          approvalTooltip: memo.canApprove ? 'Review the memo and respond.' : 'Waiting on others.',
          memoType: memo.templateLabel,
        }
      })

    const combined = [...stageItems, ...memoItems]
    combined.sort((a, b) => (a.submittedDate > b.submittedDate ? -1 : 1))
    return combined.slice(0, limit)
  }, [approvalsQuery.data, limit])

  return {
    ...approvalsQuery,
    data: items,
  }
}

export const __dashboardTestHelpers = {
  mapStageApprovalToPendingItem,
  mapPublicEvents,
  mapInternalMeetings,
  mapFieldResearchTrips,
  mapCalendarEventsResponse,
  formatDateTimeRange,
  formatPublicEventType,
}
