'use client'

import { useMemo } from 'react'
import { RecentActivityPanel } from './components/RecentActivityPanel'
import { EventsGrid } from './components/EventsGrid'
import { PendingApprovalsPanel } from './components/PendingApprovalsPanel'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { useRecentActivity, useMyPendingApprovals, useDashboardEvents } from './lib/queries'

export function DashboardContainer() {
  const recentActivityQuery = useRecentActivity()
  const myPendingApprovalsQuery = useMyPendingApprovals()
  const eventsQuery = useDashboardEvents()

  const activityFeed = recentActivityQuery.data ?? []
  const publicEvents = eventsQuery.data?.publicEvents ?? []
  const internalMeetings = eventsQuery.data?.internalMeetings ?? []
  const fieldResearchTrips = eventsQuery.data?.fieldResearchTrips ?? []
  const visiblePendingItems = useMemo(
    () => myPendingApprovalsQuery.data ?? [],
    [myPendingApprovalsQuery.data]
  )

  if (recentActivityQuery.isLoading || eventsQuery.isLoading || myPendingApprovalsQuery.isLoading) {
    return <DashboardSkeleton />
  }

  const pendingTitle = 'Pending Your Approval'

  const eventsError = eventsQuery.isError ? 'Unable to load calendar events.' : undefined
  const activityError = recentActivityQuery.isError ? 'Unable to load recent activity.' : undefined
  const pendingError = myPendingApprovalsQuery.isError ? 'Unable to load approvals.' : undefined

  return (
    <div className="grid gap-4 lg:grid-cols-6">
      <div className="space-y-4 lg:col-span-4">
        <RecentActivityPanel activities={activityFeed} errorMessage={activityError} />
        <EventsGrid
          publicEvents={publicEvents}
          internalMeetings={internalMeetings}
          fieldResearchTrips={fieldResearchTrips}
          errorMessage={eventsError}
        />
      </div>
      <div className="space-y-4 lg:col-span-2">
        <PendingApprovalsPanel
          title={pendingTitle}
          items={visiblePendingItems}
          errorMessage={pendingError}
        />
      </div>
    </div>
  )
}
