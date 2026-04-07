'use client'

import { useState, useMemo } from 'react'
import { CalendarDays, Search, Filter, ArrowRight, Clock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'

import type { FilterEventType, FilterPeriod, PipelineTimelineProps } from '../lib/types'
import { formatTickerWithExchange } from '@/lib/utils'

export function PipelineTimeline({ entries, isLoading = false }: PipelineTimelineProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [period, setPeriod] = useState<FilterPeriod>('30d')
  const [eventType, setEventType] = useState<FilterEventType>('all')

  const filteredEntries = useMemo(() => {
    let filtered = entries

    // Filter by search term (ticker or company name)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((entry) => entry.company.toLowerCase().includes(term))
    }

    // Filter by period (if we had timestamps, we'd filter here)
    // Filter by event type (would need status field from backend)
    // TODO: Implement when backend provides event status/type

    return filtered
  }, [entries, searchTerm])

  return (
    <Card className="border-border/60 border shadow-sm">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4" />
              Pipeline Audit Trail
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Complete history of all stage transitions and approvals
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs font-medium">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'event' : 'events'}
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by ticker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={(value) => setPeriod(value as FilterPeriod)}>
              <SelectTrigger className="w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={eventType}
              onValueChange={(value) => setEventType(value as FilterEventType)}
            >
              <SelectTrigger className="w-32 text-sm">
                <Filter className="mr-2 h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pt-0">
        {isLoading ? (
          <div className="space-y-0 px-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`timeline-skeleton-${index}`}
                className="border-border/40 flex gap-4 border-b py-6 last:border-b-0"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-muted h-10 w-10 animate-pulse rounded-full" />
                  {index < 4 && <div className="bg-muted/40 h-full w-px" />}
                </div>
                <div className="flex-1 space-y-3 pt-1">
                  <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-48 animate-pulse rounded" />
                  <div className="bg-muted/70 h-3 w-full max-w-md animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <CalendarDays className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
            <p className="text-sm font-medium">No timeline activity</p>
            <p className="text-xs">
              {searchTerm ? 'Try a different search term' : 'Pipeline events will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-0 px-6">
            {filteredEntries.map((entry, index) => {
              const isLastEntry = index === filteredEntries.length - 1
              const showConnector = !isLastEntry

              // Determine event type from stage change
              const isApproved = entry.stageChange.includes('→')
              const eventColor = isApproved
                ? 'text-green-600 bg-green-50'
                : 'text-gray-600 bg-gray-100'
              const dotColor = isApproved ? 'bg-green-500' : 'bg-gray-400'
              const lineColor = showConnector ? 'bg-border/40' : 'bg-transparent'

              return (
                <div key={`${entry.company}-${index}`} className="flex gap-4 py-6 first:pt-0">
                  {/* Timeline Visual */}
                  <div className="relative flex flex-col items-center gap-2">
                    {/* Event Dot */}
                    <div
                      className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-4 border-white ${eventColor} shadow-sm`}
                    >
                      <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                    </div>
                    {/* Connecting Line */}
                    {showConnector && <div className={`h-full w-px flex-1 ${lineColor}`} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3 pt-1">
                    {/* Header Row */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        {/* Date & Time */}
                        <div className="flex items-center gap-2">
                          <Clock className="text-muted-foreground h-3 w-3" />
                          <span className="text-muted-foreground text-xs font-medium">
                            {entry.date}
                          </span>
                        </div>
                        {/* Ticker + exchange */}
                        <h4 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatTickerWithExchange(
                              entry.ticker ?? entry.company,
                              entry.exchange
                            )}
                          </Badge>
                        </h4>
                      </div>
                    </div>

                    {/* Stage Change */}
                    <div className="bg-muted/30 border-border/60 flex items-center gap-3 rounded-lg border px-4 py-3">
                      <div className="flex flex-1 items-center gap-2 text-sm">
                        <span className="text-muted-foreground font-medium">
                          {entry.stageChange.split('→')[0]?.trim()}
                        </span>
                        <ArrowRight className="text-primary h-4 w-4" />
                        <span className="text-foreground font-semibold">
                          {entry.stageChange.split('→')[1]?.trim()}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-xs text-green-700"
                      >
                        Approved
                      </Badge>
                    </div>

                    {/* Approver & Rationale */}
                    <div className="space-y-2">
                      {/* Approver */}
                      <div className="flex items-center gap-2">
                        <InitialsAvatar name={entry.approver} className="h-6 w-6" />
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground">Approved by</span>
                          <span className="text-foreground font-medium">{entry.approver}</span>
                        </div>
                      </div>

                      {/* Rationale */}
                      {entry.rationale && entry.rationale !== 'No rationale provided.' && (
                        <div className="bg-muted/20 border-border/40 rounded-md border border-dashed px-3 py-2">
                          <p className="text-muted-foreground text-xs leading-relaxed italic">
                            &ldquo;{entry.rationale}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
