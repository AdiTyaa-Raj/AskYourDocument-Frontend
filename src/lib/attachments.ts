'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { contentService } from '@/services/api'
import type { ContentItem } from '@/services/api/content.service'

export type StageAttachmentType = 'document' | 'memo'

export interface StageAttachment {
  id: number
  label: string
  subLabel?: string
  type: StageAttachmentType
  documentType?: string
  memoTemplateType?: string
  ticker?: string | null
  companyIds?: Array<string | number>
  meta?: Record<string, unknown>
}

export interface AttachmentRequirementMap {
  documents?: string[]
  memos?: string[]
}

export interface AttachmentQueryInfo {
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage?: boolean
  fetchNextPage: () => void
  errorMessage?: string
}

export type AttachmentQueryPage = {
  items: StageAttachment[]
  total: number
  nextSkip: number | null
}

export type AttachmentContentType = 'DOCUMENT' | 'MEMO' | undefined

const normalizeRawToken = (value?: string) =>
  value?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ?? ''

// Some attachment/memo types come back with slight naming variants. Canonicalize them so requirements match.
const TOKEN_SYNONYM_GROUPS: string[][] = [['GOING_IN_VALUE_CREATION_PLAN', 'GOING_IN_VALUATION']]

const TOKEN_ALIAS_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>()
  TOKEN_SYNONYM_GROUPS.forEach((group) => {
    if (!group.length) return
    const canonical = normalizeRawToken(group[0])
    if (!canonical) return
    group.forEach((token) => {
      const normalized = normalizeRawToken(token)
      if (!normalized) return
      map.set(normalized, canonical)
    })
  })
  return map
})()

const ATTACHMENT_PAGE_SIZE = 10
export const getCombinedRequirementTokens = (requirements?: AttachmentRequirementMap): string[] => {
  if (!requirements) return []
  const tokens: string[] = []
  if (Array.isArray(requirements.documents)) {
    tokens.push(...requirements.documents)
  }
  if (Array.isArray(requirements.memos)) {
    tokens.push(...requirements.memos)
  }
  const unique: string[] = []
  const seen = new Set<string>()
  tokens.forEach((token) => {
    if (typeof token !== 'string') return
    const trimmed = token.trim()
    if (!trimmed) return
    const normalized = normaliseToken(trimmed)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    unique.push(trimmed)
  })
  return unique
}

// Normalize and canonicalize tokens so aliases (e.g., GOING_IN_VALUE vs GOING_IN_VALUE_CREATION_PLAN) match.
const normaliseToken = (value?: string) => {
  const normalized = normalizeRawToken(value)
  if (!normalized) return ''
  return TOKEN_ALIAS_MAP.get(normalized) ?? normalized
}

const mapContentToAttachment = (item: ContentItem): StageAttachment => {
  const companyIds: Array<string | number> = []
  if (typeof item.primary_company_id === 'number') {
    companyIds.push(item.primary_company_id)
  }
  if (Array.isArray(item.company_ids)) {
    item.company_ids.forEach((value) => {
      if (typeof value === 'number' || typeof value === 'string') {
        companyIds.push(value)
      }
    })
  }

  const type: StageAttachmentType =
    item.content_type === 'DOCUMENT' ? 'document' : ('memo' as StageAttachmentType)

  const label =
    item.title ||
    item.file_metadata?.original_filename ||
    item.file_metadata?.filename ||
    `${type === 'document' ? 'Document' : 'Memo'} ${item.id}`

  const category = item.category || undefined
  const ticker = item.primary_company_details?.ticker ?? null

  return {
    id: item.id,
    label,
    subLabel: category || ticker || (type === 'document' ? 'Document' : 'Memo'),
    type,
    documentType: type === 'document' ? category : undefined,
    // Include additional content item data for consumers that need more details
    memoTemplateType: type === 'memo' ? category : undefined,
    ticker,
    companyIds: companyIds.length ? companyIds : undefined,
    meta: {
      status: item.status,
      created_at: item.created_at,
      updatedAt: item.updated_at,
      category: item.category,
      primaryCompanyId: item.primary_company_id,
      file_metadata: item.file_metadata,
      s3_object_name: item.s3_object_name,
    },
  }
}

const normaliseStringList = (input?: unknown): string[] | undefined => {
  if (!input) return undefined
  const values = Array.isArray(input) ? input : [input]
  const items = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
  return items.length ? items : undefined
}

export const normaliseAttachmentRequirements = (
  input?: unknown
): AttachmentRequirementMap | undefined => {
  if (!input) return undefined
  if (Array.isArray(input)) {
    const documents = normaliseStringList(input)
    return documents ? { documents } : undefined
  }
  if (typeof input === 'object' && input !== null) {
    const source = input as Record<string, unknown>
    const documents = normaliseStringList(source.documents)
    const memos = normaliseStringList(source.memos)
    const requirements: AttachmentRequirementMap = {}
    if (documents && documents.length) {
      requirements.documents = documents
    }
    if (memos && memos.length) {
      requirements.memos = memos
    }
    if (requirements.documents || requirements.memos) {
      return requirements
    }
  }
  return undefined
}

const getAttachmentToken = (item: StageAttachment): { document?: string; memo?: string } => {
  const document = item.type === 'document' ? normaliseToken(item.documentType) : undefined
  const memo = item.type === 'memo' ? normaliseToken(item.memoTemplateType) : undefined
  return { document, memo }
}

export const filterAttachmentsByTokens = (
  items: StageAttachment[],
  tokens?: string[] | Set<string>
): StageAttachment[] => {
  if (!tokens || (Array.isArray(tokens) && tokens.length === 0)) {
    return items
  }
  const tokenArray = Array.isArray(tokens) ? tokens : Array.from(tokens)
  const allowed = new Set(tokenArray.map((token) => normaliseToken(token)))
  return items.filter((item) => {
    const tokenInfo = getAttachmentToken(item)
    const token = tokenInfo.document ?? tokenInfo.memo
    if (!token) return false
    return allowed.has(normaliseToken(token))
  })
}

export const filterAttachmentsByRequirements = (
  items: StageAttachment[],
  type: StageAttachmentType,
  requirements?: AttachmentRequirementMap
): StageAttachment[] => {
  const requiredList =
    type === 'document' ? requirements?.documents : (requirements?.memos ?? undefined)
  if (!requiredList || requiredList.length === 0) {
    return items
  }

  const allowed = new Set(requiredList.map((req) => normaliseToken(req)))
  return items.filter((item) => {
    const tokenInfo = getAttachmentToken(item)
    const token = type === 'document' ? tokenInfo.document : tokenInfo.memo
    if (!token) return false
    return allowed.has(token)
  })
}

export const getMissingRequiredAttachmentTypes = (
  selected: StageAttachment[],
  type: StageAttachmentType,
  requirements?: AttachmentRequirementMap
): string[] => {
  const requiredList =
    type === 'document' ? requirements?.documents : (requirements?.memos ?? undefined)
  if (!requiredList || requiredList.length === 0) {
    return []
  }

  const requiredTokens = requiredList.map((req) => normaliseToken(req))
  const matched = new Set<string>()

  selected.forEach((item) => {
    const tokenInfo = getAttachmentToken(item)
    const token = type === 'document' ? tokenInfo.document : tokenInfo.memo
    if (!token) return
    if (requiredTokens.includes(token)) {
      matched.add(token)
    }
  })

  return requiredList.filter((req) => !matched.has(normaliseToken(req)))
}

export const getMissingRequiredAttachmentTokens = (
  selected: StageAttachment[],
  requirements?: AttachmentRequirementMap
): string[] => {
  const requiredTokens = getCombinedRequirementTokens(requirements)
  if (!requiredTokens.length) {
    return []
  }

  const normalizedRequired = requiredTokens
    .map((token) => normaliseToken(token))
    .filter((token) => token.length > 0)
  if (!normalizedRequired.length) {
    return []
  }

  const firstSeenOriginal = new Map<string, string>()
  requiredTokens.forEach((token) => {
    const normalized = normaliseToken(token)
    if (normalized && !firstSeenOriginal.has(normalized)) {
      firstSeenOriginal.set(normalized, token)
    }
  })

  const selectedTokens = new Set(
    selected
      .map((item) => {
        const tokenInfo = getAttachmentToken(item)
        return tokenInfo.document ?? tokenInfo.memo ?? ''
      })
      .filter(Boolean)
      .map((token) => normaliseToken(token))
  )

  return normalizedRequired
    .filter((token) => !selectedTokens.has(token))
    .map((token) => firstSeenOriginal.get(token) ?? token)
}

export const attachmentMatchesRequirements = (
  attachment: StageAttachment,
  type: StageAttachmentType,
  requirements?: AttachmentRequirementMap
): boolean => {
  const requiredList =
    type === 'document' ? requirements?.documents : (requirements?.memos ?? undefined)
  if (!requiredList || requiredList.length === 0) {
    return true
  }
  const tokenInfo = getAttachmentToken(attachment)
  const token = type === 'document' ? tokenInfo.document : tokenInfo.memo
  if (!token) return false
  const allowed = new Set(requiredList.map((req) => normaliseToken(req)))
  return allowed.has(token)
}

const shouldFetchNextPage = (nextSkip: number | null, total: number) => {
  if (nextSkip === null) return false
  if (!Number.isFinite(total) || total <= 0) return false
  return nextSkip < total
}

const buildCompanyParams = (companyId?: number | string | null) => {
  if (companyId === undefined || companyId === null) return undefined
  const numericId = Number(companyId)
  const value = Number.isFinite(numericId) ? numericId : companyId
  return value
}

export function useAllLinkedDocsMemoQuery(options: {
  enabled?: boolean
  search?: string
  companyId?: number | string | null
  type?: AttachmentContentType
}) {
  const search = options.search?.trim() ?? ''
  const primaryCompanyId = buildCompanyParams(options.companyId)
  const contentType = options.type

  const queryKey = (() => {
    if (contentType === 'DOCUMENT') {
      return ['attachments', 'documents', options.companyId ?? 'all', search]
    }
    if (contentType === 'MEMO') {
      return ['attachments', 'memos', options.companyId ?? 'all', search]
    }
    return ['attachments', 'documents', options.companyId ?? 'all', search]
  })()

  return useInfiniteQuery<AttachmentQueryPage>({
    queryKey,
    enabled: options.enabled ?? true,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!shouldFetchNextPage(lastPage.nextSkip, lastPage.total)) {
        return undefined
      }
      return lastPage.nextSkip === null ? undefined : lastPage.nextSkip
    },
    queryFn: async ({ pageParam }) => {
      const currentPage = typeof pageParam === 'number' ? pageParam : 0
      const queryParams: Record<string, unknown> = {
        status: 'PUBLISHED',
        search: search || undefined,
        related_to_company_id: primaryCompanyId !== undefined ? [primaryCompanyId] : undefined,
      }

      if (contentType === 'DOCUMENT') {
        queryParams.content_type = 'DOCUMENT'
      } else if (contentType === 'MEMO') {
        queryParams.content_type = 'MEMO'
      }

      const response = await contentService.getContent(
        currentPage,
        ATTACHMENT_PAGE_SIZE,
        queryParams
      )
      const items = (response.data ?? []).map(mapContentToAttachment)
      const currentSkip = response.skip ?? currentPage
      const received = items.length
      const total = response.total ?? received
      const nextSkip = received === 0 ? null : currentSkip + received

      return {
        items,
        total,
        nextSkip,
      }
    },
  })
}

export const attachmentsToRecord = (items: StageAttachment[]): Record<string, number> => {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (!item.label) return acc
    const numericId = Number(item.id)
    if (!Number.isNaN(numericId)) {
      acc[item.label] = numericId
    }
    return acc
  }, {})
}
export function attachmentMatchesCompany(
  attachment: StageAttachment,
  company?: { ticker?: string | null; companyId?: string | number | null } | null
): boolean {
  if (!company) return true
  const targetTicker =
    typeof company.ticker === 'string' && company.ticker.trim().length
      ? company.ticker.trim().toUpperCase()
      : ''
  const attachmentTickerRaw =
    attachment.ticker ??
    (attachment.meta && typeof attachment.meta['ticker'] === 'string'
      ? (attachment.meta['ticker'] as string)
      : undefined)
  const attachmentTicker =
    attachmentTickerRaw && attachmentTickerRaw.trim().length
      ? attachmentTickerRaw.trim().toUpperCase()
      : ''
  if (targetTicker && attachmentTicker && targetTicker === attachmentTicker) {
    return true
  }

  const companyIdValue = company?.companyId
  const companyIdNumeric =
    typeof companyIdValue === 'string' || typeof companyIdValue === 'number'
      ? Number(companyIdValue)
      : NaN
  if (!Number.isNaN(companyIdNumeric) && attachment.companyIds?.length) {
    return attachment.companyIds.some((value) => {
      const numeric = Number(value)
      return !Number.isNaN(numeric) && numeric === companyIdNumeric
    })
  }

  return false
}
