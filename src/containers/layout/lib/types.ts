import { type UserMenuUser } from '@/components/layout/UserMenu'
import { type UniverseTableRow } from '@/containers/coverage/lib/types'
import { type Notification } from '@/containers/notifications/lib/types'

// Container Props
export interface AppHeaderContainerProps {
  title?: string
}

// Notification Popover Props
export interface NotificationPopoverProps {
  notifications: Notification[]
  isLoading: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

// Search Results
export interface SearchResults {
  mentionTerm: string
  isSearchingCompanies: boolean
  companies: UniverseTableRow[]
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => void
}

// Component Props
export interface AppHeaderProps {
  title?: string
  user: UserMenuUser
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  searchResults: SearchResults
  onCompanySelect: (company: UniverseTableRow) => void
  notifications: Notification[]
  isNotificationsLoading: boolean
  isNotificationPopoverOpen: boolean
  onNotificationPopoverOpenChange: (open: boolean) => void
}

// API Types from layout.service.ts
export interface UniverseData {
  updated_at: string
  created_at: string
  meta: {
    rr?: string
    ive?: string
    isin?: string | string[]
    price?: string
    adtv_m?: string
    sector?: string
    country?: string
    exchange?: string | string[]
    platform?: string
    isin_list?: string[]
    mcap_usd_m?: string
  }
  id: number
  ticker: string
  is_default: boolean
  company_id?: number | null
}

export interface CompanyData {
  created_at: string
  updated_at: string
  ticker: string
  meta: {
    rr?: string
    ive?: string
    isin?: string | string[]
    price?: string
    adtv_m?: string
    sector?: string
    country?: string
    exchange?: string | string[]
    platform?: string
    isin_list?: string[]
    mcap_usd_m?: string
  }
  id?: number | null
  name: string
}

export interface SearchUniverseItem {
  Universe: UniverseData
  Company: CompanyData
}

/**
 * Flat company shape returned by /search/Universe (backend returns Company list, not Universe+Company)
 */
export interface FlatCompanyItem {
  id: number
  ticker: string
  name: string
  meta?: Record<string, unknown> | null
  [key: string]: unknown
}

export interface SearchUniverseResponse {
  data: SearchUniverseItem[]
  total: number
}
