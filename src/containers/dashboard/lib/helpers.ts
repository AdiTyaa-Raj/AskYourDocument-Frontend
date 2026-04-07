import type { NotificationApiItem } from '@/containers/notifications/lib/types'

const parseApprovalIdFromActionUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const queryMatch = trimmed.match(/^\/approvals?\?/i)
  if (queryMatch) {
    const queryString = trimmed.split('?')[1] ?? ''
    const params = new URLSearchParams(queryString)
    const id = params.get('id')
    return id && id.trim().length ? id.trim() : undefined
  }

  const approvalMatch = trimmed.match(/^\/approvals?\/([^/]+)(?:\/)?$/i)
  return approvalMatch?.[1]
}

const parseApprovalIdFromMeta = (meta: unknown): string | undefined => {
  if (Array.isArray(meta)) {
    const first = meta[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      const record = first as Record<string, unknown>
      const id = record.id ?? record.request_id
      return typeof id === 'number' || typeof id === 'string' ? String(id) : undefined
    }
    return undefined
  }

  if (meta && typeof meta === 'object') {
    const record = meta as Record<string, unknown>
    const id = record.request_id ?? record.id
    return typeof id === 'number' || typeof id === 'string' ? String(id) : undefined
  }

  return undefined
}

const parseApprovalIdFromEntityId = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  return undefined
}

export const normaliseActionUrl = (
  event: Pick<
    NotificationApiItem['SystemEvent'],
    'action_url' | 'entity_type' | 'entity_id' | 'meta'
  >
): string | undefined => {
  const approvalId =
    parseApprovalIdFromActionUrl(event.action_url) ??
    parseApprovalIdFromMeta(event.meta) ??
    parseApprovalIdFromEntityId(event.entity_id)
  if (event.entity_type === 'approval' && approvalId) {
    return `/approvals?id=${approvalId}&filter=all`
  }

  const actionUrl = typeof event.action_url === 'string' ? event.action_url.trim() : ''
  if (!actionUrl) return undefined

  const maintenanceMatch = actionUrl.match(/^\/maintenance\/(\d+)(?:\/)?$/)
  if (maintenanceMatch) {
    return '/pipeline?tab=maintenance'
  }

  return actionUrl.startsWith('/') ? actionUrl : undefined
}
