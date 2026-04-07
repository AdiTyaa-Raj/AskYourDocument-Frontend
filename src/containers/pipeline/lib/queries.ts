import { isAxiosError } from 'axios'
import { useQuery } from '@tanstack/react-query'

import {
  pipelineService,
  type PipelineStageCompanyRecordApi,
} from '@/services/api/pipeline.service'
import type {
  ApprovalRequestApi,
  ApprovalStageConfigSnapshotApi,
} from '@/services/api/approvals.service'
import type {
  PipelineApprovalDecisionMeta,
  PipelineApprovalDecisionStatus,
  PipelineCard,
  PipelineStageApiShape,
  PipelineStageInfo,
  PipelineStatus,
  PipelineTimelineQueryOptions,
  TimelineEntry,
} from './types'
import { calculateDaysInStage, formatStageName } from './helpers'
import { normaliseAttachmentRequirements } from '@/lib/attachments'
import { resolveCompanyExchange } from '@/lib/resolveCompanyExchange'
import { formatDate } from '@/lib/date-utils'

const EXCLUDED_BOARD_STAGES = ['UNIVERSE', 'WATCHLIST', 'INVESTED']
function normaliseStage(apiStage: PipelineStageApiShape): PipelineStageInfo {
  const allowedNext =
    apiStage.allowedNext ??
    apiStage.allowed_next ??
    (typeof apiStage.meta === 'object' && apiStage.meta
      ? ((apiStage.meta as Record<string, unknown>).allowed_next as string[] | undefined)
      : undefined) ??
    []

  return {
    slug: apiStage.slug,
    name: apiStage.name ?? formatStageName({ slug: apiStage.slug }),
    order: apiStage.order,
    allowedNext,
    meta: apiStage.meta ?? null,
  }
}

function extractRequiredRoles(config?: ApprovalStageConfigSnapshotApi): string[] | undefined {
  if (!config) return undefined
  if (Array.isArray(config.required_roles) && config.required_roles.length > 0) {
    return config.required_roles
  }
  if (Array.isArray(config.levels)) {
    const roles = config.levels.flatMap((level) => level.required_roles ?? [])
    return roles.length ? roles : undefined
  }
  return undefined
}

function extractDecisionMetaFromApproval(
  approval?: ApprovalRequestApi
): PipelineApprovalDecisionMeta | undefined {
  if (!approval) return undefined
  const payload = approval.payload as Record<string, unknown> | null | undefined
  const payloadDecidedBy =
    payload && typeof payload.decided_by_user_id !== 'undefined'
      ? payload.decided_by_user_id
      : undefined
  const payloadComment =
    payload &&
    typeof payload.decision_rationale === 'string' &&
    payload.decision_rationale.trim().length
      ? (payload.decision_rationale as string).trim()
      : undefined

  const decidedByRaw = approval.decided_by_user_id ?? payloadDecidedBy
  const decidedBy =
    typeof decidedByRaw === 'number'
      ? decidedByRaw
      : typeof decidedByRaw === 'string'
        ? Number(decidedByRaw)
        : undefined
  const decidedAt =
    typeof approval.decided_at === 'string' && approval.decided_at.length
      ? approval.decided_at
      : typeof payload?.decided_at === 'string' && payload.decided_at.length
        ? (payload.decided_at as string)
        : undefined
  const comment =
    typeof approval.decision_rationale === 'string' && approval.decision_rationale.trim().length
      ? approval.decision_rationale.trim()
      : payloadComment

  return {
    status: approval.status as PipelineApprovalDecisionStatus,
    comment,
    decidedAt,
    decidedByUserId: Number.isFinite(decidedBy) ? decidedBy : undefined,
  }
}

function deriveStatusFromApproval(
  approval?: ApprovalRequestApi,
  targetStageName?: string
): { status: PipelineStatus; label: string; description?: string } {
  if (!approval) {
    return { status: 'on-track', label: 'On track' }
  }

  const prettyStage = targetStageName ?? 'next stage'
  switch (approval.status) {
    case 'pending':
      return {
        status: 'pending',
        label: 'Pending approval',
        description: `Awaiting approval for ${prettyStage}.`,
      }
    case 'in_progress':
      return {
        status: 'in-review',
        label: 'In review',
        description: `Approval in progress for ${prettyStage}.`,
      }
    case 'rejected':
      return {
        status: 'rejected',
        label: 'Rejected',
        description: 'Review feedback and resubmit.',
      }
    case 'approved':
      return {
        status: 'approved',
        label: 'Approved',
        description: `Approved to move to ${prettyStage}.`,
      }
    default:
      return { status: 'unknown', label: 'Unknown status' }
  }
}

function extractRequesterName(payload?: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const source = payload as Record<string, unknown>
  const raw = source['requested_by_name']
  if (typeof raw === 'string' && raw.trim().length) {
    return raw.trim()
  }
  return undefined
}

const getAnalystNameFromList = (value: unknown): string | null => {
  if (!Array.isArray(value)) return null
  const firstEntry = value.find((item) => item && typeof item === 'object') as
    | Record<string, unknown>
    | undefined
  if (!firstEntry) return null
  const fullName =
    typeof firstEntry.full_name === 'string' && firstEntry.full_name.trim().length
      ? firstEntry.full_name.trim()
      : undefined
  const preferred =
    typeof firstEntry.preferred_username === 'string' && firstEntry.preferred_username.trim().length
      ? firstEntry.preferred_username.trim()
      : undefined
  const email =
    typeof firstEntry.email === 'string' && firstEntry.email.trim().length
      ? firstEntry.email.trim()
      : undefined
  const role =
    typeof firstEntry.role === 'string' && firstEntry.role.trim().length
      ? firstEntry.role.trim()
      : undefined
  return fullName ?? preferred ?? email ?? role ?? null
}

export function mapCompanyRecordToCard(
  record: PipelineStageCompanyRecordApi,
  stageMap: Record<string, PipelineStageInfo>
): PipelineCard {
  const company = record.Company
  const assignment = record.StageAssignment ?? null
  const stage = record.Stage ?? null
  const approvalEntries = Array.isArray(record.current_approval_request)
    ? [...record.current_approval_request]
    : []
  approvalEntries.sort((a, b) => {
    const timeA = typeof a?.created_at === 'string' ? Date.parse(a.created_at) || 0 : 0
    const timeB = typeof b?.created_at === 'string' ? Date.parse(b.created_at) || 0 : 0
    if (timeA !== timeB) {
      return timeB - timeA
    }
    return (b?.id ?? 0) - (a?.id ?? 0)
  })
  const approval =
    approvalEntries.find(
      (entry) => entry?.status === 'pending' || entry?.status === 'in_progress'
    ) ??
    approvalEntries.find(
      (entry) => entry?.status === 'rejected' && entry?.payload?.from_stage === stage?.slug
    ) ??
    undefined

  const companyMeta = (company.meta ?? {}) as Record<string, unknown>
  const assignmentMeta = (assignment?.meta ?? {}) as Record<string, unknown>
  const stageAssignmentMeta = assignmentMeta
  const analystAssignments = (assignmentMeta['analyst_assignments'] ?? {}) as Record<
    string,
    Record<string, unknown> | null
  >
  const primaryAnalystFromList = getAnalystNameFromList(assignmentMeta['primary_analyst'])
  const secondaryAnalystFromList = getAnalystNameFromList(assignmentMeta['secondary_analyst'])

  const primaryAnalyst =
    primaryAnalystFromList ??
    (typeof analystAssignments.primary?.full_name === 'string'
      ? analystAssignments.primary.full_name
      : ((companyMeta['primary_analyst'] as string | undefined) ??
        (companyMeta['platform'] as string | undefined) ??
        (typeof assignmentMeta['primary_analyst'] === 'string'
          ? (assignmentMeta['primary_analyst'] as string)
          : undefined) ??
        null))

  const secondaryAnalyst =
    secondaryAnalystFromList ??
    (typeof analystAssignments.secondary?.full_name === 'string'
      ? analystAssignments.secondary.full_name
      : ((companyMeta['secondary_analyst'] as string | undefined) ??
        (typeof assignmentMeta['secondary_analyst'] === 'string'
          ? (assignmentMeta['secondary_analyst'] as string)
          : undefined) ??
        null))

  const stageSlugFromMeta =
    typeof companyMeta['stage_slug'] === 'string' ? (companyMeta['stage_slug'] as string) : null
  const fallbackStageSlug = stage?.slug ?? stageSlugFromMeta ?? 'UNKNOWN_STAGE'
  const baseStageInfo = stageMap[fallbackStageSlug] ?? {
    slug: fallbackStageSlug,
    name: formatStageName({ slug: fallbackStageSlug, name: stage?.name }),
  }

  const approvalTargetStage = approval?.payload?.to_stage
  const targetStageInfo =
    (approvalTargetStage && stageMap[approvalTargetStage]) ??
    (approvalTargetStage
      ? { slug: approvalTargetStage, name: formatStageName({ slug: approvalTargetStage }) }
      : undefined)

  const decisionMeta = extractDecisionMetaFromApproval(approval)
  const approvalSummary = approval
    ? {
        id: approval.id,
        status: approval.status,
        toStage: approvalTargetStage ?? '',
        fromStage: approval?.payload?.from_stage,
        rationale: approval?.payload?.rationale,
        submittedAt: approval?.created_at ?? '',
        requestedBy: approval?.requester_user_id,
        requestedByName: extractRequesterName(approval?.payload),
        requiredRoles: extractRequiredRoles(
          approval.approval_config_snapshot?.stages?.[approvalTargetStage ?? '']
        ),
        requiredAttachments: normaliseAttachmentRequirements(
          approval.approval_config_snapshot?.stages?.[approvalTargetStage ?? '']?.required_documents
        ),
        rationaleRequired:
          approval.approval_config_snapshot?.stages?.[approvalTargetStage ?? '']
            ?.rationale_required,
        payload: approval?.payload ?? null,
        decisionMeta,
      }
    : undefined

  const { status, label, description } = deriveStatusFromApproval(
    approval,
    targetStageInfo ? targetStageInfo.name : undefined
  )

  const daysInStage = calculateDaysInStage(assignment?.updated_at ?? null)

  const exchange = resolveCompanyExchange(company)

  return {
    id: company.id,
    ticker: company.ticker,
    exchange,
    company: company.name,
    analysts: {
      primary: primaryAnalyst,
      secondary: secondaryAnalyst,
    },
    daysInStage: typeof daysInStage === 'number' ? daysInStage : 0,
    status,
    statusLabel: label,
    statusDescription: description,
    stageSlug: baseStageInfo.slug,
    currentApproval: approvalSummary,
    meta: {
      ...companyMeta,
      stage_assignment_meta: stageAssignmentMeta,
      stage_assignment_updated_at: assignment?.updated_at ?? null,
      stage_assignment_effective_date: assignment?.effective_date ?? null,
      stage_assignment_created_at: assignment?.created_at ?? null,
    },
  }
}

export function usePipelineBoardQuery() {
  return useQuery({
    queryKey: ['pipeline', 'board'],
    queryFn: async () => {
      const stagesResponse = await pipelineService.getStages()
      const stageEntries = Object.values(stagesResponse).map(normaliseStage)

      stageEntries.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

      stageEntries.forEach((stage, index) => {
        if (!stage.allowedNext || stage.allowedNext.length === 0) {
          const currentOrder = stage.order ?? index
          const nextStage = stageEntries
            .slice(index + 1)
            .find((candidate, candidateIndex) => (candidate.order ?? candidateIndex) > currentOrder)
          stage.allowedNext = nextStage ? [nextStage.slug] : []
        }
      })

      const stageMap = stageEntries.reduce<Record<string, PipelineStageInfo>>((acc, stage) => {
        acc[stage.slug] = stage
        return acc
      }, {})

      const boardStages = stageEntries.filter(
        (stage) => !EXCLUDED_BOARD_STAGES.includes(stage.slug)
      )

      return { stages: stageEntries, boardStages, stageMap }
    },
  })
}

export const __pipelineTestHelpers = {
  normaliseStage,
  extractRequiredRoles,
  deriveStatusFromApproval,
  mapCompanyRecordToCard,
  formatApprover,
} as const

function formatApprover(value?: string | number | null) {
  if (!value && value !== 0) return 'System'
  return typeof value === 'number' || /^\d+$/.test(String(value)) ? `User ${value}` : String(value)
}

export function usePipelineTimelineQuery(options?: PipelineTimelineQueryOptions) {
  return useQuery({
    queryKey: ['pipeline', 'timeline'],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const response = await pipelineService.getTimeline({ limit: 50 }).catch((error) => {
        if (isAxiosError(error) && error.response?.status === 404) {
          return { count: 0, results: [] }
        }
        throw error
      })
      const entriesWithDates = response.results.flatMap((item) => {
        const logs = item.all_logs ?? []
        return logs.map((log) => {
          const timestamp = log.created_at ? new Date(log.created_at) : null
          const fromStage = log.changed_from_stage
            ? formatStageName({ slug: log.changed_from_stage })
            : 'Unknown'
          const toStage = log.to_stage ? formatStageName({ slug: log.to_stage }) : 'Unknown'
          const exchange =
            typeof item.exchange === 'string' && item.exchange.trim().length > 0
              ? item.exchange.trim()
              : undefined

          const entry: TimelineEntry & { _timestamp: number } = {
            date: timestamp ? timestamp.toISOString() : '',
            ticker: item.ticker,
            company: item.ticker,
            exchange,
            stageChange: `${fromStage} → ${toStage}`,
            fromStage: fromStage,
            toStage: toStage,
            approver: formatApprover(log.changed_by),
            rationale: log.change_reason?.trim() || 'No rationale provided.',
            eventType: 'stage_change',
            timestamp: log.created_at,
            _timestamp: timestamp ? timestamp.getTime() : 0,
          }
          return entry
        })
      })

      entriesWithDates.sort((a, b) => b._timestamp - a._timestamp)

      const entries: TimelineEntry[] = entriesWithDates.map((entry) => ({
        date: formatDate(entry.date),
        ticker: entry.ticker,
        company: entry.company,
        exchange: entry.exchange,
        stageChange: entry.stageChange,
        fromStage: entry.fromStage,
        toStage: entry.toStage,
        approver: entry.approver,
        rationale: entry.rationale,
        eventType: entry.eventType,
        timestamp: entry.timestamp,
      }))

      return { entries, raw: response }
    },
  })
}
