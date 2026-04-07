'use client'

import { useCallback } from 'react'
import type { UIEvent } from 'react'
import { Loader2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import InitialsAvatar from '@/components/shared/InitialsAvatar'

import type { StageColumnProps } from '../lib/types'
import { formatStageName, getCardData } from '../lib/helpers'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { formatTickerWithExchange } from '@/lib/utils'
import {
  EARLY_TERMINATED_STAGE_SLUG,
  EXITED_STAGE_SLUG,
  TERMINAL_STAGE_SLUGS,
  WATCHLIST_STAGE_SLUG,
} from '../lib/constants'

export function StageColumn({
  stage,
  cards,
  onCardSelect,
  onViewRequest,
  onReactivate,
  stageState,
  onLoadMore,
}: StageColumnProps) {
  const stageLabel = formatStageName(stage)
  const isTerminalStage = TERMINAL_STAGE_SLUGS.has(stage.slug)
  const isEarlyTerminatedStage = stage.slug === EARLY_TERMINATED_STAGE_SLUG
  const isExitedStage = stage.slug === EXITED_STAGE_SLUG
  const isReaddableStage = isEarlyTerminatedStage || isExitedStage
  const isActionableStage = !isTerminalStage || isReaddableStage
  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!stageState?.hasMore || stageState.isLoading) return
      const target = event.currentTarget
      if (target.scrollHeight - target.scrollTop - target.clientHeight < 120) {
        onLoadMore?.()
      }
    },
    [stageState?.hasMore, stageState?.isLoading, onLoadMore]
  )

  return (
    <div className="w-72 flex-shrink-0">
      <Card className="border-border/60 h-full border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-foreground text-sm font-semibold">{stageLabel}</CardTitle>
            <Badge variant="outline" className="text-xs font-medium">
              {stageState?.total ?? 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3 pt-0">
          <div className="max-h-[600px] space-y-2.5 overflow-y-auto" onScroll={handleScroll}>
            {cards.length === 0 ? (
              stageState?.isLoading ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading companies…
                </div>
              ) : (
                <div className="border-border/70 text-muted-foreground rounded-md border border-dashed py-8 text-center text-xs">
                  No companies yet
                </div>
              )
            ) : (
              cards.map((card) => {
                const {
                  cardBorderClass,
                  statusDotClass,
                  requestedByLabel,
                  tearsheetHref,
                  statusTagConfig,
                  showRequestButton,
                } = getCardData({ card, isEarlyTerminatedStage })

                const StatusTagIcon = statusTagConfig.icon

                const handleCardClick = () => {
                  if (!isActionableStage) return

                  if (
                    isReaddableStage &&
                    onReactivate &&
                    (showRequestButton || card.status === 'rejected')
                  ) {
                    onReactivate(card, stage)
                    return
                  }

                  if (!showRequestButton && card.currentApproval) {
                    onViewRequest?.(card)
                    return
                  }

                  onCardSelect(card, stage, isReaddableStage ? WATCHLIST_STAGE_SLUG : undefined)
                }

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={handleCardClick}
                    className={`${cardBorderClass} focus:ring-primary min-h-[130px] w-full cursor-pointer rounded-xl border p-3 text-left shadow-sm transition-all hover:bg-gray-100 hover:shadow-md focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:cursor-default disabled:opacity-70`}
                    disabled={!isActionableStage}
                    aria-label={`Open ${card.company} request details`}
                  >
                    <div className="flex h-full flex-col justify-between gap-4">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {tearsheetHref ? (
                            <Link
                              href={tearsheetHref}
                              prefetch={false}
                              className="group block max-w-[70%]"
                              aria-label={`Open ${card.company} tearsheet`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="truncate text-[15px] leading-4 font-normal text-slate-950 transition-colors group-hover:text-blue-600 group-hover:underline">
                                {formatTickerWithExchange(card.ticker, card.exchange)}
                              </p>
                              <p className="text-muted-foreground mt-1 truncate text-[13px] font-normal transition-colors group-hover:text-blue-600 group-hover:underline">
                                {card.company}
                              </p>
                            </Link>
                          ) : (
                            <div>
                              <p className="text-foreground text-sm font-semibold">
                                {formatTickerWithExchange(card.ticker, card.exchange)}
                              </p>
                              <p className="text-muted-foreground text-xs">{card.company}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 rounded-lg border px-1 py-1">
                          <span className="text-[10px] font-light text-slate-900">
                            {card.daysInStage}d
                          </span>
                          <span className={`inline-flex h-2 w-2 rounded-full ${statusDotClass}`} />
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-5 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-medium ${statusTagConfig.className}`}
                        >
                          <StatusTagIcon className="h-3.5 w-3.5" />
                          {statusTagConfig.label}
                        </span>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block cursor-pointer">
                                <InitialsAvatar
                                  name={requestedByLabel}
                                  className="size-6"
                                  textClassName="text-[10px]"
                                  fixedColor={true}
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md"
                            >
                              {requestedByLabel}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          {stageState?.error ? (
            <div className="text-destructive text-center text-xs">{stageState.error}</div>
          ) : null}
          {stageState?.hasMore ? (
            <div className="flex items-center justify-center py-2">
              {stageState.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading more…
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => onLoadMore?.()}>
                  Load more
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
