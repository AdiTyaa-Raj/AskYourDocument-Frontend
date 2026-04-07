import { templateFields } from '@/containers/memos/lib/templates'
import type { MemoTemplateId } from '@/containers/memos/lib/types'
import type { UserDirectoryMap } from '@/services/api/users.service'

function userMultiFieldIdsForTemplate(templateId: MemoTemplateId): string[] {
  return (templateFields[templateId] ?? []).filter((f) => f.type === 'user_multi').map((f) => f.id)
}

function collectAllUserMultiFieldIds(): Set<string> {
  const s = new Set<string>()
  for (const fields of Object.values(templateFields)) {
    for (const f of fields) {
      if (f.type === 'user_multi') s.add(f.id)
    }
  }
  return s
}

/** All template field ids declared as `user_multi` (API submit uses userMultiFormStringToApiPayload). */
export const TEMPLATE_USER_MULTI_FIELD_IDS = collectAllUserMultiFieldIds()

export type UserMultiSegment =
  | { type: 'text'; text: string }
  | { type: 'mention'; userId: number; displayName: string }

export interface TemplateUserMultiFormState {
  userIds: number[]
  /** Map user id (as string key) → display label */
  labels: Record<string, string>
  /** Unstructured text from legacy API rows (free-text comma lists). */
  legacyText?: string
  /** Ordered inline body (Slack-style). When present, drives the editor. */
  segments?: UserMultiSegment[]
}

function coerceId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseInt(value, 10)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function mergeLastText(segments: UserMultiSegment[], chunk: string): void {
  if (!chunk) return
  const last = segments[segments.length - 1]
  if (last?.type === 'text') {
    last.text += chunk
  } else {
    segments.push({ type: 'text', text: chunk })
  }
}

function segmentsFromApiArray(raw: unknown): UserMultiSegment[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: UserMultiSegment[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const t = o.type
    if (t === 'text' && typeof o.text === 'string') {
      mergeLastText(out, o.text)
    } else if (t === 'mention') {
      const id = coerceId(o.userId ?? o.id)
      const dn =
        (typeof o.displayName === 'string' && o.displayName.trim()) ||
        (typeof o.name === 'string' && o.name.trim()) ||
        ''
      if (id !== undefined) {
        out.push({ type: 'mention', userId: id, displayName: dn || `User ${id}` })
      }
    }
  }
  if (out.length === 0) return [{ type: 'text', text: '' }]
  return out
}

function migrateToSegments(s: {
  userIds: number[]
  labels: Record<string, string>
  legacyText?: string
}): UserMultiSegment[] {
  const out: UserMultiSegment[] = []
  for (const id of s.userIds) {
    out.push({
      type: 'mention',
      userId: id,
      displayName: s.labels[String(id)]?.trim() || `User ${id}`,
    })
  }
  if (s.legacyText != null) mergeLastText(out, s.legacyText)
  if (out.length === 0) return [{ type: 'text', text: '' }]
  const last = out[out.length - 1]
  if (last.type === 'mention') out.push({ type: 'text', text: '' })
  return out
}

function deriveFromSegments(segments: UserMultiSegment[]): {
  userIds: number[]
  labels: Record<string, string>
  legacyText: string
} {
  const userIds: number[] = []
  const labels: Record<string, string> = {}
  const textParts: string[] = []
  for (const seg of segments) {
    if (seg.type === 'mention') {
      if (!userIds.includes(seg.userId)) userIds.push(seg.userId)
      labels[String(seg.userId)] = seg.displayName
    } else {
      textParts.push(seg.text)
    }
  }
  return { userIds, labels, legacyText: textParts.join('') }
}

export function parseUserMultiFormValue(raw: string): TemplateUserMultiFormState {
  if (!raw?.trim()) {
    return { userIds: [], labels: {}, segments: [{ type: 'text', text: '' }] }
  }
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') {
      const t = raw.trim()
      return {
        userIds: [],
        labels: {},
        legacyText: t,
        segments: [{ type: 'text', text: t }],
      }
    }
    const obj = o as Record<string, unknown>
    const userIds: number[] = []
    const labels: Record<string, string> = {}

    if (Array.isArray(obj.userIds)) {
      for (const x of obj.userIds) {
        const id = coerceId(x)
        if (id !== undefined && !userIds.includes(id)) userIds.push(id)
      }
    }

    if (Array.isArray(obj.users)) {
      for (const u of obj.users) {
        if (!u || typeof u !== 'object') continue
        const rec = u as Record<string, unknown>
        const id = coerceId(rec.id)
        const dn =
          (typeof rec.displayName === 'string' && rec.displayName.trim()) ||
          (typeof rec.full_name === 'string' && rec.full_name.trim()) ||
          (typeof rec.name === 'string' && rec.name.trim()) ||
          ''
        if (id !== undefined) {
          if (!userIds.includes(id)) userIds.push(id)
          if (dn) labels[String(id)] = dn
        }
      }
    }

    if (Array.isArray(obj.labels) === false && obj.labels && typeof obj.labels === 'object') {
      const L = obj.labels as Record<string, unknown>
      for (const [k, v] of Object.entries(L)) {
        if (typeof v === 'string' && v.trim()) labels[k] = v.trim()
      }
    }

    const legacyRaw =
      typeof obj.legacyText === 'string'
        ? obj.legacyText
        : typeof obj.additionalNames === 'string'
          ? obj.additionalNames
          : undefined
    const legacyText = legacyRaw?.trim() || undefined

    const segmentsFromPayload =
      segmentsFromApiArray(obj.segments) ?? segmentsFromApiArray(obj.mentionSegments) ?? undefined

    const segments: UserMultiSegment[] | undefined =
      segmentsFromPayload ??
      (userIds.length || legacyRaw != null
        ? migrateToSegments({ userIds, labels, legacyText: legacyRaw ?? '' })
        : [{ type: 'text', text: '' }])

    if (segments?.length) {
      const d = deriveFromSegments(segments)
      const nextUserIds = [...d.userIds]
      const nextLabels = { ...labels, ...d.labels }
      return {
        userIds: nextUserIds,
        labels: nextLabels,
        legacyText: d.legacyText.trim() ? d.legacyText : legacyText,
        segments,
      }
    }

    return { userIds, labels, legacyText, segments }
  } catch {
    return {
      userIds: [],
      labels: {},
      legacyText: raw.trim(),
      segments: [{ type: 'text', text: raw.trim() }],
    }
  }
}

export function serializeUserMultiFormValue(state: TemplateUserMultiFormState): string {
  const { segments: rawSeg } = state
  const derived = rawSeg && rawSeg.length > 0 ? deriveFromSegments(rawSeg) : null
  const userIds = derived?.userIds ?? state.userIds
  const labels = derived?.labels ?? state.labels
  const legacyText = derived?.legacyText ?? state.legacyText ?? ''
  const leg = legacyText.trim()
  const segments = rawSeg && rawSeg.length > 0 ? rawSeg : undefined

  const hasContent =
    userIds.length > 0 ||
    leg.length > 0 ||
    (segments?.some((s) => s.type === 'mention' || (s.type === 'text' && s.text.length > 0)) ??
      false)
  if (!hasContent) return ''

  const payload: Record<string, unknown> = { userIds, labels }
  if (legacyText.length > 0) payload.legacyText = legacyText
  if (segments && segments.length > 0) payload.segments = segments
  return JSON.stringify(payload)
}

/** True if required user-multi fields should pass validation. */
export function isUserMultiValueFilled(raw: string): boolean {
  const s = parseUserMultiFormValue(raw)
  if (s.segments?.some((seg) => seg.type === 'mention')) return true
  if (s.segments?.some((seg) => seg.type === 'text' && seg.text.trim())) return true
  return s.userIds.length > 0 || Boolean(s.legacyText?.trim())
}

/**
 * Value stored in template_data JSON for new submissions (backend-friendly).
 * Legacy-only text stays a plain string for backward compatibility.
 */
export function userMultiFormStringToApiPayload(raw: string): unknown {
  const s = parseUserMultiFormValue(raw)
  if (s.userIds.length === 0) {
    if (s.legacyText?.trim()) return s.legacyText.trim()
    if (s.segments?.length) {
      const t = deriveFromSegments(s.segments).legacyText.trim()
      if (t) return t
    }
    return null
  }
  const users = s.userIds.map((id) => ({
    id,
    displayName: s.labels[String(id)]?.trim() || `User ${id}`,
  }))
  const payload: Record<string, unknown> = { userIds: s.userIds, users }
  if (s.legacyText?.trim()) payload.additionalNames = s.legacyText.trim()
  if (s.segments && s.segments.length > 0) payload.segments = s.segments
  return payload
}

function objectToFormString(obj: Record<string, unknown>): string {
  const userIds: number[] = []
  const labels: Record<string, string> = {}

  if (Array.isArray(obj.userIds)) {
    for (const x of obj.userIds) {
      const id = coerceId(x)
      if (id !== undefined && !userIds.includes(id)) userIds.push(id)
    }
  }

  if (Array.isArray(obj.users)) {
    for (const u of obj.users) {
      if (!u || typeof u !== 'object') continue
      const rec = u as Record<string, unknown>
      const id = coerceId(rec.id)
      const dn =
        (typeof rec.displayName === 'string' && rec.displayName.trim()) ||
        (typeof rec.full_name === 'string' && rec.full_name.trim()) ||
        (typeof rec.name === 'string' && rec.name.trim()) ||
        ''
      if (id !== undefined) {
        if (!userIds.includes(id)) userIds.push(id)
        if (dn) labels[String(id)] = dn
      }
    }
  }

  const legacyRaw =
    typeof obj.legacyText === 'string'
      ? obj.legacyText
      : typeof obj.additionalNames === 'string'
        ? obj.additionalNames
        : undefined
  const legacyText = legacyRaw?.trim() || undefined

  const segments =
    segmentsFromApiArray(obj.segments) ??
    segmentsFromApiArray(obj.mentionSegments) ??
    (userIds.length || legacyRaw != null
      ? migrateToSegments({ userIds, labels, legacyText: legacyRaw ?? '' })
      : undefined)

  return serializeUserMultiFormValue({ userIds, labels, legacyText, segments })
}

/** Normalize API / memo `data` field into the JSON string used in form state. */
export function apiRawValueToUserMultiFormString(fieldValue: unknown): string {
  if (fieldValue == null || fieldValue === '') return ''
  if (typeof fieldValue === 'string') {
    const t = fieldValue.trim()
    if (!t) return ''
    try {
      const p = JSON.parse(t) as unknown
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        return objectToFormString(p as Record<string, unknown>)
      }
    } catch {
      return serializeUserMultiFormValue({ userIds: [], labels: {}, legacyText: t })
    }
    return serializeUserMultiFormValue({ userIds: [], labels: {}, legacyText: t })
  }
  if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
    return objectToFormString(fieldValue as Record<string, unknown>)
  }
  return ''
}

/** Coerce user_multi keys in memo API `data` for form initialization. */
export function coerceMemoDataUserMultiFields(
  templateId: MemoTemplateId | null | undefined,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (!templateId) return data
  const ids = userMultiFieldIdsForTemplate(templateId)
  const out = { ...data }
  for (const id of ids) {
    if (!(id in out) || out[id] === undefined || out[id] === null) continue
    out[id] = apiRawValueToUserMultiFormString(out[id])
  }
  return out
}

export function isTemplateUserMultiFieldId(fieldId: string): boolean {
  return TEMPLATE_USER_MULTI_FIELD_IDS.has(fieldId)
}

export function subscribeResolvedUserMultiLabels(
  value: string,
  fetchByIds: (ids: number[]) => Promise<UserDirectoryMap>,
  apply: (serialized: string) => void
): () => void {
  const s = parseUserMultiFormValue(value)
  const missing = s.userIds.filter((id) => !s.labels[String(id)]?.trim())
  if (missing.length === 0) return () => {}
  let cancelled = false
  void fetchByIds(missing).then((dir) => {
    if (cancelled) return
    const labels = { ...s.labels }
    let changed = false
    for (const id of missing) {
      const u = dir[id]
      if (u?.fullName) {
        labels[String(id)] = u.fullName
        changed = true
      }
    }
    if (changed) {
      const nextSegs = (s.segments ?? []).map((seg) =>
        seg.type === 'mention' && dir[seg.userId]?.fullName
          ? { ...seg, displayName: dir[seg.userId]!.fullName }
          : seg
      )
      apply(
        serializeUserMultiFormValue({
          ...s,
          labels,
          segments: nextSegs.length ? nextSegs : s.segments,
        })
      )
    }
  })
  return () => {
    cancelled = true
  }
}
