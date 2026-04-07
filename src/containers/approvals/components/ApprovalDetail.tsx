'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle,
  Clock,
  FileText,
  Info,
  X,
  Building2,
  CircleAlert,
  History,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import InitialsAvatar from '@/components/shared/InitialsAvatar'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/shared/LoadingFallbacks'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  applyApprovalWorkflowUiTransforms,
  documentListIcon,
  formatRoleLabel,
  getApprovalHelperText,
  getApprovalRequestTypePillLabel,
  getStageChangeTypeLabel,
  getStatusLabel,
  hasMeaningfulAnalystTransition,
  isAutoApproved,
  isStageAutoApproved,
} from '../lib/helpers'
import type {
  ApprovalDetailProps,
  OverviewRowProps,
  StageApprovalRequest,
  MemoApprovalRequest,
  ApprovalDocument,
  ApprovalHistoryEntry,
  ApprovalRequester,
  ApprovalCompanyOverview,
  ApprovalWorkflowLineStatus,
  ApprovalWorkflowLineView,
  ApprovalWorkflowSectionView,
} from '../lib/types'
import { useApprovalCompanyOverview, useApprovalHistoryQuery } from '../lib/queries'
import { cn, formatTickerWithExchange } from '@/lib/utils'

export function ApprovalDetail({
  approval,
  onApprove,
  onReject,
  onViewMemo,
  onOpenDocument,
  isLoading = false,
}: ApprovalDetailProps) {
  if (isLoading && !approval) {
    return <CardSkeleton />
  }

  if (!approval) {
    return (
      <Card className="border-border flex h-full flex-col items-center justify-center border bg-white text-center shadow-sm">
        <CheckCircle className="text-muted-foreground mb-4 size-10" />
        <h3 className="text-foreground mb-1 text-sm font-semibold">No approval selected</h3>
        <p className="text-muted-foreground max-w-xs text-xs">
          Select an approval from the list to view details and take action.
        </p>
      </Card>
    )
  }

  if (approval.kind === 'stage') {
    return (
      <StageApprovalDetail
        key={approval.id}
        approval={approval}
        onApprove={onApprove}
        onReject={onReject}
        onOpenDocument={onOpenDocument}
      />
    )
  }

  return (
    <MemoApprovalDetail
      key={approval.id}
      approval={approval}
      onApprove={onApprove}
      onReject={onReject}
      onViewMemo={onViewMemo}
      onOpenDocument={onOpenDocument}
    />
  )
}

function StageApprovalDetail({
  approval,
  onApprove,
  onReject,
  onOpenDocument,
}: {
  approval: StageApprovalRequest
  onApprove: () => void
  onReject: () => void
  onOpenDocument?: (doc: ApprovalDocument) => void
}) {
  const [openSections, setOpenSections] = useState<string[]>([])
  const isOverviewOpen = openSections.includes('overview')
  const isHistoryOpen = openSections.includes('history')

  useEffect(() => {
    setOpenSections([])
  }, [approval.id])

  const overviewQuery = useApprovalCompanyOverview(approval.ticker, {
    enabled: isOverviewOpen,
    entityId: approval.entity_id,
  })
  const historyQuery = useApprovalHistoryQuery(approval.ticker, {
    enabled: isHistoryOpen,
  })
  const isOverviewLoading = isOverviewOpen && (overviewQuery.isLoading || overviewQuery.isFetching)
  const isHistoryLoading = isHistoryOpen && (historyQuery.isLoading || historyQuery.isFetching)

  const overview = useMemo(
    () => ({
      companyName: overviewQuery.data?.companyName ?? approval.overview.companyName,
      primaryAnalyst: overviewQuery.data?.primaryAnalyst ?? approval.overview.primaryAnalyst,
      secondaryAnalyst: overviewQuery.data?.secondaryAnalyst ?? approval.overview.secondaryAnalyst,
      currentStage: overviewQuery.data?.currentStage ?? approval.overview.currentStage,
      lastActivity: overviewQuery.data?.lastActivity ?? approval.overview.lastActivity,
      exchange: overviewQuery.data?.exchange ?? approval.overview.exchange,
    }),
    [approval.overview, overviewQuery.data]
  )

  const tickerDisplay = useMemo(
    () => formatTickerWithExchange(approval.ticker, overview.exchange),
    [approval.ticker, overview.exchange]
  )

  const historyEntries = historyQuery.data ?? []
  const historyEmptyLabel = historyQuery.isError
    ? 'Unable to load approval history.'
    : `No prior approval decisions recorded for ${tickerDisplay}.`

  const workflowSections = useMemo(
    () => approval.workflowSections ?? [],
    [approval.workflowSections]
  )
  const workflowSectionsForUi = useMemo(
    () => applyApprovalWorkflowUiTransforms(workflowSections, approval),
    [workflowSections, approval]
  )
  const hasRequesterTagOnWorkflowLine = workflowSections.some((section) =>
    section.lines.some((line) => line.isRequester)
  )
  const leadInvestorAutoScenario = isAutoApproved(approval)
  const stageAnalystAutoScenario = isStageAutoApproved(approval, workflowSections)
  const showRequesterInWorkflow =
    approval.stageApprovalAction === 'stage_change' &&
    !hasRequesterTagOnWorkflowLine &&
    !leadInvestorAutoScenario &&
    !stageAnalystAutoScenario

  const statusUi = getStatusLabel(approval.status)
  const headerStatusLabel =
    statusUi.kind === 'pending' || statusUi.kind === 'in_progress'
      ? `${approval.daysPending} days pending`
      : statusUi.label
  const detailCategory = getStageChangeTypeLabel(approval)
  const isStageChange = approval.stageApprovalAction === 'stage_change'

  const tickerCompanyRow = (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {approval.entity_id ? (
        <Link
          href={`/tearsheet/${approval.entity_id}`}
          prefetch={false}
          className="text-xl font-bold tracking-tight text-slate-900 transition-colors hover:text-blue-600 hover:underline"
          aria-label={`Open ${tickerDisplay} tearsheet`}
        >
          {tickerDisplay}
        </Link>
      ) : (
        <span className="text-xl font-bold tracking-tight text-slate-900">{tickerDisplay}</span>
      )}
      {approval.company && approval.company !== approval.ticker ? (
        <span className="text-muted-foreground text-sm leading-snug font-normal">
          {approval.company}
        </span>
      ) : null}
    </div>
  )

  const stageTransitionRow = (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex max-w-full rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium break-words text-gray-800">
        {approval.fromStage}
      </span>
      <ArrowRight className="text-muted-foreground size-4 shrink-0" strokeWidth={2} aria-hidden />
      {approval.entity_id ? (
        <Link
          href={`/tearsheet/${approval.entity_id}`}
          prefetch={false}
          className="inline-flex max-w-full rounded-md bg-blue-50 px-2.5 py-1 text-sm font-semibold break-words text-blue-800 underline-offset-2 hover:bg-blue-100/80 hover:underline"
        >
          {approval.toStage}
        </Link>
      ) : (
        <span className="inline-flex max-w-full rounded-md bg-blue-50 px-2.5 py-1 text-sm font-semibold break-words text-blue-800">
          {approval.toStage}
        </span>
      )}
    </div>
  )

  return (
    <Card className="border-border flex h-full flex-col rounded-xl border bg-white shadow-md">
      <CardHeader className="border-border/80 flex-shrink-0 border-b px-5 pt-5 pb-4">
        {isStageChange ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              {tickerCompanyRow}
              <span className="inline-flex shrink-0 items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-900">
                {headerStatusLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              {stageTransitionRow}
              <span className="text-muted-foreground shrink-0 text-xs font-normal">
                ID: {approval.id}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              {tickerCompanyRow}
              <p className="text-sm leading-snug font-medium text-slate-900">{detailCategory}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
              <span className="inline-flex items-center rounded-full border border-gray-200/80 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-900">
                {headerStatusLabel}
              </span>
              <span className="text-muted-foreground text-xs font-normal">ID: {approval.id}</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="mb-4 min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        {' '}
        {approval.isReactivationRequest ? (
          <div className="flex items-start gap-3 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-indigo-900">
            <Building2 className="mt-0.5 size-4 flex-shrink-0 text-indigo-600" />
            <div>
              <p className="font-semibold">Reactivation request</p>
              <p className="text-xs">
                This company was previously terminated. Approving restores it to the Watchlist.
              </p>
            </div>
          </div>
        ) : null}
        <RequestedBy requester={approval.requester} />
        {approval.stageApprovalAction === 'analyst_reassign' ? (
          <ChangeRequestDetailsCard approval={approval} />
        ) : null}
        {approval.stageApprovalAction === 'stage_change' ? (
          <>
            <RationaleSection rationale={approval.rationale} />
            <DocumentsSection documents={approval.documents} onOpenDocument={onOpenDocument} />
          </>
        ) : null}
        {workflowSections.length ? (
          <WorkflowSectionsPanel
            sections={workflowSectionsForUi}
            showRequesterRow={showRequesterInWorkflow}
            requester={showRequesterInWorkflow ? approval.requester : undefined}
          />
        ) : (
          <ApprovalFlow
            roles={approval.requiredRoles}
            state={{
              canApprove: approval.canApprove,
              alreadyApproved: approval.alreadyApproved,
              cannotApprove: approval.cannotApprove,
            }}
            requesterRow={showRequesterInWorkflow ? approval.requester : undefined}
          />
        )}
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-3"
        >
          <AccordionItem
            value="history"
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <AccordionTrigger className="flex items-center border border-gray-50 bg-gray-50 px-4 py-3 text-sm font-semibold hover:bg-gray-100 hover:no-underline">
              <span className="text-foreground flex items-center gap-2 text-[15px] font-bold">
                <History className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
                Approval History
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-t border-gray-200 px-6 pt-5 pb-5">
              <HistorySection
                history={historyEntries}
                isLoading={Boolean(isHistoryLoading)}
                emptyLabel={historyEmptyLabel}
                ticker={tickerDisplay}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="overview"
            className="overflow-hidden rounded-lg border border-gray-200 bg-white last:border-b last:border-gray-200"
          >
            <AccordionTrigger className="flex items-center border border-gray-50 bg-gray-50 px-4 py-3 text-sm font-semibold hover:bg-gray-100 hover:no-underline">
              <span className="text-foreground flex items-center gap-2 text-[15px] font-bold">
                Company Overview
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-t border-gray-200 px-6 pt-5 pb-5">
              {isOverviewLoading ? (
                <div className="text-muted-foreground rounded-md border border-dashed border-gray-200 p-3 text-xs">
                  Loading overview…
                </div>
              ) : overviewQuery.isError ? (
                <div className="text-muted-foreground rounded-md border border-dashed border-gray-200 p-3 text-xs">
                  Unable to load company overview.
                </div>
              ) : (
                <CompanyOverviewPanel overview={overview} />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      <ActionFooter
        canApprove={approval.canApprove}
        alreadyApproved={approval.alreadyApproved}
        cannotApprove={approval.cannotApprove}
        onApprove={onApprove}
        onReject={onReject}
      />
    </Card>
  )
}

function MemoApprovalDetail({
  approval,
  onApprove,
  onReject,
  onViewMemo,
  onOpenDocument,
}: {
  approval: MemoApprovalRequest
  onApprove: () => void
  onReject: () => void
  onViewMemo?: (memoId: number) => void
  onOpenDocument?: (doc: ApprovalDocument) => void
}) {
  const [openSections, setOpenSections] = useState<string[]>([])
  const isHistoryOpen = openSections.includes('history')
  const historyQuery = useApprovalHistoryQuery(undefined, { enabled: false })
  const historyEntries = historyQuery.data ?? []

  const primaryCompany = approval.companies[0]
  const handleTitleClick = () => {
    if (onViewMemo && approval.memoId > 0) {
      onViewMemo(approval.memoId)
    }
  }

  useEffect(() => {
    setOpenSections([])
  }, [approval.id])

  return (
    <Card className="border-border flex h-full flex-col rounded-xl border bg-white shadow-md">
      <CardHeader className="border-border/80 flex-shrink-0 border-b px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <CardTitle
              className={`text-foreground text-xl font-bold tracking-tight break-words ${
                onViewMemo && approval.memoId > 0
                  ? 'cursor-pointer transition-colors hover:text-blue-600 hover:underline'
                  : ''
              }`}
              onClick={handleTitleClick}
            >
              {approval.title}
            </CardTitle>
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <FileText className="h-6 w-6 text-blue-600" strokeWidth={1.75} />
              </div>

              <div className="min-w-0">
                <span className="block text-lg font-medium text-slate-700">
                  {approval.templateLabel}
                </span>

                {primaryCompany ? (
                  <span className="block text-sm text-slate-500">
                    {formatTickerWithExchange(primaryCompany.ticker, primaryCompany.exchange)}{' '}
                    {approval.companies.length > 1
                      ? `+${approval.companies.length - 1} more`
                      : `— ${primaryCompany.name}`}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
            <span className="inline-flex items-center rounded-full border border-gray-200/80 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-900">
              {approval.daysPending}d pending
            </span>
            <span className="text-muted-foreground text-xs font-normal">ID: {approval.id}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <RequestedBy requester={approval.requester} />

        <section className="space-y-2">
          <h4 className="text-muted-foreground text-sm font-medium">Companies</h4>
          {approval.companies.length === 0 ? (
            <div className="border-border/70 text-muted-foreground rounded-md border border-dashed p-3 text-xs">
              No companies were associated with this memo.
            </div>
          ) : (
            <div className="grid gap-2">
              {approval.companies.map((company) => (
                <div
                  key={`${approval.id}-${company.id}`}
                  className="border-border/60 flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px]">
                      {formatTickerWithExchange(company.ticker, company.exchange)}
                    </Badge>
                    <span className="text-foreground font-medium">{company.name}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="size-3.5" />
                    <span>ID: {company.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <RationaleSection rationale={approval.rationale} />
        <DocumentsSection documents={approval.documents} onOpenDocument={onOpenDocument} />

        <section className="space-y-2">
          <h4 className="text-muted-foreground text-sm font-medium">Memo Details</h4>
          <div className="border-border/80 grid gap-3 rounded-md border bg-white p-3 shadow-sm sm:grid-cols-2">
            <OverviewRow
              label="Memo ID"
              value={approval.memoId > 0 ? `#${approval.memoId}` : '—'}
            />
            <OverviewRow
              label="Revision Count"
              value={
                typeof approval.revisionCount === 'number' ? String(approval.revisionCount) : '—'
              }
            />
            <OverviewRow
              label="Status"
              value={approval.status ? approval.status.replace(/_/g, ' ') : 'Pending'}
            />
            <OverviewRow
              label="Submitted"
              value={approval.submittedAt ? new Date(approval.submittedAt).toLocaleString() : '—'}
            />
          </div>
        </section>

        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-3"
        >
          <AccordionItem
            value="history"
            className="overflow-hidden rounded-lg border border-gray-200 bg-white last:border-b last:border-gray-200"
          >
            <AccordionTrigger className="flex items-center px-4 py-3 text-sm font-semibold hover:bg-gray-50/80 hover:no-underline">
              <span className="text-foreground flex items-center gap-2 text-[15px] font-bold">
                <Clock className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
                Approval History
              </span>
            </AccordionTrigger>
            <AccordionContent className="border-t border-gray-200 px-6 pt-5 pb-5">
              <HistorySection
                history={historyEntries}
                isLoading={Boolean(isHistoryOpen && historyQuery.isLoading)}
                emptyLabel={`No prior approval decisions recorded for “${approval.title}”.`}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      <ActionFooter
        canApprove={approval.canApprove}
        alreadyApproved={approval.alreadyApproved}
        cannotApprove={approval.cannotApprove}
        onApprove={onApprove}
        onReject={onReject}
      />
    </Card>
  )
}

function ChangeRequestDetailRow({
  label,
  value,
  valueEmphasis,
}: {
  label: string
  value: string
  valueEmphasis?: 'to'
}) {
  return (
    <div className="flex items-start justify-between gap-6 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={cn(
          'text-foreground min-w-0 flex-1 text-right',
          valueEmphasis === 'to' && 'font-semibold'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function ChangeRequestAnalystSection({
  title,
  transition,
  showBottomBorder,
}: {
  title: string
  transition: { from?: string; to?: string }
  showBottomBorder: boolean
}) {
  const from = transition.from?.trim() || '—'
  const to = transition.to?.trim() ?? '—'
  return (
    <div className={cn('space-y-3 px-4 py-3.5', showBottomBorder && 'border-b border-gray-200')}>
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <ChangeRequestDetailRow label="From" value={from} />
      <ChangeRequestDetailRow label="To" value={to} valueEmphasis="to" />
    </div>
  )
}

function ChangeRequestDetailsCard({ approval }: { approval: StageApprovalRequest }) {
  const pill = getApprovalRequestTypePillLabel(approval)
  const primaryOk = hasMeaningfulAnalystTransition(approval.analystChange?.primary)
  const secondaryOk = hasMeaningfulAnalystTransition(approval.analystChange?.secondary)

  return (
    <section className="space-y-2">
      <h4 className="text-foreground text-sm font-bold">Change Request Details</h4>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3.5">
          <span className="text-foreground text-sm font-normal">Request Type</span>
          <Badge
            variant="secondary"
            className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-50"
          >
            {pill}
          </Badge>
        </div>

        <>
          {primaryOk ? (
            <ChangeRequestAnalystSection
              title="Primary Analyst"
              transition={approval.analystChange!.primary!}
              showBottomBorder={secondaryOk}
            />
          ) : null}
          {secondaryOk ? (
            <ChangeRequestAnalystSection
              title="Secondary Analyst"
              transition={approval.analystChange!.secondary!}
              showBottomBorder={false}
            />
          ) : null}
          {!primaryOk && !secondaryOk ? (
            <div className="px-4 py-3.5">
              <p className="text-muted-foreground text-xs">
                No analyst transition details were included in the payload.
              </p>
            </div>
          ) : null}
        </>
      </div>
    </section>
  )
}

function RequestedBy({ requester }: { requester: ApprovalRequester }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-3">
        <InitialsAvatar
          name={requester.name}
          className="size-10 shrink-0"
          textClassName="text-sm font-semibold"
        />
        <div className="min-w-0">
          <div className="text-foreground text-sm font-semibold break-words">
            Requested by {requester.name}
          </div>
          {requester.role ? (
            <div className="text-muted-foreground mt-0.5 text-xs break-words">{requester.role}</div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function RationaleSection({ rationale }: { rationale: string }) {
  return (
    <section className="space-y-3">
      <h4 className="text-foreground text-sm font-bold">Rationale</h4>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-foreground text-sm leading-relaxed font-normal break-words whitespace-pre-wrap">
          {rationale || 'No rationale provided.'}
        </p>
      </div>
    </section>
  )
}

function DocumentsSection({
  documents,
  onOpenDocument,
}: {
  documents: ApprovalDocument[]
  onOpenDocument?: (doc: ApprovalDocument) => void
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-foreground text-sm font-bold">Supporting Documents</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {documents.length === 0 ? (
          <div className="text-muted-foreground col-span-full rounded-md border border-dashed border-gray-200 p-3 text-xs">
            No documents provided.
          </div>
        ) : (
          documents.map((doc) => {
            const idValue =
              typeof doc.id === 'number' || typeof doc.id === 'string' ? String(doc.id) : null
            const canOpenInline = Boolean(onOpenDocument && idValue)
            const Icon = documentListIcon(doc.name)
            const content = (
              <div className="flex items-center gap-2">
                <Icon className="size-5 shrink-0 text-blue-600" strokeWidth={1.75} aria-hidden />
                <span className="text-left text-sm font-medium break-words">{doc.name}</span>
              </div>
            )
            const baseClasses =
              'flex w-full min-h-[52px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors'

            return canOpenInline ? (
              <button
                key={`${doc.name}-${doc.id ?? 'link'}`}
                type="button"
                onClick={() => onOpenDocument?.(doc)}
                className={`${baseClasses} hover:border-gray-300 hover:bg-gray-50/80`}
              >
                {content}
              </button>
            ) : (
              <div key={`${doc.name}-${doc.id ?? 'static'}`} className={baseClasses}>
                {content}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function HistorySection({
  history,
  isLoading,
  emptyLabel,
  ticker,
}: {
  history: ApprovalHistoryEntry[]
  isLoading: boolean
  emptyLabel: string
  ticker?: string
}) {
  const subject = ticker ?? ''

  return (
    <section>
      {isLoading ? (
        <div className="text-muted-foreground rounded-md border border-dashed border-gray-200 p-3 text-xs">
          Loading history…
        </div>
      ) : history.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed border-gray-200 p-3 text-xs">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => {
            const decisionLower = entry.decision.toLowerCase()
            const decisionColor =
              {
                approved: 'text-[#166534]',
                rejected: 'text-red-600',
              }[decisionLower] || 'text-blue-600'

            const symbol = subject || entry.ticker || entry.company

            return (
              <div key={entry.id} className="flex items-start gap-3">
                <Clock
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />

                <div className="min-w-0">
                  <p className="text-foreground text-sm leading-snug font-medium break-words">
                    <span>{entry.approver}</span>{' '}
                    <span className={decisionColor}>{entry.decision}</span>{' '}
                    {symbol && <span>{symbol}</span>}{' '}
                    <span className="text-muted-foreground font-normal">on {entry.date}</span>
                  </p>

                  {entry.comment && (
                    <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed break-words">
                      {entry.comment}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function ActionFooter({
  canApprove,
  alreadyApproved,
  cannotApprove,
  onApprove,
  onReject,
}: {
  canApprove: boolean
  alreadyApproved?: boolean
  cannotApprove?: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const readyForAction = canApprove && !alreadyApproved && !cannotApprove

  if (!readyForAction) return null

  const helperText = getApprovalHelperText({
    alreadyApproved: Boolean(alreadyApproved),
    cannotApprove: Boolean(cannotApprove),
    canApprove,
  })

  return (
    <div className="border-border/80 flex flex-shrink-0 flex-col border-t bg-white px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground text-sm font-normal">{helperText}</span>
        <div className="flex shrink-0 gap-3">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={!readyForAction}
            className="h-10 rounded-md border border-red-300 bg-white text-sm font-medium text-red-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700"
          >
            <X className="mr-2 size-4" strokeWidth={2} />
            Reject
          </Button>
          <Button
            className="h-10 rounded-md bg-slate-900 text-sm font-medium text-white hover:bg-slate-900/90"
            onClick={onApprove}
            disabled={!readyForAction}
          >
            <Check className="mr-2 size-4" strokeWidth={2.5} />
            Approve
          </Button>
        </div>
      </div>
    </div>
  )
}

function OverviewRow({ label, value }: OverviewRowProps) {
  return (
    <div className="border-border/60 flex items-center justify-between border-b py-1 text-xs last:border-b-0">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{value ?? '—'}</span>
    </div>
  )
}

function CompanyOverviewPanel({ overview }: { overview: ApprovalCompanyOverview }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 sm:gap-y-0">
      <div className="flex min-w-0 flex-col gap-3">
        <CompanyOverviewRow label="Company Name" value={overview.companyName} />
        <CompanyOverviewRow label="Exchange" value={overview.exchange} />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <CompanyOverviewRow label="Primary Analyst" value={overview.primaryAnalyst} />
        <CompanyOverviewRow label="Secondary Analyst" value={overview.secondaryAnalyst} />
        <CompanyOverviewRow label="Last Activity" value={overview.lastActivity} />
      </div>
    </div>
  )
}

function CompanyOverviewRow({ label, value }: { label: string; value?: string }) {
  const display = value != null && String(value).trim() !== '' ? String(value) : '—'
  return (
    <div className="flex min-w-0 items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0 text-sm font-normal">{label}</span>
      <span className="text-foreground ml-2 min-w-0 flex-1 text-right text-sm font-semibold break-words">
        {display}
      </span>
    </div>
  )
}

function RequesterTag() {
  return (
    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
      Requester
    </span>
  )
}

/** Shown in Approval Workflow for stage_change when API lines have no approver_user match for requester. */
function WorkflowRequesterRow({ requester }: { requester: ApprovalRequester }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <InitialsAvatar
          name={requester.name}
          className="size-8 shrink-0"
          textClassName="text-xs font-semibold"
          fixedColor
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground text-sm font-semibold break-words">
              {requester.name}
            </span>
            <RequesterTag />
          </div>
          {requester.role ? (
            <p className="text-muted-foreground mt-0.5 text-xs break-words">{requester.role}</p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-xs">—</p>
          )}
        </div>
      </div>
    </section>
  )
}

function WorkflowStatusPill({ status }: { status: ApprovalWorkflowLineStatus }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        <Check className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
        Approved
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        Rejected
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
      <Clock className="size-3 shrink-0" strokeWidth={2} aria-hidden />
      Pending
    </span>
  )
}

function WorkflowLineRow({ line }: { line: ApprovalWorkflowLineView }) {
  const showRoleLine =
    Boolean(line.roleLabel?.trim()) &&
    !line.leadInvestorAutoApproved &&
    !line.stageAnalystAutoApproved
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <InitialsAvatar
          name={line.displayName}
          className="size-8 shrink-0"
          textClassName="text-xs font-semibold"
          fixedColor
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground text-sm font-semibold break-words">
              {line.displayName}
            </span>
            {line.isRequester ? <RequesterTag /> : null}
          </div>
          {line.leadInvestorAutoApproved ? (
            <p className="text-muted-foreground mt-1 text-xs leading-snug">Lead Investor</p>
          ) : line.stageAnalystAutoApproved ? (
            <p className="text-muted-foreground mt-1 text-xs leading-snug">—</p>
          ) : showRoleLine ? (
            <p className="text-muted-foreground mt-0.5 text-xs break-words">
              {line.roleLabel || '—'}
            </p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-xs">—</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WorkflowStatusPill status={line.status} />
          {false && line.status === 'pending' ? (
            <Bell className="text-muted-foreground size-4 shrink-0" aria-hidden />
          ) : null}
        </div>
      </div>
    </section>
  )
}

function WorkflowSectionsPanel({
  sections,
  showRequesterRow,
  requester,
}: {
  sections: ApprovalWorkflowSectionView[]
  showRequesterRow?: boolean
  requester?: ApprovalRequester
}) {
  if (!sections.length) return null
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2">
        <CircleAlert
          className="text-muted-foreground size-4 shrink-0"
          strokeWidth={1.75}
          aria-hidden
        />
        <h4 className="text-foreground text-sm font-bold">Approval Workflow</h4>
      </div>
      <div className="space-y-3">
        {sections.map((section, sIdx) => (
          <Fragment key={section.level}>
            {sIdx > 0 ? <div className="flex justify-center py-3"></div> : null}
            <div>
              <p className="text-muted-foreground mt-2 mb-3 text-[12px] font-semibold tracking-wide">
                {section.title}
              </p>
              <div className="space-y-4">
                {sIdx === 0 && showRequesterRow && requester ? (
                  <WorkflowRequesterRow requester={requester} />
                ) : null}
                {section.lines.map((line) => (
                  <WorkflowLineRow key={line.id} line={line} />
                ))}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  )
}

function ApprovalFlow({
  roles,
  state,
  requesterRow,
}: {
  roles?: string[]
  state: { canApprove: boolean; alreadyApproved?: boolean; cannotApprove?: boolean }
  requesterRow?: ApprovalRequester
}) {
  const hasRoles = roles && roles.length > 0
  if (!hasRoles && !requesterRow) return null
  const formattedRoles = (roles ?? []).map((role) => formatRoleLabel(role) ?? role)

  let statusText = 'You can view this request.'
  if (state.alreadyApproved) {
    statusText = 'You’ve approved. Waiting on remaining approvers.'
  } else if (state.cannotApprove) {
    statusText = 'Waiting for other approvers.'
  } else if (state.canApprove) {
    statusText = 'Your approval is required now.'
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-foreground text-sm font-bold">Approval Workflow</h4>
        <Info className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {requesterRow ? (
          <div className="mb-4 border-b border-gray-100 pb-4">
            <WorkflowRequesterRow requester={requesterRow} />
          </div>
        ) : null}
        {hasRoles ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {formattedRoles.map((role, index) => (
                <Badge
                  key={`${role}-${index}`}
                  variant="outline"
                  className="rounded-full border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                >
                  {role}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-xs font-normal">{statusText}</p>
          </>
        ) : (
          <p className="text-muted-foreground text-xs font-normal">{statusText}</p>
        )}
      </div>
    </section>
  )
}
