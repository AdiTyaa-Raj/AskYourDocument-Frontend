import type {
  ApprovalCompanyOverview,
  ApprovalDecisionResponse,
  ApprovalDecisionSummary,
  OverviewRowProps,
  AnyApprovalRequest,
  StageApprovalRequest,
  MemoApprovalRequest,
  ApprovalWorkflowLineStatus,
  ApprovalWorkflowSectionView,
  ApprovalWorkflowLineView,
} from './types'

import { Table2, FileText } from 'lucide-react'
import { formatTickerWithExchange } from '@/lib/utils'

export function getPendingBadgeVariant(daysPending: number) {
  if (daysPending > 5) return 'destructive'
  if (daysPending > 2) return 'secondary'
  return 'outline'
}

/** Elapsed pending time for My Approvals list (matches existing urgency thresholds). */
export function getPendingDaysTone(daysPending: number): 'urgent' | 'muted' | 'default' {
  if (daysPending > 5) return 'urgent'
  if (daysPending > 2) return 'muted'
  return 'default'
}

export type ApprovalStatusUiKind = 'approved' | 'pending' | 'rejected' | 'in_progress'

export function getStatusLabel(status?: string | null): {
  label: string
  kind: ApprovalStatusUiKind
} {
  const raw = (status ?? 'pending').toLowerCase().trim()
  if (raw === 'approved') return { label: 'Approved', kind: 'approved' }
  if (raw === 'rejected') return { label: 'Rejected', kind: 'rejected' }
  if (raw === 'in_progress') return { label: 'In progress', kind: 'in_progress' }
  return { label: 'Pending', kind: 'pending' }
}

export function getApprovalStatusBadgeClassNames(kind: ApprovalStatusUiKind): string {
  switch (kind) {
    case 'approved':
      return 'border border-emerald-500/35 bg-emerald-50 text-emerald-800'
    case 'rejected':
      return 'border border-red-200 bg-red-50 text-red-700'
    case 'pending':
    case 'in_progress':
      return 'border border-amber-200 bg-amber-50 text-amber-900'
    default:
      return 'border border-gray-200 bg-white text-gray-800'
  }
}

export function getPendingDaysBadgeClassNames(tone: 'urgent' | 'muted' | 'default'): string {
  switch (tone) {
    case 'urgent':
      return 'border-transparent bg-red-500 text-white'
    case 'muted':
      return 'border-transparent bg-muted text-muted-foreground'
    default:
      return 'border-transparent bg-muted text-foreground/80'
  }
}

const APPROVAL_CREATED_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

export function formatApprovalCreatedAt(iso?: string | null): string {
  if (!iso) return '—'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-US', APPROVAL_CREATED_FORMAT)
}

export function hasMeaningfulAnalystTransition(t?: { from?: string; to?: string }): boolean {
  const to = t?.to?.trim()
  if (!to) return false
  const from = t?.from?.trim()
  if (!from) return true
  return from !== to
}

export type ChangeSummaryResult =
  | {
      kind: 'stage'
      from: string
      to: string
    }
  | {
      kind: 'analyst'
      role: 'primary' | 'secondary' | 'both'
      from?: string
      to: string
    }
  | {
      kind: 'memo'
      title: string
      templateLabel: string
      companyLine: string
    }

/**
 * Compact, payload-driven summary for list cards and detail subtitles.
 * When both primary and secondary change, label “Both Analysts” with primary old→new in the value.
 */
export function getChangeSummary(approval: AnyApprovalRequest): ChangeSummaryResult {
  if (approval.kind === 'memo') {
    const m = approval as MemoApprovalRequest
    const companyLine =
      m.companies.length === 0
        ? 'No companies'
        : m.companies.length === 1
          ? `${formatTickerWithExchange(m.companies[0].ticker, m.companies[0].exchange)} — ${m.companies[0].name}`
          : `${formatTickerWithExchange(m.companies[0].ticker, m.companies[0].exchange)} +${m.companies.length - 1} more`
    return {
      kind: 'memo',
      title: m.title,
      templateLabel: m.templateLabel,
      companyLine,
    }
  }

  const stage = approval as StageApprovalRequest
  if (stage.stageApprovalAction === 'analyst_reassign' && stage.analystChange) {
    const { primary, secondary } = stage.analystChange
    const primaryChanged = hasMeaningfulAnalystTransition(primary)
    const secondaryChanged = hasMeaningfulAnalystTransition(secondary)

    if (primaryChanged && secondaryChanged) {
      return {
        kind: 'analyst',
        role: 'both',
        from: primary?.from,
        to: primary?.to?.trim() ?? '—',
      }
    }
    if (primaryChanged && !secondaryChanged) {
      return {
        kind: 'analyst',
        role: 'primary',
        from: primary?.from,
        to: primary?.to?.trim() ?? '—',
      }
    }
    if (!primaryChanged && secondaryChanged) {
      return {
        kind: 'analyst',
        role: 'secondary',
        from: secondary?.from,
        to: secondary?.to?.trim() ?? '—',
      }
    }
  }

  return {
    kind: 'stage',
    from: stage.fromStage || '—',
    to: stage.toStage || '—',
  }
}

export function getStageChangeTypeLabel(approval: StageApprovalRequest): string {
  if (approval.stageApprovalAction !== 'analyst_reassign' || !approval.analystChange) {
    return 'Stage Change'
  }
  const { primary, secondary } = approval.analystChange
  const primaryChanged = hasMeaningfulAnalystTransition(primary)
  const secondaryChanged = hasMeaningfulAnalystTransition(secondary)
  if (primaryChanged && secondaryChanged) return 'Both Analysts'
  if (primaryChanged) return 'Primary Analyst'
  if (secondaryChanged) return 'Secondary Analyst'
  return ''
}

/** Blue pill label in detail “Change Request Details” (analyst reassign only; stage_change has no card). */
export function getApprovalRequestTypePillLabel(approval: StageApprovalRequest): string {
  const { primary, secondary } = approval.analystChange ?? {}
  const primaryChanged = hasMeaningfulAnalystTransition(primary)
  const secondaryChanged = hasMeaningfulAnalystTransition(secondary)
  if (primaryChanged && secondaryChanged) return 'Both Analysts Change'
  if (primaryChanged) return 'Primary Analyst Change'
  if (secondaryChanged) return 'Secondary Analyst Change'
  return ''
}

export function getEntityChangeCategoryLabel(approval: AnyApprovalRequest): string {
  if (approval.kind === 'memo') return 'Memo'
  const stage = approval as StageApprovalRequest
  if (stage.stageApprovalAction === 'analyst_reassign') return '--'
  return 'Stage Change'
}

export function workflowLineStatusLabel(status: ApprovalWorkflowLineStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'pending':
      return 'Pending'
    case 'auto-approved':
      return 'Auto Approved'
    case 'upcoming':
      return 'Upcoming'
    default:
      return status
  }
}

/** Matches formatted labels like "Lead Investor" or raw `arnie-lead-investor` slugs. */
export function isLeadInvestorRoleLabel(role?: string | null): boolean {
  if (!role?.trim()) return false
  const n = role.toLowerCase().replace(/[_-]+/g, ' ')
  return n.includes('lead investor') || (n.includes('lead') && n.includes('investor'))
}

/** Requester is treated as lead investor (role or email-style username). */
export function isLeadInvestorRequester(approval: StageApprovalRequest): boolean {
  if (isLeadInvestorRoleLabel(approval.requester.role)) return true
  const nm = (approval.requester.name ?? '').toLowerCase()
  return nm.includes('lead_investor') || nm.includes('lead-investor')
}

/**
 * Lead investor submitted the request and the workflow step is also lead investor —
 * single merged row with auto-approved UI (no duplicate requester + approver cards).
 */
export function isAutoApproved(approval: StageApprovalRequest): boolean {
  if (!isLeadInvestorRequester(approval)) return false
  const sections = approval.workflowSections
  if (!sections?.length) return false
  return sections.some((section) =>
    section.lines.some((line) => isLeadInvestorRoleLabel(line.roleLabel))
  )
}

function dedupeLeadInvestorLines(lines: ApprovalWorkflowLineView[]): ApprovalWorkflowLineView[] {
  let seenLeadLine = false
  return lines.filter((line) => {
    if (!isLeadInvestorRoleLabel(line.roleLabel)) return true
    if (seenLeadLine) return false
    seenLeadLine = true
    return true
  })
}

/**
 * Marks lead-investor workflow lines as auto-approved and merges display with requester.
 * Call from UI when rendering workflow sections from a stage approval.
 */
export function applyLeadInvestorAutoApprovalWorkflow(
  sections: ApprovalWorkflowSectionView[],
  approval: StageApprovalRequest
): ApprovalWorkflowSectionView[] {
  if (!isAutoApproved(approval)) return sections

  return sections.map((section) => {
    const mapped = section.lines.map((line): ApprovalWorkflowLineView => {
      if (!isLeadInvestorRoleLabel(line.roleLabel)) return line
      return {
        ...line,
        displayName: approval.requester.name?.trim() || line.displayName,
        isRequester: true,
        status: 'auto-approved',
        leadInvestorAutoApproved: true,
      }
    })
    return { ...section, lines: dedupeLeadInvestorLines(mapped) }
  })
}

/** API workflow section `label` for analyst review steps */
export function isAnalystWorkflowSection(section: ApprovalWorkflowSectionView): boolean {
  const raw = section.sectionLabel?.trim().toLowerCase() ?? ''
  if (raw === 'review' || raw === 'analyst') return true
  const title = section.title?.trim().toLowerCase() ?? ''
  return title.includes('analyst')
}

/**
 * `stage_change` only: true when the requester is an assigned analyst — either their id appears as
 * `approver_user.id` on an analyst workflow section line, or they are listed in payload
 * `primary_analyst` / `secondary_analyst` (see `stageChangeAnalystUserIds` on the mapped request).
 */
export function isStageAutoApproved(
  approval: StageApprovalRequest,
  workflowSections?: ApprovalWorkflowSectionView[]
): boolean {
  if (approval.stageApprovalAction !== 'stage_change') return false
  const requesterId = approval.requester.userId
  if (typeof requesterId !== 'number') return false
  const sections = workflowSections ?? approval.workflowSections ?? []

  const matchesAnalystApprover = sections.some(
    (sec) =>
      isAnalystWorkflowSection(sec) &&
      sec.lines.some(
        (line) => typeof line.approverUserId === 'number' && line.approverUserId === requesterId
      )
  )
  if (matchesAnalystApprover) return true

  return approval.stageChangeAnalystUserIds?.includes(requesterId) ?? false
}

/**
 * Collapses analyst workflow sections to a single auto-approved row (no duplicate pending lines).
 * Run after {@link applyLeadInvestorAutoApprovalWorkflow}.
 */
export function applyStageAnalystAutoApprovalWorkflow(
  sections: ApprovalWorkflowSectionView[],
  approval: StageApprovalRequest
): ApprovalWorkflowSectionView[] {
  if (!isStageAutoApproved(approval, sections)) return sections

  return sections.map((section) => {
    if (!isAnalystWorkflowSection(section)) return section
    const first = section.lines[0]
    const synthetic: ApprovalWorkflowLineView = {
      id: `stage-analyst-auto-${section.level}`,
      displayName: approval.requester.name?.trim() || first?.displayName || '—',
      isRequester: true,
      status: 'auto-approved',
      stageAnalystAutoApproved: true,
    }
    return { ...section, lines: [synthetic] }
  })
}

/** Lead-investor and stage-change analyst auto-approval UI (single pipeline for detail + list strip). */
export function applyApprovalWorkflowUiTransforms(
  sections: ApprovalWorkflowSectionView[],
  approval: StageApprovalRequest
): ApprovalWorkflowSectionView[] {
  return applyStageAnalystAutoApprovalWorkflow(
    applyLeadInvestorAutoApprovalWorkflow(sections, approval),
    approval
  )
}

export function formatRoleLabel(role?: string | null): string | undefined {
  if (!role) return undefined
  const cleaned = role.replace(/^arnie[-_]/i, '')
  return cleaned
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function resolveSelectedApprovalId(params: {
  items: Array<{ id: string }>
  currentId: string | null
  initialId?: string | null
  isLoading?: boolean
}): string | null | undefined {
  const { items, currentId, initialId, isLoading } = params

  if (items.length === 0) {
    return isLoading ? undefined : null
  }

  if (currentId) return currentId
  if (initialId) return initialId
  return items[0]?.id ?? null
}

export function buildApprovalsUrl(params: {
  pathname: string
  searchParams: URLSearchParams | string
  filter: 'my' | 'all'
  selectedApprovalId?: string | null
}): string {
  const searchParams =
    typeof params.searchParams === 'string'
      ? new URLSearchParams(params.searchParams)
      : new URLSearchParams(params.searchParams.toString())
  const normalizedFilter = params.filter === 'my' ? 'my' : 'all'

  if (normalizedFilter === 'all') {
    searchParams.set('filter', 'all')
  } else {
    searchParams.delete('filter')
  }

  if (params.selectedApprovalId) {
    searchParams.set('id', params.selectedApprovalId)
    searchParams.delete('approvalId')
  } else {
    searchParams.delete('id')
    searchParams.delete('approvalId')
  }

  const query = searchParams.toString()
  return query ? `${params.pathname}?${query}` : params.pathname
}

export function getApprovalsUrlState(params: {
  pathname: string
  searchParams: URLSearchParams | string
  filter: 'my' | 'all'
  selectedApprovalId?: string | null
}): { nextUrl: string; currentUrl: string } {
  const currentQuery =
    typeof params.searchParams === 'string' ? params.searchParams : params.searchParams.toString()
  const currentUrl = currentQuery ? `${params.pathname}?${currentQuery}` : params.pathname
  const nextUrl = buildApprovalsUrl(params)
  return { currentUrl, nextUrl }
}

export function getOverviewRows(overview: ApprovalCompanyOverview): OverviewRowProps[] {
  return [
    { label: 'Company Name', value: overview.companyName },
    { label: 'Primary Analyst', value: overview.primaryAnalyst },
    { label: 'Secondary Analyst', value: overview.secondaryAnalyst },
    { label: 'Current Stage', value: overview.currentStage },
    { label: 'Last Activity', value: overview.lastActivity },
    { label: 'Exchange', value: overview.exchange },
  ]
}

export function summarizeApprovalDecisionResponse(
  response?: ApprovalDecisionResponse
): ApprovalDecisionSummary {
  const results = response?.results ?? []
  const errors = results
    .map((result) => (typeof result.error === 'string' ? result.error : null))
    .filter((value): value is string => Boolean(value))
  const notes = results
    .map((result) => (typeof result.note === 'string' ? result.note : null))
    .filter((value): value is string => Boolean(value))

  return { errors, notes, results }
}

export const getApprovalHelperText = ({
  alreadyApproved,
  cannotApprove,
  canApprove,
}: {
  alreadyApproved: boolean
  cannotApprove: boolean
  canApprove: boolean
}): string => {
  const messages = [
    {
      condition: alreadyApproved,
      text: 'You already approved this request. Waiting on remaining approvers.',
    },
    { condition: cannotApprove, text: 'Awaiting prior approvers before you can take action.' },
    { condition: !canApprove, text: 'You’re not an approver on this request.' },
  ]

  // Return the first matching condition, or default message
  const match = messages.find((m) => m.condition)
  return match ? match.text : 'Review all documents before approving.'
}

export function documentListIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ext === 'xlsx' || ext === 'xls' || ext === 'csv' ? Table2 : FileText
}
