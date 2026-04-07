import { type UniverseTableRow } from '@/containers/coverage/lib/types'
import { type SearchUniverseItem, type FlatCompanyItem } from './types'
import type { Notification, NotificationFilter } from '@/containers/notifications/lib/types'

/**
 * Filter a list of (unread) notifications by the active popover filter tab.
 * All notifications passed in are already unread; sub-filters narrow by type.
 */
export function filterPopoverNotifications(
  notifications: Notification[],
  filter: NotificationFilter
): Notification[] {
  switch (filter) {
    case 'approvals':
      return notifications.filter((n) => n.type === 'approval')
    case 'alerts':
      return notifications.filter((n) => n.type === 'alert')
    case 'pipeline':
      return notifications.filter((n) => n.type === 'pipeline')
    case 'documents':
      return notifications.filter((n) => n.type === 'document')
    case 'maintenance':
      return notifications.filter((n) => n.type === 'maintenance')
    case 'unread':
    default:
      return notifications
  }
}

export function isSearchUniverseItem(
  item: SearchUniverseItem | FlatCompanyItem
): item is SearchUniverseItem {
  return typeof item === 'object' && item !== null && 'Universe' in item && 'Company' in item
}

/**
 * Transform flat Company (from /search/Universe API) to table row format
 */
export function transformFlatCompanyToTableRow(company: FlatCompanyItem): UniverseTableRow {
  const meta = (company.meta || {}) as Record<string, string | undefined>
  const parseNumber = (value: string | undefined, defaultValue: number = 0): number => {
    if (!value) return defaultValue
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
  }
  const parseRiskReward = (value: string | undefined): number => {
    if (!value) return 0
    const cleaned = value.replace('x', '').trim()
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }
  const parseAdtv = (value: string | undefined): number => {
    if (!value) return 0
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed * 1_000_000
  }
  const exchange =
    typeof company.exchange === 'string'
      ? company.exchange
      : typeof meta.exchanges === 'string'
        ? meta.exchanges
        : Array.isArray(meta.exchanges)
          ? ((meta.exchanges[0] as string) ?? '')
          : ''

  return {
    id: company.id,
    ticker: company.ticker,
    securityDescription: company.name,
    exchange,
    price: parseNumber(meta.price),
    ive: parseNumber(meta.ive),
    riskReward: parseRiskReward(meta.rr),
    sector: meta.sector || '',
    country: meta.country || '',
    mCapM: parseNumber(meta.mcap_usd_m),
    adtv: parseAdtv(meta.adtv_m),
    primaryAnalyst: meta.platform || '',
    primaryAnalystName: '',
    requiredAttachments: {},
  }
}
