import Link from 'next/link'
import { ListTodo } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'
import { formatTickerWithExchange } from '@/lib/utils'
import type { ActivityItem } from '../lib/types'

type RecentActivityPanelProps = {
  activities: ActivityItem[]
  errorMessage?: string
}

export function RecentActivityPanel({ activities, errorMessage }: RecentActivityPanelProps) {
  const showEmptyState = !errorMessage && activities.length === 0

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="py-2">
        <CardTitle className="text-muted-foreground text-sm font-semibold">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-2">
        <ScrollArea className="h-[280px]">
          {errorMessage ? (
            <div className="text-muted-foreground flex h-[200px] items-center justify-center text-xs">
              {errorMessage}
            </div>
          ) : showEmptyState ? (
            <div className="text-muted-foreground flex h-[200px] items-center justify-center text-xs">
              No recent activity yet.
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {activities.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="flex gap-2">
                    <InitialsAvatar
                      name={item.analyst ?? ''}
                      title={item.analyst ? item.analyst : 'Activity'}
                      className="bg-muted h-7 w-7 text-[10px]"
                      textClassName="text-[10px]"
                      fallbackIcon={<ListTodo className="h-3.5 w-3.5" />}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-[11px]">
                        {item.analyst ? <span className="font-medium">{item.analyst}</span> : null}
                        {item.analyst ? ' ' : null}
                        {item.actionUrl ? (
                          <Link
                            href={item.actionUrl}
                            className="hover:text-sky-700 hover:underline"
                          >
                            {item.action}
                          </Link>
                        ) : (
                          <span>{item.action}</span>
                        )}
                      </p>
                      <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
                        {item.company ? (
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                            {formatTickerWithExchange(item.company, item.exchange)}
                          </Badge>
                        ) : null}
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
