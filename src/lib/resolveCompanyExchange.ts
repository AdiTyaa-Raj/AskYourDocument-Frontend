import type { PipelineStageCompanyRecordApi } from '@/services/api/pipeline.service'

type CompanyLike = PipelineStageCompanyRecordApi['Company']

/**
 * Listing exchange may be returned on Company, in meta.exchange, or as meta.exchanges (string/array).
 */
export function resolveCompanyExchange(company: CompanyLike): string {
  if (typeof company.exchange === 'string') {
    const trimmed = company.exchange.trim()
    if (trimmed) return trimmed
  }
  const meta = (company.meta ?? {}) as Record<string, unknown>
  if (typeof meta.exchange === 'string') {
    const trimmed = meta.exchange.trim()
    if (trimmed) return trimmed
  }
  if (typeof meta.exchanges === 'string') {
    const trimmed = meta.exchanges.trim()
    if (trimmed) return trimmed
  }
  if (Array.isArray(meta.exchanges) && meta.exchanges.length > 0) {
    const first = meta.exchanges[0]
    if (typeof first === 'string' && first.trim()) return first.trim()
  }
  return ''
}

/** Table row `exchange` after transforms (see coverage query transforms). */
export function resolveExchangeFromCompanyRow(row: Record<string, unknown>): string {
  const ex = row.exchange
  if (typeof ex === 'string') {
    const t = ex.trim()
    if (t) return t
  }
  return ''
}
