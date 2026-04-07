import type {
  PortfolioAnalystCompanyState,
  WatchlistAnalystFieldsFromAssignment,
} from '@/containers/coverage/lib/types'
import type { PipelineStageCompanyRecordApi } from '@/services/api/pipeline.service'

export function toNumericId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

/**
 * Initials for analyst cells — prefers full name, falls back to email local part.
 */
export function getAnalystInitials(email: string, fullName: string): string {
  if (fullName && fullName !== email) {
    const nameParts = fullName.split(' ').filter((part) => part.length > 0)
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    }
    if (nameParts.length === 1 && nameParts[0].length >= 2) {
      return nameParts[0].substring(0, 2).toUpperCase()
    }
  }

  const emailName = email.split('@')[0]
  if (emailName.length >= 2) {
    return emailName.substring(0, 2).toUpperCase()
  }

  return emailName.toUpperCase()
}

/**
 * Builds watchlist analyst columns from pipeline stage assignment (container layer).
 */
export function buildWatchlistAnalystFieldsFromRecord(
  companyData: PipelineStageCompanyRecordApi
): WatchlistAnalystFieldsFromAssignment {
  const { StageAssignment } = companyData
  const assignmentMeta = (StageAssignment?.meta ?? {}) as Record<string, unknown>

  const primaryAnalystEntry = (
    assignmentMeta.primary_analyst as Array<Record<string, unknown>> | undefined
  )?.[0]
  const primaryAnalyst = primaryAnalystEntry
    ? getAnalystInitials(
        (primaryAnalystEntry.email as string) ?? '',
        (primaryAnalystEntry.full_name as string) ?? ''
      )
    : undefined
  const primaryAnalystName =
    primaryAnalystEntry?.full_name !== primaryAnalystEntry?.email
      ? (primaryAnalystEntry?.full_name as string | undefined)
      : (primaryAnalystEntry?.email as string | undefined)
  const primaryAnalystId = toNumericId(primaryAnalystEntry?.user_id ?? primaryAnalystEntry?.id)

  const secondaryAnalystEntry = (
    assignmentMeta.secondary_analyst as Array<Record<string, unknown>> | undefined
  )?.[0]
  const secondaryAnalyst = secondaryAnalystEntry
    ? getAnalystInitials(
        (secondaryAnalystEntry.email as string) ?? '',
        (secondaryAnalystEntry.full_name as string) ?? ''
      )
    : undefined
  const secondaryAnalystName =
    secondaryAnalystEntry?.full_name !== secondaryAnalystEntry?.email
      ? (secondaryAnalystEntry?.full_name as string | undefined)
      : (secondaryAnalystEntry?.email as string | undefined)
  const secondaryAnalystId = toNumericId(secondaryAnalystEntry?.user_id ?? secondaryAnalystEntry?.id)
  const stageAssignmentId = toNumericId(StageAssignment?.id)

  return {
    primaryAnalyst,
    primaryAnalystName,
    primaryAnalystId,
    secondaryAnalyst,
    secondaryAnalystName,
    secondaryAnalystId,
    stageAssignmentId,
    canAssignAnalysts: !primaryAnalystEntry || !secondaryAnalystEntry,
  }
}

/** Minimal row shape needed to open the analyst assignment modal from a coverage table */
export type AnalystAssignmentModalOpenInput = {
  id: string | number
  ticker: string
  /** Display name — map from `securityDescription`, `companyName`, etc. */
  name: string
  stageAssignmentId?: number
  primaryAnalystId?: number
  secondaryAnalystId?: number
}

export type OpenAnalystAssignmentModalFn = (
  company: PortfolioAnalystCompanyState & { id: number }
) => void

/**
 * Normalizes a table row `id` (string | number) to a finite company id, or `undefined` if invalid.
 */
export function parseTableRowCompanyId(id: string | number): number | undefined {
  const numericCompanyId = typeof id === 'number' ? id : Number(id)
  return Number.isFinite(numericCompanyId) ? numericCompanyId : undefined
}

/**
 * Invokes `onOpen` with a typed payload when the row has a valid numeric company id.
 * Use from watchlist / portfolio (and similar) analyst cell clicks.
 */
export function openAnalystAssignmentModalFromRow(
  onOpen: OpenAnalystAssignmentModalFn | undefined,
  row: AnalystAssignmentModalOpenInput
): void {
  if (!onOpen) return
  const numericCompanyId = parseTableRowCompanyId(row.id)
  if (numericCompanyId === undefined) return
  onOpen({
    id: numericCompanyId,
    ticker: row.ticker,
    name: row.name,
    stageAssignmentId: row.stageAssignmentId,
    primaryAnalystId: row.primaryAnalystId,
    secondaryAnalystId: row.secondaryAnalystId,
  })
}

export function getHeaderDescription({
  companyData,
  contextDescription,
}: {
  companyData?: PortfolioAnalystCompanyState
  contextDescription: string
}): string {
  const isChangeMode =
    Boolean(companyData?.primaryAnalystId) && Boolean(companyData?.secondaryAnalystId)

  if (isChangeMode) {
    return `Select new primary and secondary analysts for ${companyData?.ticker ?? 'this company'}. This request will be sent to the Lead Investor for approval.`
  }

  return `Assign primary and secondary analysts for ${companyData?.name || contextDescription}`
}
