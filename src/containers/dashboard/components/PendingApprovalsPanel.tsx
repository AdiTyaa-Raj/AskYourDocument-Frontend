import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Check } from 'lucide-react'
import { formatTickerWithExchange } from '@/lib/utils'
import type { PendingReviewItem } from '../lib/types'

type PendingApprovalsPanelProps = {
  title: string
  items: PendingReviewItem[]
  errorMessage?: string
}

export function PendingApprovalsPanel({ title, items, errorMessage }: PendingApprovalsPanelProps) {
  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground text-sm font-semibold">{title}</CardTitle>
          <Badge variant="outline" className="text-[11px]">
            {items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pt-0 pb-2">
        <TooltipProvider>
          <ScrollArea className="h-[260px]">
            <div className="space-y-2 pr-2">
              {errorMessage ? (
                <div className="text-muted-foreground flex flex-col items-center gap-1 py-8 text-xs">
                  <Check className="text-muted-foreground/70 h-6 w-6" />
                  <p>{errorMessage}</p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center gap-1 py-8 text-xs">
                  <Check className="text-muted-foreground/70 h-6 w-6" />
                  <p>No pending items</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left text-xs transition-colors hover:border-gray-300"
                  >
                    <span
                      className={`mt-1 h-6 w-1 rounded-full ${
                        item.priority === 'high'
                          ? 'bg-destructive'
                          : item.priority === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-muted-foreground/50'
                      }`}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {formatTickerWithExchange(item.ticker, item.exchange)}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                item.priority === 'high'
                                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                  : item.priority === 'medium'
                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-900'
                                    : 'border-border text-muted-foreground bg-transparent'
                              }`}
                            >
                              {item.approvalLabel}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-[11px]">
                            {item.approvalTooltip}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-foreground line-clamp-2 text-xs font-medium">
                        {item.title}
                      </p>
                      {item.category === 'stage' ? (
                        <p className="text-muted-foreground text-[11px]">
                          {item.fromStage} → {item.toStage}
                        </p>
                      ) : item.category === 'memo' ? (
                        <p className="text-muted-foreground text-[11px] capitalize">
                          {item.memoType ?? 'Memo approval'}
                        </p>
                      ) : null}
                      <div className="text-muted-foreground text-[11px]">
                        <span className="text-foreground font-medium">{item.submittedBy}</span> •{' '}
                        {item.submittedDate}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
