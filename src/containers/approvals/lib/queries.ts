import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { companiesService } from '@/services/api/companies.service'
import {
  approvalsService,
  type ApprovalListResponseApi,
  type ApprovalHistoryResponseApi,
  type ApprovalHistoryRowApi,
  type ApprovalLineApi as ApprovalLineItemApi,
  type ApprovalUserApi,
  type ApprovalRoleApi,
  type ApprovalRequestApi,
  type ApprovalWorkflowSectionApi,
} from '@/services/api/approvals.service'
import type { ApprovalStageConfigSnapshotApi } from '@/services/api/approvals.service'
import { usersService, type UserDirectoryMap } from '@/services/api/users.service'
import { formatStageName } from '@/containers/pipeline/lib/helpers'

import type {
  ApprovalHistoryEntry,
  ApprovalsQueryOptions,
  ApprovalHistoryQueryOptions,
  CompanyMap,
  ApprovalCompanyOverview,
  AnyApprovalRequest,
  StageApprovalRequest,
  MemoApprovalRequest,
  MemoApprovalCompany,
  ApprovalDocument,
  DecisionMutationInput,
  ApprovalWorkflowLineStatus,
  ApprovalWorkflowLineView,
  ApprovalWorkflowSectionView,
  StageApprovalActionKind,
  AnalystNameTransition,
} from './types'
import { formatRoleLabel } from './helpers'

type ApprovalListRow = ApprovalListResponseApi['results'][number]

type ApprovalGroup = {
  request: ApprovalRequestApi
  lines: ApprovalLineItemApi[]
  user?: ApprovalUserApi | null
  role?: ApprovalRoleApi | null
  canApprove: boolean
  alreadyApproved: boolean
  cannotApprove: boolean
  workflowSectionsRaw?: ApprovalWorkflowSectionApi[]
}

function pickRowRequest(row: ApprovalListRow): ApprovalRequestApi | undefined {
  return row.ApprovalRequest ?? row.request
}

function pickRowLines(row: ApprovalListRow): ApprovalLineItemApi[] {
  const raw = row.ApprovalLine ?? row.lines ?? null
  if (!raw) return []
  return Array.isArray(raw) ? raw.filter(Boolean) : [raw]
}

function pickRowUser(row: ApprovalListRow): ApprovalUserApi | null {
  return row.User ?? row.requester ?? null
}

function formatWorkflowSectionTitle(label: string): string {
  const key = label.trim().toLowerCase().replace(/\s+/g, '_')
  if (key === 'analyst') return 'ANALYSTS REVIEW'
  if (key === 'review') return 'Analyst Review'
  if (key === 'lead') return 'LEAD INVESTOR / PM'
  return label
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word.toUpperCase())
    .join(' ')
}

function deriveWorkflowLineStatus(line: ApprovalLineItemApi): ApprovalWorkflowLineStatus {
  const decision = typeof line.decision === 'string' ? line.decision.toLowerCase() : ''
  if (line.resolved) {
    if (decision === 'approved') return 'approved'
    if (decision === 'rejected') return 'rejected'
  }
  return 'pending'
}

function mapWorkflowSectionsToView(
  sections: ApprovalWorkflowSectionApi[] | undefined,
  requesterUserId: number | undefined,
  formatRoleFn: (role?: ApprovalRoleApi | null) => string | undefined
): ApprovalWorkflowSectionView[] {
  if (!sections?.length) return []
  return [...sections]
    .sort((a, b) => a.level - b.level)
    .map((section) => ({
      level: section.level,
      title: formatWorkflowSectionTitle(section.label),
      sectionLabel: typeof section.label === 'string' ? section.label : undefined,
      lines: [...(section.lines ?? [])]
        .sort((a, b) => (a.order_in_level ?? 0) - (b.order_in_level ?? 0))
        .map((line): ApprovalWorkflowLineView => {
          const uid = line.approver_user?.id
          const fromUser =
            typeof line.approver_user?.full_name === 'string' && line.approver_user.full_name.trim()
              ? line.approver_user.full_name.trim()
              : undefined
          const displayName = fromUser ?? formatRoleFn(line.approver_role) ?? '—'
          const roleLabel = formatRoleFn(line.approver_role)
          return {
            id: String(line.id ?? `L${section.level}-${line.order_in_level ?? 0}`),
            displayName,
            roleLabel,
            approverUserId: typeof uid === 'number' ? uid : undefined,
            isRequester:
              typeof requesterUserId === 'number' &&
              typeof uid === 'number' &&
              uid === requesterUserId,
            status: deriveWorkflowLineStatus(line),
          }
        }),
    }))
}

/** Ids from stage_change payload `primary_analyst` / `secondary_analyst` (numeric or `{ id }`). */
function collectStagePayloadAnalystUserIds(payload: Record<string, unknown>): number[] | undefined {
  const ids: number[] = []
  for (const key of ['primary_analyst', 'secondary_analyst'] as const) {
    const arr = payload[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (typeof item === 'number' && Number.isFinite(item)) {
        ids.push(item)
        continue
      }
      if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'number') {
        const id = (item as { id: number }).id
        if (Number.isFinite(id)) ids.push(id)
      }
    }
  }
  if (!ids.length) return undefined
  return [...new Set(ids)]
}

function calculateDaysSince(dateString?: string): number {
  if (!dateString) return 0
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return 0
  const diff = Date.now() - parsed.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

const HISTORY_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

function formatHistoryDate(value?: string): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-US', HISTORY_DATE_FORMAT)
}

const STAGE_LABEL_OVERRIDES: Record<string, string> = {
  VCP: 'VCP',
}

function formatStage(slug?: string): string {
  if (!slug) return 'Unknown'
  const normalized = slug.toUpperCase()
  if (STAGE_LABEL_OVERRIDES[normalized]) {
    return STAGE_LABEL_OVERRIDES[normalized]
  }
  return slug
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

/** Resolve display name for analyst payload entries (object with id/name, raw id, or analyst_names map). */
function resolveAnalystName(entry: unknown, namesMap?: Record<string, string>): string | undefined {
  if (entry == null) return undefined
  if (typeof entry === 'number' && namesMap) {
    const v = namesMap[String(entry)]
    if (typeof v === 'string' && v.trim().length) return v.trim()
  }
  if (typeof entry === 'string') {
    const trimmed = entry.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (typeof entry === 'object') {
    const o = entry as Record<string, unknown>
    const id = o.id
    if (namesMap && (typeof id === 'number' || typeof id === 'string')) {
      const mapped = namesMap[String(id)]
      if (typeof mapped === 'string' && mapped.trim().length) return mapped.trim()
    }
    for (const key of ['full_name', 'name', 'display_name', 'email', 'username']) {
      const v = o[key]
      if (typeof v === 'string' && v.trim().length) {
        return v.trim()
      }
    }
  }
  return undefined
}

function normalizeAnalystNamesMap(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim().length) out[k] = v.trim()
  }
  return Object.keys(out).length ? out : undefined
}

/** Arrays are [old, new] or a single [new] entry; supports numeric ids via analyst_names. */
function parseAnalystArrayTransition(
  value: unknown,
  namesMap?: Record<string, string>
): AnalystNameTransition {
  if (!Array.isArray(value) || value.length === 0) return {}
  if (value.length === 1) {
    const to = resolveAnalystName(value[0], namesMap)
    return to ? { to } : {}
  }
  const from = resolveAnalystName(value[0], namesMap)
  const to = resolveAnalystName(value[1], namesMap)
  return {
    from: from ?? undefined,
    to: to ?? undefined,
  }
}

/**
 * Backend sends previous_* vs current arrays (objects with id/name), not [old,new] tuples.
 */
function buildAnalystTransitionFromPreviousCurrent(
  payload: Record<string, unknown>,
  previousKey: 'previous_primary_analyst' | 'previous_secondary_analyst',
  currentKey: 'primary_analyst' | 'secondary_analyst',
  namesMap?: Record<string, string>
): AnalystNameTransition {
  const previous = payload[previousKey]
  const current = payload[currentKey]
  const hasPrevious = Array.isArray(previous) && previous.length > 0
  const hasCurrent = Array.isArray(current) && current.length > 0
  if (hasPrevious && hasCurrent) {
    return {
      from: resolveAnalystName(previous[0], namesMap),
      to: resolveAnalystName(current[0], namesMap),
    }
  }
  return parseAnalystArrayTransition(payload[currentKey], namesMap)
}

function resolveStageApprovalActionKind(
  request: ApprovalRequestApi,
  payload: Record<string, unknown>
): StageApprovalActionKind {
  const candidates = [request.action, request.type, payload.action, payload.type]
  for (const c of candidates) {
    if (typeof c !== 'string') continue
    const raw = c.toLowerCase().trim()
    /** Prefer stage_change when both hints exist (stage payloads may include analyst id arrays). */
    if (raw === 'stage_change') return 'stage_change'
    if (raw === 'analyst_reassign') return 'analyst_reassign'
  }

  const hasAnalystArrays =
    (Array.isArray(payload.primary_analyst) && payload.primary_analyst.length > 0) ||
    (Array.isArray(payload.secondary_analyst) && payload.secondary_analyst.length > 0)
  const hasPreviousAnalystArrays =
    (Array.isArray(payload.previous_primary_analyst) &&
      payload.previous_primary_analyst.length > 0) ||
    (Array.isArray(payload.previous_secondary_analyst) &&
      payload.previous_secondary_analyst.length > 0)
  const hasStageFields =
    typeof payload.from_stage === 'string' &&
    payload.from_stage.trim().length > 0 &&
    typeof payload.to_stage === 'string' &&
    payload.to_stage.trim().length > 0

  if (hasPreviousAnalystArrays && !hasStageFields) return 'analyst_reassign'
  if (hasStageFields) return 'stage_change'
  if (hasAnalystArrays && !hasStageFields) return 'analyst_reassign'
  if (hasAnalystArrays) return 'analyst_reassign'
  return 'stage_change'
}

function analystTransitionIsMeaningful(t?: AnalystNameTransition): boolean {
  const to = t?.to?.trim()
  if (!to) return false
  const from = t?.from?.trim()
  if (!from) return true
  return from !== to
}

const OVERVIEW_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

const formatOverviewDate = (value?: string | null) => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toLocaleDateString(undefined, OVERVIEW_DATE_FORMAT)
}

function extractRequiredRoles(stageConfig?: ApprovalStageConfigSnapshotApi): string[] | undefined {
  if (!stageConfig) return undefined

  const directRoles = stageConfig.required_roles
  if (Array.isArray(directRoles)) {
    return directRoles.length ? directRoles : undefined
  }

  const levels = stageConfig.levels
  if (Array.isArray(levels)) {
    const roles = levels.flatMap((level) => level?.required_roles ?? [])
    if (roles.length) return roles
  }

  return undefined
}

function collectRequiredDocuments(requiredDocs?: unknown): string[] | undefined {
  if (!Array.isArray(requiredDocs)) return undefined
  const docs = requiredDocs.filter((doc): doc is string => typeof doc === 'string')
  return docs.length ? docs : undefined
}

function normaliseDocumentEntries(value: unknown, fallbackPrefix: string): ApprovalDocument[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map<ApprovalDocument | null>((entry) => {
        if (typeof entry === 'string' && entry.trim().length > 0) {
          return { name: entry.trim() }
        }
        if (typeof entry === 'number') {
          return { name: `${fallbackPrefix} ${entry}`, id: entry }
        }
        if (entry && typeof entry === 'object') {
          const item = entry as Record<string, unknown>
          const name =
            typeof item.name === 'string' && item.name.trim().length > 0
              ? item.name.trim()
              : typeof item.title === 'string' && item.title.trim().length > 0
                ? item.title.trim()
                : undefined
          if (!name) return null
          const idValue = item.id ?? item.document_id ?? item.memo_id
          const id =
            typeof idValue === 'number' || typeof idValue === 'string' ? idValue : undefined
          return { name, id }
        }
        return null
      })
      .filter((doc): doc is ApprovalDocument => Boolean(doc))
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([name, rawId]) => ({
      name,
      id: typeof rawId === 'number' || typeof rawId === 'string' ? rawId : undefined,
    }))
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [{ name: value.trim() }]
  }
  if (typeof value === 'number') {
    return [{ name: `${fallbackPrefix} ${value}`, id: value }]
  }
  return []
}

function extractApprovalDocuments(raw?: unknown): ApprovalDocument[] {
  return normaliseDocumentEntries(raw, 'Document')
}

const REQUESTER_NAME_KEYS = [
  'requested_by_name',
  'requested_by_full_name',
  'requested_by',
  'requester_name',
  'requester_full_name',
  'submitter_name',
  'submitted_by',
  'submitted_by_name',
]

const REQUESTER_CONTEXT_KEYS = ['requested_by', 'requester', 'user', 'actor']

function extractNameFromValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const fields = ['full_name', 'name', 'display_name', 'preferred_name', 'email', 'username']
    for (const field of fields) {
      const maybe = source[field]
      if (typeof maybe === 'string' && maybe.trim().length) {
        return maybe.trim()
      }
    }
  }
  return undefined
}

function formatUserName(userId?: number, userDirectory?: UserDirectoryMap, fallback?: string) {
  if (typeof userId !== 'number') {
    return fallback
  }
  const entry = userDirectory?.[userId]
  if (entry) {
    return entry.fullName
  }
  return `User ${userId}`
}

function deriveRequesterName(
  payload: Record<string, unknown>,
  fallbackValues: unknown[],
  requesterUserId?: number,
  userDirectory?: UserDirectoryMap
): string {
  if (typeof requesterUserId === 'number') {
    const directoryName = formatUserName(requesterUserId, userDirectory)
    if (directoryName && !directoryName.startsWith('User ')) {
      return directoryName
    }
  }
  for (const key of REQUESTER_NAME_KEYS) {
    const candidate = extractNameFromValue(payload[key])
    if (candidate) return candidate
  }

  const context = payload.request_context
  if (context && typeof context === 'object') {
    const contextRecord = context as Record<string, unknown>
    for (const key of REQUESTER_CONTEXT_KEYS) {
      const candidate = extractNameFromValue(contextRecord[key])
      if (candidate) return candidate
    }
  }

  for (const fallback of fallbackValues) {
    const candidate = extractNameFromValue(fallback)
    if (candidate) return candidate
  }

  return formatUserName(requesterUserId, userDirectory, 'Unknown requester') ?? 'Unknown requester'
}

function formatRole(role?: ApprovalRoleApi | null): string | undefined {
  if (!role?.name) return undefined
  return formatRoleLabel(role.name) ?? role.name
}

function formatTemplateLabel(template?: unknown): string {
  if (typeof template !== 'string' || !template.trim()) {
    return 'Memo'
  }
  const trimmed = template.trim()
  const parts = trimmed.split('_')
  const formattedParts = parts.map((segment, index) => {
    if (segment.toLowerCase() === 'vcp' && index === 0) {
      return 'VCP'
    }
    if (!segment.length) return segment
    return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
  })
  return formattedParts.join(' ')
}

function normaliseCompanies(value: unknown): MemoApprovalCompany[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry): MemoApprovalCompany | null => {
      if (!entry || typeof entry !== 'object') return null
      const idValue = (entry as Record<string, unknown>).id
      const nameValue = (entry as Record<string, unknown>).name
      const tickerValue = (entry as Record<string, unknown>).ticker
      if (
        (typeof idValue !== 'string' && typeof idValue !== 'number') ||
        typeof nameValue !== 'string' ||
        typeof tickerValue !== 'string'
      ) {
        return null
      }
      const exchangeRaw = (entry as Record<string, unknown>).exchange
      const exchange =
        typeof exchangeRaw === 'string' && exchangeRaw.trim().length > 0
          ? exchangeRaw.trim()
          : undefined
      return {
        id: String(idValue),
        name: nameValue,
        ticker: tickerValue,
        exchange,
      }
    })
    .filter((company): company is MemoApprovalCompany => Boolean(company))
}

function mapStageApproval(
  group: ApprovalGroup,
  companyMap: CompanyMap,
  userDirectory?: UserDirectoryMap
): StageApprovalRequest {
  const { request } = group
  const payload = (request.payload ?? {}) as Record<string, unknown>

  const stageApprovalAction = resolveStageApprovalActionKind(request, payload)
  const analystNamesMap = normalizeAnalystNamesMap(payload.analyst_names)

  const primaryTransition =
    stageApprovalAction === 'analyst_reassign'
      ? buildAnalystTransitionFromPreviousCurrent(
          payload,
          'previous_primary_analyst',
          'primary_analyst',
          analystNamesMap
        )
      : {}
  const secondaryTransition =
    stageApprovalAction === 'analyst_reassign'
      ? buildAnalystTransitionFromPreviousCurrent(
          payload,
          'previous_secondary_analyst',
          'secondary_analyst',
          analystNamesMap
        )
      : {}

  const ticker = typeof payload.ticker === 'string' ? payload.ticker : 'UNKNOWN'
  const company = companyMap[ticker]
  const payloadCompany =
    typeof payload.company === 'string'
      ? payload.company
      : typeof payload.company_name === 'string'
        ? payload.company_name
        : undefined
  const rawFromStage =
    typeof payload.from_stage === 'string' ? (payload.from_stage as string) : undefined
  const rawToStage = typeof payload.to_stage === 'string' ? (payload.to_stage as string) : undefined
  const approvalStageConfig =
    request.approval_config_snapshot?.stages?.[typeof rawToStage === 'string' ? rawToStage : '']

  const companyMeta = (company?.meta ?? {}) as Record<string, unknown>

  const attachedDocuments = extractApprovalDocuments(payload.documents)
  const fallbackDocuments =
    collectRequiredDocuments(approvalStageConfig?.required_documents)?.map((name) => ({
      name,
    })) ?? []
  const documents = attachedDocuments.length > 0 ? attachedDocuments : fallbackDocuments

  const updatedAt = request.updated_at ?? request.created_at ?? null
  const submittedAt = updatedAt ?? new Date().toISOString()

  const fallbackRequesterCandidates: unknown[] = [
    group.user,
    companyMeta.primary_analyst_name,
    companyMeta.primary_analyst_full_name,
    companyMeta.primary_analyst,
    companyMeta.secondary_analyst_name,
    companyMeta.secondary_analyst_full_name,
    companyMeta.secondary_analyst,
  ]

  let effectiveAction = stageApprovalAction
  let analystChange: StageApprovalRequest['analystChange'] =
    stageApprovalAction === 'analyst_reassign'
      ? { primary: primaryTransition, secondary: secondaryTransition }
      : undefined

  if (
    stageApprovalAction === 'analyst_reassign' &&
    !analystTransitionIsMeaningful(primaryTransition) &&
    !analystTransitionIsMeaningful(secondaryTransition) &&
    typeof rawFromStage === 'string' &&
    rawFromStage.trim().length > 0 &&
    typeof rawToStage === 'string' &&
    rawToStage.trim().length > 0
  ) {
    effectiveAction = 'stage_change'
    analystChange = undefined
  }

  const fromStage = effectiveAction === 'stage_change' ? formatStage(rawFromStage) : ''
  const toStage = effectiveAction === 'stage_change' ? formatStage(rawToStage) : ''

  return {
    id: String(request.id),
    kind: 'stage',
    stageApprovalAction: effectiveAction,
    ticker,
    company: payloadCompany ?? company?.name ?? ticker,
    fromStage,
    toStage,
    analystChange,
    rationale: typeof payload.rationale === 'string' ? payload.rationale : 'No rationale provided.',
    requester: {
      name: deriveRequesterName(
        payload,
        fallbackRequesterCandidates,
        request.requester_user_id,
        userDirectory
      ),
      role: formatRole(group.role),
      userId: request.requester_user_id,
    },
    daysPending: calculateDaysSince(submittedAt),
    submittedAt,
    documents,
    overview: {
      companyName: company?.name ?? undefined,
      primaryAnalyst:
        (companyMeta.primary_analyst_initials as string | undefined) ??
        (companyMeta.primary_analyst as string | undefined),
      secondaryAnalyst:
        (companyMeta.secondary_analyst_initials as string | undefined) ??
        (companyMeta.secondary_analyst as string | undefined),
      currentStage: formatStage(
        typeof payload.from_stage === 'string' ? payload.from_stage : undefined
      ),
      lastActivity:
        typeof companyMeta.last_activity === 'string' ? companyMeta.last_activity : undefined,
      exchange: typeof payload?.exchange === 'string' ? payload.exchange : undefined,
    },
    status: request.status,
    requiredRoles: extractRequiredRoles(approvalStageConfig),
    requiredDocuments: collectRequiredDocuments(approvalStageConfig?.required_documents),
    canApprove: group.canApprove,
    alreadyApproved: group.alreadyApproved,
    cannotApprove: group.cannotApprove,
    isReactivationRequest:
      rawFromStage === 'EARLY_TERMINATED' && rawToStage === 'WATCHLIST' ? true : undefined,
    entity_id: typeof request.entity_id === 'number' ? request.entity_id : undefined,
    stageChangeAnalystUserIds:
      effectiveAction === 'stage_change' ? collectStagePayloadAnalystUserIds(payload) : undefined,
    workflowSections: (() => {
      const mapped = mapWorkflowSectionsToView(
        group.workflowSectionsRaw,
        request.requester_user_id,
        formatRole
      )
      return mapped.length ? mapped : undefined
    })(),
  }
}

function mapMemoApproval(
  group: ApprovalGroup,
  userDirectory?: UserDirectoryMap
): MemoApprovalRequest {
  const { request } = group
  const payload = (request.payload ?? {}) as Record<string, unknown>

  const submittedAt = request.updated_at ?? request.created_at ?? undefined
  const rationaleRaw = typeof payload.rationale === 'string' ? payload.rationale.trim() : ''
  const templateType = typeof payload.template_type === 'string' ? payload.template_type : 'MEMO'
  const companies = normaliseCompanies(payload.companies)
  const relevantDocsRaw = Array.isArray(payload.relevant_documents)
    ? payload.relevant_documents
    : []
  const relevantDocumentIds = relevantDocsRaw
    .map((doc) => {
      if (typeof doc === 'string' || typeof doc === 'number') {
        return String(doc)
      }
      return null
    })
    .filter((value): value is string => Boolean(value))

  const documents: ApprovalDocument[] = relevantDocumentIds.map((docId) => ({
    name: `Document ${docId}`,
    id: docId,
  }))

  const memoIdRaw = payload.memo_id ?? request.entity_id
  const memoId =
    typeof memoIdRaw === 'number'
      ? memoIdRaw
      : typeof memoIdRaw === 'string' && memoIdRaw.trim().length
        ? Number(memoIdRaw)
        : NaN

  return {
    id: String(request.id),
    kind: 'memo',
    memoId: Number.isNaN(memoId) ? -1 : memoId,
    title: typeof payload.title === 'string' ? payload.title : `Memo #${request.id}`,
    templateType,
    templateLabel: formatTemplateLabel(templateType),
    companies,
    rationale: rationaleRaw.length ? rationaleRaw : 'No rationale provided.',
    requester: {
      name: deriveRequesterName(payload, [group.user], request.requester_user_id, userDirectory),
      role: formatRole(group.role),
      userId: request.requester_user_id,
    },
    daysPending: calculateDaysSince(submittedAt),
    submittedAt,
    documents,
    status: request.status,
    requiredRoles: undefined,
    requiredDocuments: undefined,
    relevantDocumentIds,
    revisionCount: typeof payload.revision_count === 'number' ? payload.revision_count : undefined,
    canApprove: group.canApprove,
    alreadyApproved: group.alreadyApproved,
    cannotApprove: group.cannotApprove,
    entity_id: typeof request.entity_id === 'number' ? request.entity_id : undefined,
  }
}

function mapApprovalGroup(
  group: ApprovalGroup,
  companyMap: CompanyMap,
  userDirectory?: UserDirectoryMap
): AnyApprovalRequest {
  const { request } = group
  if (
    request.type === 'memo_approval' ||
    (request.payload && typeof request.payload === 'object' && 'memo_id' in request.payload)
  ) {
    return mapMemoApproval(group, userDirectory)
  }

  return mapStageApproval(group, companyMap, userDirectory)
}

function groupApprovalRows(rows: ApprovalListResponseApi['results']) {
  const map = new Map<string, ApprovalGroup>()

  rows.forEach((row) => {
    const request = pickRowRequest(row)
    if (!request) return
    const key = String(request.id)
    const entry = map.get(key)
    const lines = pickRowLines(row)
    const rowUser = pickRowUser(row)
    const sections = row.workflow_sections
    const canApprove = Boolean(row.can_approve)
    const alreadyApproved = Boolean(row.already_approved)
    // cannot_approve from the API is per-line; if any line is actionable we should allow the action
    // so we only keep cannotApprove true when no line grants canApprove
    const cannotApprove = Boolean(row.cannot_approve)
    if (entry) {
      if (lines.length) entry.lines.push(...lines)
      if (!entry.user && rowUser) {
        entry.user = rowUser
      }
      if (!entry.role && row.Role) {
        entry.role = row.Role
      }
      if (!entry.workflowSectionsRaw?.length && sections?.length) {
        entry.workflowSectionsRaw = sections
      }
      if (!entry.canApprove && canApprove) {
        entry.canApprove = true
        entry.cannotApprove = false
      }
      if (!entry.alreadyApproved && alreadyApproved) {
        entry.alreadyApproved = true
      }
      // Only mark cannotApprove true if we still haven't found an actionable line
      if (!entry.canApprove && cannotApprove) {
        entry.cannotApprove = true
      }
    } else {
      map.set(key, {
        request,
        lines,
        user: rowUser,
        role: row.Role ?? null,
        canApprove,
        alreadyApproved,
        cannotApprove: canApprove ? false : cannotApprove,
        workflowSectionsRaw: sections?.length ? sections : undefined,
      })
    }
  })

  return Array.from(map.values())
}

function toNumericId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim())
  }
  return undefined
}

function collectHistoryUserIds(data: ApprovalHistoryResponseApi): number[] {
  const ids = new Set<number>()
  data.approvals.forEach((row) => {
    const requestRaw = isTupleRow(row) ? row[0] : (row?.['ApprovalRequest'] as ApprovalRequestApi)
    const lineRaw = isTupleRow(row) ? row[1] : (row?.['ApprovalLine'] as ApprovalLineItemApi | null)
    if (requestRaw?.requester_user_id) {
      ids.add(requestRaw.requester_user_id)
    }
    const auditLogs = Array.isArray((requestRaw as ApprovalRequestWithHistory)?.audit_logs)
      ? ((requestRaw as ApprovalRequestWithHistory).audit_logs as Array<Record<string, unknown>>)
      : []
    auditLogs.forEach((log) => {
      const actorId = toNumericId(log.actor_user_id)
      if (typeof actorId === 'number') {
        ids.add(actorId)
      }
    })
    if (lineRaw) {
      const decidedBy = toNumericId(lineRaw.decided_by_user_id)
      if (typeof decidedBy === 'number') {
        ids.add(decidedBy)
      }
      const approverId = toNumericId(lineRaw.approver_user_id)
      if (typeof approverId === 'number') {
        ids.add(approverId)
      }
    }
  })
  return Array.from(ids)
}

type ApprovalRequestWithHistory = ApprovalRequestApi & {
  audit_logs?: Array<Record<string, unknown>>
}

function isTupleRow(row: unknown): row is ApprovalHistoryRowApi {
  return Array.isArray(row)
}

function formatDecisionStatus(status?: string): string {
  if (!status) return 'Pending'
  const normalised = status.toLowerCase()
  if (normalised === 'approved') return 'Approved'
  if (normalised === 'rejected') return 'Rejected'
  if (normalised === 'pending') return 'Pending'
  if (normalised === 'in_progress' || normalised === 'in-review' || normalised === 'inprogress') {
    return 'In Review'
  }
  if (normalised === 'cancelled' || normalised === 'canceled') {
    return 'Cancelled'
  }
  return status
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function mapHistoryResponse(
  data: ApprovalHistoryResponseApi,
  userDirectory?: UserDirectoryMap
): ApprovalHistoryEntry[] {
  const entries: ApprovalHistoryEntry[] = []
  const seen = new Set<string>()

  data.approvals.forEach((row) => {
    const requestRaw = isTupleRow(row) ? row[0] : row?.['ApprovalRequest']
    if (!requestRaw) return
    const request = requestRaw as ApprovalRequestWithHistory
    const payload = (request.payload ?? {}) as Record<string, unknown>
    let hasEntry = false

    const auditLogs = Array.isArray(request.audit_logs) ? request.audit_logs : []
    auditLogs.forEach((log: Record<string, unknown>) => {
      const id = String(log.id ?? `${request.id}-${log.created_at ?? Math.random()}`)
      if (seen.has(id)) return
      seen.add(id)

      const action = typeof log.action === 'string' ? log.action.toLowerCase() : ''
      if (action !== 'approved' && action !== 'rejected') return

      const createdAt = typeof log.created_at === 'string' ? log.created_at : undefined
      const details = (log.details ?? {}) as Record<string, unknown>
      const comment =
        typeof details.comment === 'string' && details.comment.length > 0
          ? details.comment
          : action === 'approved'
            ? 'Approved'
            : 'Rejected'

      const actorUserId =
        typeof log.actor_user_id === 'number'
          ? log.actor_user_id
          : typeof log.actor_user_id === 'string' && /^\d+$/.test(log.actor_user_id)
            ? Number(log.actor_user_id)
            : undefined

      entries.push({
        id,
        date: formatHistoryDate(createdAt),
        company:
          typeof payload.company === 'string'
            ? (payload.company as string)
            : typeof payload.ticker === 'string'
              ? (payload.ticker as string)
              : data.ticker,
        ticker: data.ticker,
        decision: action === 'approved' ? 'Approved' : 'Rejected',
        approver: formatUserName(actorUserId, userDirectory, 'System') ?? 'System',
        comment,
      })
      hasEntry = true
    })

    if (!auditLogs.length) {
      const line = isTupleRow(row) ? row[1] : (row?.['ApprovalLine'] ?? null)
      if (line && line.decision && line.decision !== 'pending') {
        if (line.decision === 'approved' || line.decision === 'rejected') {
          const createdAt =
            typeof line.created_at === 'string'
              ? line.created_at
              : typeof request.created_at === 'string'
                ? request.created_at
                : undefined

          const decisionLabel = line.decision === 'approved' ? 'Approved' : 'Rejected'

          const decidedById = toNumericId(line.decided_by_user_id)
          const approverUserId = toNumericId(line.approver_user_id)

          const approver =
            formatUserName(decidedById, userDirectory) ??
            formatUserName(approverUserId, userDirectory) ??
            (line.approver_role_id ? `Role ${line.approver_role_id}` : 'System')

          const fallbackId = `${request.id}-${decisionLabel}-${createdAt ?? 'unknown'}`
          if (!seen.has(fallbackId)) {
            seen.add(fallbackId)
            entries.push({
              id: fallbackId,
              date: formatHistoryDate(createdAt),
              company:
                typeof payload.company === 'string'
                  ? (payload.company as string)
                  : typeof payload.ticker === 'string'
                    ? (payload.ticker as string)
                    : data.ticker,
              ticker: data.ticker,
              decision: decisionLabel,
              approver,
              comment:
                typeof line.decision_rationale === 'string' && line.decision_rationale.length > 0
                  ? line.decision_rationale
                  : decisionLabel,
            })
            hasEntry = true
          }
        }
      }
    }

    if (!hasEntry) {
      const decisionLabel = formatDecisionStatus(request.status)
      if (decisionLabel === 'Pending' || decisionLabel === 'In Review') {
        return
      }
      const fallbackId = `request-${request.id}`
      if (seen.has(fallbackId)) return
      seen.add(fallbackId)

      const createdAt = typeof request.created_at === 'string' ? request.created_at : undefined
      const requesterName =
        typeof payload.requested_by === 'string'
          ? (payload.requested_by as string)
          : (formatUserName(request.requester_user_id, userDirectory, 'Requester') ?? 'Requester')

      const fallbackComment =
        typeof payload.rationale === 'string' && payload.rationale.trim().length > 0
          ? (payload.rationale as string)
          : decisionLabel === 'Pending'
            ? 'Awaiting decision.'
            : decisionLabel

      entries.push({
        id: fallbackId,
        date: formatHistoryDate(createdAt),
        company:
          typeof payload.company === 'string'
            ? (payload.company as string)
            : typeof payload.ticker === 'string'
              ? (payload.ticker as string)
              : data.ticker,
        ticker: data.ticker,
        decision: decisionLabel,
        approver: requesterName,
        comment: fallbackComment,
      })
    }
  })

  entries.sort((a, b) => {
    const aTime = Date.parse(a.date)
    const bTime = Date.parse(b.date)
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0
    return bTime - aTime
  })

  return entries
}

export function useApprovalsQuery(options?: ApprovalsQueryOptions) {
  const mineOnly = options?.mineOnly ?? true

  return useQuery({
    queryKey: ['approvals', 'list', mineOnly ? 'mine' : 'all'],
    queryFn: async () => {
      const response = await approvalsService.listApprovals({
        mine_only: mineOnly,
      })

      const groups = groupApprovalRows(response.results)
      const companyMap: CompanyMap = {}

      return groups.map((group) => mapApprovalGroup(group, companyMap))
    },
    // Always refresh when the user visits the Approvals tab to show latest data
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    staleTime: 0,
  })
}

export function useApprovalDecisionMutation() {
  return useMutation({
    mutationFn: async (input: DecisionMutationInput) => {
      return approvalsService.decide({
        request_ids: input.requestIds,
        decision: input.decision,
        rationale: input.rationale,
      })
    },
  })
}

export function useApprovalCompanyOverview(
  ticker: string | undefined,
  options?: { enabled?: boolean; entityId?: number | null }
) {
  const entityId = options?.entityId
  const hasTicker = Boolean(ticker?.trim())
  const hasEntityId = entityId != null && Number.isFinite(entityId)

  return useQuery<ApprovalCompanyOverview | null>({
    queryKey: ['approvals', 'company-overview', ticker ?? '', entityId ?? ''],
    enabled: (hasTicker || hasEntityId) && (options?.enabled ?? true),
    queryFn: async () => {
      if (!hasTicker && !hasEntityId) return null
      const company = await companiesService.getCompanyBySearch(ticker?.trim() ?? '', {
        entityId: hasEntityId ? entityId : undefined,
      })
      if (!company) return null
      const companyName = company.name ?? undefined
      const primaryAnalyst =
        company.primary_analyst?.full_name ??
        company.primary_analyst?.email ??
        company.primary_analyst?.username
      const secondaryAnalyst =
        company.secondary_analyst?.full_name ??
        company.secondary_analyst?.email ??
        company.secondary_analyst?.username
      const currentStage =
        company.stage?.name ??
        (company.stage?.slug ? formatStageName({ slug: company.stage.slug }) : undefined)
      const lastActivity = formatOverviewDate(company.stage_assignment?.updated_at ?? null)
      const exchange = typeof company.exchange === 'string' ? company.exchange : undefined
      return {
        companyName,
        primaryAnalyst: primaryAnalyst ?? undefined,
        secondaryAnalyst: secondaryAnalyst ?? undefined,
        currentStage,
        lastActivity: lastActivity ?? undefined,
        exchange,
      }
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  })
}

export function useApprovalHistoryQuery(
  ticker: string | undefined,
  options?: ApprovalHistoryQueryOptions
) {
  return useQuery({
    queryKey: ['approvals', 'history', ticker ?? ''],
    enabled: Boolean(ticker) && (options?.enabled ?? true),
    queryFn: async () => {
      if (!ticker) return []

      try {
        const response = await approvalsService.getApprovalHistory(ticker)
        const userIds = collectHistoryUserIds(response)
        const userDirectory = userIds.length ? await usersService.getUsersByIds(userIds) : {}
        return mapHistoryResponse(response, userDirectory)
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return []
        }
        throw error
      }
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  })
}

export const __approvalsTestHelpers = {
  calculateDaysSince,
  formatStage,
  groupApprovalRows,
  extractRequiredRoles,
  mapApprovalGroup,
  mapHistoryResponse,
}
