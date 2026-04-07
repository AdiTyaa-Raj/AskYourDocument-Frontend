import { MaintenanceTaskData, MemoTemplateId } from '@/containers/memos/lib'
import { AlertCircle, Sparkles } from 'lucide-react'

/** Standalone upload rows: attachment column shows this (with slash), not bare "NA". */
export const DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE = 'N/A' as const

/**
 * Document Type Options for memo/research creation
 * Based on backend ContentCategory enum (Memo/Research template categories)
 */
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'models', label: 'Model' },
  { value: 'screen', label: 'Screen' },
  { value: 'going-in-value-creation-plan', label: 'Going-in Value Creation Plan' },
  { value: 'investment-memo', label: 'Investment Memo' },
  { value: 'earnings-preview', label: 'Earnings Preview' },
  { value: 'earnings-summary', label: 'Earnings Summary' },
  { value: 'target-weight-change', label: 'Target Weight Change' },
  { value: 'meeting-owned', label: 'Company Meeting - Owned' },
  { value: 'meeting-watchlist', label: 'Company Meeting - Watchlist' },
  { value: 'meeting-first', label: 'Company Meeting - First' },
  { value: 'meeting-lesser', label: 'Company Meeting - Lesser' },
  { value: 'drawdown-40', label: '40% Drawdown' },
  { value: 'miscellaneous', label: 'Misc' },
] as const

/**
 * Document Type Filter Options (includes "All Document Types")
 * Includes Models and the supported document types for filtering
 */
export const DOCUMENT_TYPE_FILTER_OPTIONS = [
  'All Document Types',
  'Model',
  'Screen',
  'Going-in Value Creation Plan',
  'Investment Memo',
  'Earnings Preview',
  'Earnings Summary',
  'Target Weight Change',
  'Company Meeting – Owned',
  'Company Meeting – Watchlist',
  'Company Meeting – First',
  'Company Meeting – Lesser',
  '40% Drawdown',
  'Misc',
] as const

/**
 * Status Filter Options (includes "All Status")
 * Maps to backend document status: DRAFT, PUBLISHED
 */
export const STATUS_FILTER_OPTIONS = ['All Status', 'Published', 'Draft'] as const

/** Map display label to API status value for filtering */
export const STATUS_DISPLAY_TO_API_MAP: Record<string, string> = {
  'All Status': '',
  Published: 'PUBLISHED',
  Draft: 'DRAFT',
}

/** Users loaded per scroll "page" for the Documents author filter (GET /users/?skip=&limit=). */
export const DOCUMENT_AUTHOR_USERS_PAGE_SIZE = 5

// Actionable Options
export const ACTIONABLE_OPTIONS = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'urgent-action', label: 'Urgent Action Required' },
  { value: 'no-action', label: 'No Action' },
] as const

// Analyst Filter Options
// Note: Should be populated from API with actual organization analysts
export const DOCUMENT_ANALYST_FILTER_OPTIONS = ['All Analysts'] as const

// Strategy Filter Options
export const DOCUMENT_STRATEGY_FILTER_OPTIONS = [
  'All Strategies',
  'Growth',
  'Value',
  'Momentum',
] as const

/**
 * Transformation Maps for API
 * Maps form values to backend ContentCategory enum values
 */
export const DOCUMENT_TYPE_TO_API_MAP: Record<string, string> = {
  // Document types
  models: 'MODELS',
  screen: 'SCREEN',
  'investment-memo': 'INVESTMENT_MEMO',

  // Memo/Research template types
  'going-in-value-creation-plan': 'GOING_IN_VALUE_CREATION_PLAN',
  'earnings-preview': 'EARNINGS_PREVIEW',
  'earnings-summary': 'EARNINGS_SUMMARY',
  'target-weight-change': 'TARGET_WEIGHT_CHANGE',
  'meeting-owned': 'MEETING_OWNED',
  'meeting-watchlist': 'MEETING_WATCHLIST',
  'meeting-first': 'MEETING_FIRST',
  'meeting-lesser': 'MEETING_LESSER',
  'drawdown-40': 'DRAWDOWN_40',
  miscellaneous: 'MISCELLANEOUS',
} as const

export const ACTIONABLE_TO_API_MAP: Record<string, string> = {
  buy: 'BUY',
  sell: 'SELL',
  'urgent-action': 'URGENT',
  'no-action': 'NO_ACTION',
} as const

/**
 * Mapping: API category values (ContentCategory enum) to user-friendly display labels
 * Used for transforming backend data to frontend display
 * Based on backend ContentCategory enum
 */
export const CATEGORY_TO_DISPLAY_TYPE_MAP: Record<string, string> = {
  // Document categories (from ContentCategory enum)
  MODELS: 'Model',
  /** Some APIs echo model_document.type as category */
  MODEL: 'Model',
  SCREEN: 'Screen',
  INVESTMENT_MEMO: 'Investment Memo',

  // Memo/Research template categories (from ContentCategory enum)
  GOING_IN_VALUE_CREATION_PLAN: 'Going-in Value Creation Plan',
  EARNINGS_PREVIEW: 'Earnings Preview',
  EARNINGS_SUMMARY: 'Earnings Summary',
  TARGET_WEIGHT_CHANGE: 'Target Weight Change',
  MEETING_OWNED: 'Company Meeting – Owned',
  MEETING_WATCHLIST: 'Company Meeting – Watchlist',
  MEETING_FIRST: 'Company Meeting – First',
  MEETING_LESSER: 'Company Meeting – Lesser',
  DRAWDOWN_40: '40% Drawdown',

  // Misc category
  MISCELLANEOUS: 'Misc',
} as const

/**
 * Reverse mapping: Display labels to API category values (ContentCategory enum)
 * Used for filtering documents by type in API calls
 * Based on backend ContentCategory enum
 */
export const DISPLAY_TYPE_TO_CATEGORY_MAP: Record<string, string> = {
  // Document categories
  Model: 'MODELS',
  Screen: 'SCREEN',
  'Investment Memo': 'INVESTMENT_MEMO',

  // Memo/Research template categories
  'Going-in Value Creation Plan': 'GOING_IN_VALUE_CREATION_PLAN',
  'Earnings Preview': 'EARNINGS_PREVIEW',
  'Earnings Summary': 'EARNINGS_SUMMARY',
  'Target Weight Change': 'TARGET_WEIGHT_CHANGE',
  'Company Meeting – Owned': 'MEETING_OWNED',
  'Company Meeting – Watchlist': 'MEETING_WATCHLIST',
  'Company Meeting – First': 'MEETING_FIRST',
  'Company Meeting – Lesser': 'MEETING_LESSER',
  '40% Drawdown': 'DRAWDOWN_40',

  // Misc category
  Misc: 'MISCELLANEOUS',
} as const

// File Upload Configuration
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
] as const

export const ACCEPTED_FILE_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx'

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes

export const FILE_TYPE_ERROR_MESSAGE = 'Please upload a PDF, Word, or Excel file'
export const FILE_SIZE_ERROR_MESSAGE = 'File size must be less than 50MB'

// Type exports for type safety
export type DocumentTypeOption = (typeof DOCUMENT_TYPE_OPTIONS)[number]
export type DocumentTypeFilter = (typeof DOCUMENT_TYPE_FILTER_OPTIONS)[number]
export type ActionableOption = (typeof ACTIONABLE_OPTIONS)[number]
export type DocumentAnalystFilter = (typeof DOCUMENT_ANALYST_FILTER_OPTIONS)[number]
export type DocumentStrategyFilter = (typeof DOCUMENT_STRATEGY_FILTER_OPTIONS)[number]

export const DEFAULT_MAINTENANCE_TASK: MaintenanceTaskData = {
  title: '',
  action: '',
  dueDate: '',
  assignees: [],
  important: false,
  status: 'TODO',
}

// Template IDs for document rendering
export const TEMPLATE_IDS = {
  SCREEN: 'screen',
  INVESTMENT_MEMO: 'investment-memo',
  VCP_SCREEN: 'vcp-screen',
  DEFAULT: 'default',
} as const

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS]

/**
 * Mapping from ContentCategory enum values to template IDs
 * Based on backend ContentCategory enum
 */
export const CATEGORY_TO_TEMPLATE_MAP: Record<string, MemoTemplateId> = {
  // Document categories
  SCREEN: 'screen',
  INVESTMENT_MEMO: 'investment-memo',

  // Memo/Research template categories
  GOING_IN_VALUE_CREATION_PLAN: 'vcp-screen',
  EARNINGS_PREVIEW: 'earnings-preview',
  EARNINGS_SUMMARY: 'earnings-summary',
  TARGET_WEIGHT_CHANGE: 'target-weight-change',
  MEETING_OWNED: 'meeting-owned',
  MEETING_WATCHLIST: 'meeting-watchlist',
  MEETING_FIRST: 'meeting-first',
  MEETING_LESSER: 'meeting-lesser',
  DRAWDOWN_40: 'drawdown-40',
}

/** AI status tooltips for Document Listing (only shown when document is published) */
export const AI_STATUS_CONFIG = {
  failed: {
    icon: AlertCircle,
    iconClass: 'text-red-500',
    tooltip: 'AI ingestion failed. Document is published but AI search is unavailable.',
  },
  completed: {
    icon: Sparkles,
    iconClass: 'text-blue-500',
    tooltip: 'AI search is ready. Ask questions about this document.',
  },
  pending: {
    icon: Sparkles,
    iconClass: 'text-blue-400 opacity-50',
    tooltip: 'AI ingestion is in progress. AI search will be available shortly.',
  },
}
