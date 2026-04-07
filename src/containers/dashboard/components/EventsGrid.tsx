import { Calendar, Users, MapPin, Info } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { FieldResearchTrip, InternalMeeting, PublicEvent } from '../lib/types'

type EventsGridProps = {
  publicEvents: PublicEvent[]
  internalMeetings: InternalMeeting[]
  fieldResearchTrips: FieldResearchTrip[]
  errorMessage?: string
}

export function EventsGrid({
  publicEvents,
  internalMeetings,
  fieldResearchTrips,
  errorMessage,
}: EventsGridProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <EventCard
        title="Public Events"
        items={publicEvents}
        icon={Calendar}
        errorMessage={errorMessage}
        emptyMessage="No upcoming public events."
        renderItem={(event) => (
          <div className="space-y-0.5">
            <p className="text-foreground text-xs">
              <span className="font-medium">{event.company}</span> — {event.title}
            </p>
            <p className="text-muted-foreground text-[11px]">{event.date}</p>
          </div>
        )}
      />
      <EventCard
        title="Internal Meetings"
        items={internalMeetings}
        icon={Users}
        errorMessage={errorMessage}
        emptyMessage="No internal meetings scheduled."
        renderItem={(meeting) => (
          <div className="space-y-0.5">
            <p className="text-foreground text-xs font-medium">{meeting.title}</p>
            <p className="text-muted-foreground text-[11px]">{meeting.time}</p>
            <p className="text-muted-foreground text-[11px]">Hosted by {meeting.analyst}</p>
          </div>
        )}
      />
      <EventCard
        title="Field Research Trips"
        items={fieldResearchTrips}
        icon={MapPin}
        errorMessage={errorMessage}
        emptyMessage="No field research planned."
        renderItem={(trip) => (
          <div className="space-y-0.5">
            <p className="text-foreground text-xs">
              <span className="font-medium">{trip.analyst}</span>: {trip.location}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {trip.dates} • {trip.companies} companies
            </p>
          </div>
        )}
      />
    </div>
  )
}

type EventCardProps<T> = {
  title: string
  items: T[]
  icon: typeof Calendar
  renderItem: (item: T) => React.ReactNode
  errorMessage?: string
  emptyMessage: string
}

function EventCard<T>({
  title,
  items,
  icon: Icon,
  renderItem,
  errorMessage,
  emptyMessage,
}: EventCardProps<T>) {
  const showEmpty = !errorMessage && items.length === 0

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="py-2">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
          <Icon className="text-muted-foreground/80 h-3.5 w-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0 pb-2">
        <ScrollArea className="h-[260px]">
          {errorMessage ? (
            <div className="text-muted-foreground flex h-[200px] items-center justify-center gap-2 text-xs">
              <Info className="h-4 w-4" />
              {errorMessage}
            </div>
          ) : showEmpty ? (
            <div className="text-muted-foreground flex h-[200px] items-center justify-center text-xs">
              {emptyMessage}
            </div>
          ) : (
            <div className="space-y-2 pr-2 text-xs">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="border-b border-gray-100 pb-2 text-left last:border-b-0 last:pb-0"
                >
                  {renderItem(item)}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
