'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle } from 'lucide-react'
import type { EventsSectionProps } from '../lib/type'

export function EventsSection({ eventsData }: EventsSectionProps) {
  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-900">Events</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0">
        <Tabs defaultValue="internal">
          <TabsList className="mb-4">
            <TabsTrigger value="internal" className="text-xs">
              Internal
            </TabsTrigger>
            <TabsTrigger value="public" className="text-xs">
              Public
            </TabsTrigger>
            <TabsTrigger value="fieldTrips" className="text-xs">
              Field Trips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internal" className="mt-0">
            <div className="space-y-1">
              {eventsData.internal.map((event, idx) => (
                <div key={idx} className="border-b border-gray-100 py-2 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="text-xs text-gray-900">{event.type}</div>
                      {!event.hasNote && event.daysOverdue && (
                        <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                          <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                          {event.daysOverdue}d
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs whitespace-nowrap text-gray-500">{event.date}</div>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{event.attendees.join(', ')}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="public" className="mt-0">
            <div className="space-y-1">
              {eventsData.public.map((event, idx) => (
                <div key={idx} className="border-b border-gray-100 py-2 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 text-xs text-gray-900">{event.event}</div>
                    <div className="text-xs whitespace-nowrap text-gray-500">{event.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fieldTrips" className="mt-0">
            <div className="space-y-1">
              {eventsData.fieldTrips.map((trip, idx) => (
                <div key={idx} className="border-b border-gray-100 py-2 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="text-xs text-gray-900">{trip.destination}</div>
                      {!trip.hasNote && trip.daysOverdue && (
                        <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                          <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                          {trip.daysOverdue}d
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs whitespace-nowrap text-gray-500">{trip.date}</div>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{trip.attendees.join(', ')}</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
