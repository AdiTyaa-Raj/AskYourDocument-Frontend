'use client'

import { useMemo } from 'react'
import { Clock, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import InitialsAvatar from '@/components/shared/InitialsAvatar'
import { CardSkeleton } from '@/components/shared/LoadingFallbacks'
import type {
  ApprovalFilter,
  AnyApprovalRequest,
  PendingApprovalsListProps,
  StageApprovalRequest,
  MemoApprovalRequest,
} from '../lib/types'
import {
  formatApprovalCreatedAt,
  getApprovalStatusBadgeClassNames,
  getChangeSummary,
  getPendingDaysBadgeClassNames,
  getPendingDaysTone,
  getStatusLabel,
} from '../lib/helpers'
import { ApprovalChangeSummaryLine } from './ApprovalChangeSummary'
import { formatTickerWithExchange } from '@/lib/utils'

function cardShellClass(isSelected: boolean, variant: 'my' | 'logs') {
  const radius = variant === 'logs' ? 'rounded-xl' : 'rounded-md'
  return [
    'w-full border p-3 text-left transition-colors',
    radius,
    isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400',
  ].join(' ')
}

function getApprovalHeaderLines(approval: AnyApprovalRequest) {
  if (approval.kind === 'stage') {
    const s = approval as StageApprovalRequest
    return {
      primary: formatTickerWithExchange(s.ticker, s.overview.exchange),
      secondary: s.company,
    }
  }
  const m = approval as MemoApprovalRequest
  const companyLine =
    m.companies.length === 0
      ? m.templateLabel
      : m.companies.length === 1
        ? m.companies[0].name
        : `${m.companies[0].name} +${m.companies.length - 1} more`
  return { primary: m.title, secondary: companyLine }
}

export function PendingApprovalsList({
  approvals,
  selectedApprovalId,
  selectedIds,
  filter,
  onFilterChange,
  onSelectApproval,
  onToggleSelection,
  onSelectAll,
  isLoading = false,
}: PendingApprovalsListProps) {
  const filteredApprovals = useMemo(() => approvals, [approvals])

  const actionableIds = useMemo(
    () =>
      filteredApprovals
        .filter((a) => a.canApprove && !a.alreadyApproved && !a.cannotApprove)
        .map((a) => a.id),
    [filteredApprovals]
  )

  const allActionableSelected =
    actionableIds.length > 0 && actionableIds.every((id) => selectedIds.includes(id))

  const listGap = filter === 'all' ? 'space-y-3' : 'space-y-2'

  return (
    <Card className="border-border flex h-full min-h-0 flex-col border bg-white shadow-sm">
      <CardHeader className="border-border/80 flex-shrink-0 border-b pb-2">
        <div className="mt-3">
          <Tabs
            value={filter}
            onValueChange={(value) => onFilterChange(value as ApprovalFilter)}
            className="w-full"
          >
            <TabsList className="bg-muted inline-flex h-10 w-full rounded-2xl p-1">
              <TabsTrigger
                value="my"
                className="flex-1 rounded-2xl border-0 px-3 py-1.5 text-sm font-semibold text-black transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent"
              >
                My Approvals
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="flex-1 rounded-2xl border-0 px-3 py-1.5 text-sm font-semibold text-black transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent"
              >
                Approval Logs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {filter === 'my' && onSelectAll ? (
          <div className="mt-3 flex items-center gap-2 px-0.5">
            <Checkbox
              checked={allActionableSelected}
              disabled={actionableIds.length === 0}
              onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
              onClick={(event) => event.stopPropagation()}
              aria-label="Select all actionable approvals"
            />
            <span className="text-foreground text-sm font-medium">Select All</span>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto px-3 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="border-border/60 text-muted-foreground grid h-full place-items-center rounded-md border border-dashed p-6 text-center text-sm">
            No approvals match this filter.
          </div>
        ) : (
          <div className={listGap}>
            {filteredApprovals.map((approval) => {
              const isSelected = selectedApprovalId === approval.id
              const isChecked = selectedIds.includes(approval.id)
              const isActionable =
                approval.canApprove && !approval.alreadyApproved && !approval.cannotApprove
              const ariaLabel =
                approval.kind === 'stage'
                  ? `Select approval for ${formatTickerWithExchange((approval as StageApprovalRequest).ticker, (approval as StageApprovalRequest).overview.exchange)}`
                  : `Select memo approval for ${approval.title}`
              const isReactivationRequest =
                approval.kind === 'stage' &&
                Boolean((approval as StageApprovalRequest).isReactivationRequest)

              const changeSummary = getChangeSummary(approval)
              const lastUpdateLabel = formatApprovalCreatedAt(approval.submittedAt)

              const { primary: headerTitle, secondary: headerSubtitle } =
                getApprovalHeaderLines(approval)

              if (filter === 'all') {
                const statusUi = getStatusLabel(approval.status)
                return (
                  <div
                    key={approval.id}
                    onClick={() => onSelectApproval(approval)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectApproval(approval)
                      }
                    }}
                    className={cardShellClass(isSelected, 'logs')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-foreground min-w-0 flex-1 text-sm leading-tight font-semibold">
                        {headerTitle}
                      </p>
                      <span
                        className={[
                          'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          getApprovalStatusBadgeClassNames(statusUi.kind),
                        ].join(' ')}
                      >
                        {statusUi.label}
                      </span>
                    </div>
                    {headerSubtitle && headerSubtitle !== headerTitle ? (
                      <p className="text-muted-foreground mt-2 text-xs leading-snug font-normal">
                        {headerSubtitle}
                      </p>
                    ) : null}
                    <div className="text-muted-foreground mt-3 flex items-center gap-1.5 text-[11px]">
                      <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
                      <span>Last update: {lastUpdateLabel}</span>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={approval.id}
                  onClick={() => onSelectApproval(approval)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectApproval(approval)
                    }
                  }}
                  className={cardShellClass(isSelected, 'my')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={isChecked}
                      disabled={!isActionable}
                      onCheckedChange={(checked) =>
                        onToggleSelection(approval.id, Boolean(checked))
                      }
                      onClick={(event) => event.stopPropagation()}
                      aria-label={ariaLabel}
                    />

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm leading-tight font-semibold">
                            {headerTitle}
                          </p>
                          {headerSubtitle && headerSubtitle !== headerTitle ? (
                            <p className="text-muted-foreground mt-0.5 truncate text-xs font-normal">
                              {headerSubtitle}
                            </p>
                          ) : null}
                        </div>

                        <span
                          className={[
                            'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            getPendingDaysBadgeClassNames(getPendingDaysTone(approval.daysPending)),
                          ].join(' ')}
                        >
                          {approval.daysPending}d pending
                        </span>
                      </div>

                      {isReactivationRequest ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-indigo-200 bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-800">
                            Reactivation Request
                          </span>
                        </div>
                      ) : null}

                      <div>
                        {approval.kind === 'memo' ? (
                          <div className="text-muted-foreground flex items-start gap-1.5 text-xs">
                            <FileText className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                            <ApprovalChangeSummaryLine summary={changeSummary} />
                          </div>
                        ) : (
                          <ApprovalChangeSummaryLine summary={changeSummary} />
                        )}
                      </div>

                      <div className="border-border/80 flex items-center gap-2 border-t pt-2">
                        <InitialsAvatar
                          name={approval.requester.name}
                          className="size-6 shrink-0"
                          textClassName="text-[10px]"
                          fixedColor
                        />
                        <span className="text-muted-foreground text-xs leading-tight">
                          Requested by{' '}
                          <span className="text-foreground/90">{approval.requester.name}</span>
                        </span>
                      </div>
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
