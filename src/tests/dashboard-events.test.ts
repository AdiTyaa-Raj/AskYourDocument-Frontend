import { describe, expect, it } from 'vitest'

import { __dashboardTestHelpers } from '@/containers/dashboard/lib/queries'
import type { CalendarAllEventsResponse } from '@/services/api/calendar.service'
import type { UserDirectoryMap } from '@/services/api/users.service'

const { mapCalendarEventsResponse, formatDateTimeRange } = __dashboardTestHelpers

describe('Dashboard events mapping', () => {
  it('maps calendar API response into dashboard structures', () => {
    const response: CalendarAllEventsResponse = {
      meta: {
        page: 1,
        limit: 25,
        total_calendar_events: 2,
        total_internal_meetings: 1,
        total_field_research: 1,
        total_other_events: 0,
        total_fmp_tearsheets: 1,
        start: '2025-11-10T00:00:00Z',
        end: '2025-11-20T00:00:00Z',
      },
      calendar_events: {
        internal_meetings: [
          {
            id: 10,
            title: 'IC Review',
            category: 'internal_meeting',
            start_time: '2025-11-12T15:00:00Z',
            end_time: '2025-11-12T16:00:00Z',
            user_id: 5,
            location: 'Zoom',
          },
        ],
        field_research: [
          {
            id: 20,
            title: 'Japan Trip',
            category: 'field_research',
            start_time: '2025-11-14T00:00:00Z',
            end_time: '2025-11-16T00:00:00Z',
            user_id: 6,
            tickers: [8, 12, 15],
            location: 'Tokyo',
            all_day: true,
          },
        ],
        others: [],
      },
      fmp_tearsheets: [
        {
          id: 30,
          company_id: 9,
          meta: {
            external_events: [
              {
                type: 'earnings_call',
                symbol: 'NFLX',
                event_date: '2025-11-18',
              },
            ],
          },
        },
      ],
    }

    const directory: UserDirectoryMap = {
      5: {
        id: 5,
        fullName: 'Jordan Alvarez',
        email: 'jordan@example.com',
        roleLabel: 'Primary Analyst',
      },
      6: {
        id: 6,
        fullName: 'Priya Malhotra',
        email: 'priya@example.com',
        roleLabel: 'Lead Investor',
      },
    }

    const result = mapCalendarEventsResponse(response, directory)
    expect(result.publicEvents).toHaveLength(1)
    expect(result.publicEvents[0].company).toBe('NFLX')
    expect(result.publicEvents[0].type).toBe('earnings')

    expect(result.internalMeetings).toHaveLength(1)
    expect(result.internalMeetings[0].analyst).toBe('Jordan Alvarez')
    expect(result.internalMeetings[0].title).toBe('IC Review')

    expect(result.fieldResearchTrips).toHaveLength(1)
    expect(result.fieldResearchTrips[0].analyst).toBe('Priya Malhotra')
    expect(result.fieldResearchTrips[0].companies).toBe(3)
  })

  it('formats date ranges for events', () => {
    expect(formatDateTimeRange('2025-11-10T15:00:00Z', '2025-11-10T16:00:00Z', false)).toMatch(
      /Nov/
    )
    expect(formatDateTimeRange('2025-11-10T00:00:00Z', '2025-11-12T00:00:00Z', true)).toContain(
      'Nov'
    )
  })
})
