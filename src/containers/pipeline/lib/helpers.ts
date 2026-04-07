import {
  CardData,
  PipelineBoardData,
  PipelineCard,
  PipelineStageInfo,
  PipelineStatus,
} from './types'
import { AlertTriangle, CircleX, Clock3, Eye, Hourglass, type LucideIcon } from 'lucide-react'

export const STATUS_COLOR_MAP: Record<PipelineStatus, string> = {
  'on-track': 'bg-emerald-500',
  pending: 'bg-amber-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-destructive',
  'in-review': 'bg-blue-500',
  unknown: 'bg-slate-400',
}

export const getInitials = (name: string) =>
  name
    .split(' ')
    .map((segment) => segment[0])
    .join('')
    .toUpperCase()

const cardMatchesAnalyst = (card: PipelineCard, analyst: string) => {
  if (!analyst.trim() || analyst === 'all') return true
  const target = analyst.trim().toLowerCase()
  const primary = (card.analysts.primary ?? '').toLowerCase()
  const secondary = (card.analysts.secondary ?? '').toLowerCase()
  return primary.includes(target) || secondary.includes(target)
}

export const filterPipelineBoardData = (
  stages: PipelineStageInfo[],
  data: PipelineBoardData,
  analyst: string
): PipelineBoardData => {
  return stages.reduce<PipelineBoardData>((acc, stage) => {
    const cards = data[stage.slug] ?? []
    acc[stage.slug] = cards.filter((card) => cardMatchesAnalyst(card, analyst))
    return acc
  }, {})
}

export const formatStageName = (
  stage: PipelineStageInfo | { slug: string; name?: string }
): string => {
  if (stage.name) return stage.name
  return stage.slug
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export const getNextStageName = (
  stage: PipelineStageInfo,
  stageMap: Record<string, PipelineStageInfo>
): string => {
  const nextSlug = stage.allowedNext?.[0]
  if (nextSlug && stageMap[nextSlug]) {
    return formatStageName(stageMap[nextSlug])
  }
  return formatStageName(stage)
}

export const calculateDaysInStage = (startDate?: string | null): number => {
  if (!startDate) return 0
  const parsed = new Date(startDate)
  if (Number.isNaN(parsed.getTime())) {
    return 0
  }
  const diff = Date.now() - parsed.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  return Math.max(0, days)
}
/** Message type for cross-tab communication when a template is created from stage move or company move modal */
export const TEMPLATE_CREATED_MESSAGE = 'template-created'

export const TEMPLATE_PATH_RULES: Array<{ match: RegExp; path: string }> = [
  { match: /SCREEN/, path: '/research-updates/template/screen' },
  {
    match: /(GOING_IN_VALUE_CREATION_PLAN|GOING_IN_VALUATION)/,
    path: '/research-updates/template/vcp-screen',
  },
  { match: /INVESTMENT_MEMO/, path: '/research-updates/template/investment-memo' },
]

/** Resolve a stage requirement token (e.g. SCREEN, GOING_IN_VALUATION) to the template creation path. */
export function resolveTemplatePath(token?: string): string {
  if (!token) return '/research-updates'
  const upper = token.toUpperCase()
  const matched = TEMPLATE_PATH_RULES.find((rule) => rule.match.test(upper))
  return matched?.path ?? '/research-updates'
}

export function addItemIfNotExists<T extends { id: string | number }>(
  list: T[],
  item?: T | null
): T[] {
  if (!item) return list
  const exists = list.some((i) => i.id === item.id)
  return exists ? list : [item, ...list]
}

export function openTemplateInNewTab(token: string, from: string) {
  const path = resolveTemplatePath(token)
  const url = path + (path.includes('?') ? '&' : '?') + `from=${from}`
  window.open(url, '_blank')
}

export function getStatusTagConfig({
  card,
  isEarlyTerminatedCard,
}: {
  card: PipelineCard
  isEarlyTerminatedCard: boolean
}) {
  const approvalStatus = card.currentApproval?.status

  const statusMap: Record<string, { label: string; icon: LucideIcon; className: string }> = {
    early_terminated: {
      label: 'Early Terminated',
      icon: AlertTriangle,
      className: 'border-red-200 bg-red-50 text-red-700',
    },
    rejected: {
      label: 'Rejected',
      icon: CircleX,
      className: 'border-red-200 bg-red-50 text-red-700',
    },
    in_progress: {
      label: 'In Review',
      icon: Eye,
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    pending: {
      label: 'Pending Approval',
      icon: Hourglass,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    },
    'on-track': {
      label: 'On Track',
      icon: Clock3,
      className: 'border-green-200 bg-green-50 text-green-700',
    },
    default: {
      label: card.statusLabel,
      icon: Clock3,
      className: 'border-gray-200 bg-gray-50 text-gray-700',
    },
  }

  if (isEarlyTerminatedCard) return statusMap.early_terminated

  const key =
    card.status === 'rejected' || approvalStatus === 'rejected'
      ? 'rejected'
      : approvalStatus || card.status

  return statusMap[key] || statusMap.default
}

export function getCardData({
  card,
  isEarlyTerminatedStage,
}: {
  card: PipelineCard
  isEarlyTerminatedStage: boolean
}): CardData {
  const approvalStatus = card.currentApproval?.status
  const isPending = approvalStatus === 'pending'
  const isInReview = approvalStatus === 'in_progress'
  const isRejected = approvalStatus === 'rejected' || card.status === 'rejected'
  const hasActiveRequest = isPending || isInReview
  const showRequestButton = !hasActiveRequest || isRejected

  const isEarlyTerminatedCard = isEarlyTerminatedStage
  const cardBorderClass = 'border-gray-200 bg-white'
  const statusDotClass = isEarlyTerminatedCard ? 'bg-destructive/70' : STATUS_COLOR_MAP[card.status]

  const requestedByLabel =
    card.currentApproval?.requestedByName ??
    card.analysts.primary ??
    card.analysts.secondary ??
    'Unknown'

  const tearsheetHref = card.id != null ? `/tearsheet/${card.id}` : null

  const statusTagConfig = getStatusTagConfig({ card, isEarlyTerminatedCard })

  return {
    cardBorderClass,
    statusDotClass,
    requestedByLabel,
    tearsheetHref,
    statusTagConfig,
    showRequestButton,
  }
}
