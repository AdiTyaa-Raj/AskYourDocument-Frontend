// Tearsheet component interfaces and types

// API Response interfaces
export interface ApiCompanyMeta {
  rr: string
  iv: string
  isin: string // Single ISIN code (not an array)
  price: string
  adtv_m: string
  sector: string
  country: string
  exchange: string // Single exchange (not an array)
  platform: string
  isin_list: string[] // Array of ISINs
  mcap_usd_m: string
}

export interface ApiCompany {
  created_at: string
  updated_at: string
  name: string
  id: number
  ticker: string
  meta: ApiCompanyMeta
  exchange?: string
}

export interface ApiKeyMetrics {
  iv: number | null
  downside: number | null
  irr: number | null
  moc: number | null
  risk_reward: number | null
  internal_eps_q1_2025: number | null
  consensus_eps_q1_2025: number | null
}

export interface ApiTearsheetDocumentSource {
  content_id: number
  title: string
  author_name?: string | null
  published_at?: string | null
  updated_at?: string | null
  content_type?: string | null
  category?: string | null
  s3_object_name?: string | null
  file_metadata?: {
    filename?: string
    file_size?: number
    mime_type?: string
    file_extension?: string
    original_filename?: string
    author?: string | null
  } | null
}

export interface ApiFinancialPeriod {
  eps?: number | null
  ebitda_m?: number | null
  ebit_m?: number | null
  npat_m?: number | null
  revenue_m?: number | null
  dps?: number | null
  pe?: number | null
  eps_growth_pct?: number | null
}

export interface ApiFinancialsRatios {
  last_year: ApiFinancialPeriod
  next_year: ApiFinancialPeriod
  year_after: ApiFinancialPeriod
}

export type ApiInvestmentThesis =
  | {
      text?: string | null
      reason?: string | null
      summary?: string | null
      key_risks?: string[]
      key_drivers?: string[]
    }
  | string
  | null

export interface ApiEarningsQuarter {
  quarter: string
  internal?: number
  consensus?: number
}

export interface ApiEarningsExpectations {
  forward: ApiEarningsQuarter[]
  historical: ApiEarningsQuarter[]
}

export interface ApiTearsheetMeta {
  company_id: number | null
  id: number | null
  updated_at: string | null
  created_at: string | null
  meta: {
    key_metrics: ApiKeyMetrics
    price_history?: ApiPriceHistoryItem[]
    financials_ratios: ApiFinancialsRatios
    investment_thesis: ApiInvestmentThesis
    earnings_expectations: ApiEarningsExpectations
    key_metrics_source?: ApiTearsheetDocumentSource
    investment_thesis_source?: ApiTearsheetDocumentSource
  }
}

export interface ApiStageAssignments {
  updated_at: string
  meta: Record<string, unknown> | null
  company_id: number
  stage_id: number
  active: boolean
  created_at: string
  effective_date: string | null
  id: number
  active_until: string | null
}

export interface ApiStage {
  id: number
  name: string
  slug: string
  order: number
  created_at: string
  updated_at: string
  meta: {
    workflow_config?: {
      stage_slug: string
      template_id: number
    }
  }
}

// New YFinance EPS data structure
export interface ApiYFinanceEpsQuarter {
  quarter: string
  internal: number | null
  consensus: number | null
}

// Updated YFinance interface to support both old and new API structures
export interface ApiYFinance {
  // Legacy fields (may be undefined in new API)
  current_price?: number
  daily_change_abs?: number
  daily_change_pct?: number
  last_update_time?: string
  market_status?: string
  company_name?: string
  ticker_symbol?: string
  exchange?: string
  currency?: string
  revenue_last_year?: number
  ebitda_last_year?: number
  eps_last_year?: number
  last_4_quarters_eps?: number[]

  // New fields
  forward_eps?: ApiYFinanceEpsQuarter[]
  historical_eps?: ApiYFinanceEpsQuarter[]
}

export interface ApiSecFiling {
  form_type: string
  filing_date: string
  url: string
  data: {
    accession: string
  }
}

export interface AnalystDetail {
  id: number
  name: string
  full_name: string
  email: string
}

export interface ApiAnalystDetails {
  primary_analyst: AnalystDetail[]
  secondary_analyst: AnalystDetail[]
}

export interface TearsheetApiResponse {
  company: ApiCompany
  tearsheet_meta: ApiTearsheetMeta
  stage_assignments: [ApiStageAssignments[], number] | ApiStageAssignments
  stage?: ApiStage
  yfinance: ApiYFinance
  sec_filings: ApiSecFiling[]
  events: ApiEvent[]
  analyst_details?: ApiAnalystDetails
}

// Common types
export type MetricField = 'iv' | 'downside' | 'target' | 'irr' | 'moc' | 'riskReward'

// FinancialsTable interfaces
export interface FinancialRow {
  metric: string
  lastYear: string
  nextYear: string
  yearAfter: string
}

export interface FinancialsTableProps {
  financialsData: FinancialRow[]
  companyId: number
  onSaveFinancials: (financialData: FinancialRow[]) => Promise<void>
  isSaving?: boolean
}

// InvestmentThesis interfaces
export interface InvestmentThesis {
  text: string
}

export interface InvestmentThesisSource {
  title: string
  date: string
  authorName?: string
  url?: string
}

export interface InvestmentThesisProps {
  investmentThesis: InvestmentThesis
  companyId: number
  sourceDoc?: InvestmentThesisSource | null
  onSaveThesis: (text: string, reason: string) => Promise<{ success: boolean }>
  isLoading: boolean
}

// SECFilings interfaces
export interface Filing {
  date: string
  title: string
  source: string
  url: string
}

export interface SECFilingsProps {
  filings: Filing[]
}

// EditMetricModal interfaces
export interface EditMetricModalProps {
  showModal: boolean
  onClose: () => void
  editField: MetricField | null
  editValue: string
  editReason: string
  onValueChange: (value: string) => void
  onReasonChange: (reason: string) => void
  onSave: () => void
}

// EventsSection interfaces - Updated for new API structure

// Calendar event raw payload types (Microsoft Graph API structure)
export interface EmailAddress {
  name?: string
  address?: string
}

export interface Attendee {
  emailAddress?: EmailAddress
  name?: string
  type?: string
}

export interface Organizer {
  emailAddress?: EmailAddress
}

export interface LocationAddress {
  street?: string
  city?: string
  state?: string
  postalCode?: string
  countryOrRegion?: string
}

export interface Location {
  displayName?: string
  address?: LocationAddress
}

export interface RawEventPayload {
  organizer?: Organizer
  attendees?: Attendee[]
  location?: Location
  [key: string]: unknown
}

export interface ApiEvent {
  id: number
  title: string
  description: string
  start_time: string
  end_time: string
  location: string
  category: string
  is_recurring: boolean
  updated_at: string
  user_id: number
  recurrence: Record<string, unknown> | null
  org_id: number
  web_link: string
  connection_id: number
  raw_payload: RawEventPayload
  last_synced_at: string
  calendar_id: string
  external_event_id: string
  tickers: number[]
  all_day: boolean
  created_at: string
}

// Legacy interfaces for backwards compatibilitypnpm
export interface InternalEvent {
  date: string
  type: string
  attendees: string[]
  location: string
  hasNote: boolean
  daysOverdue?: number
}

export interface PublicEvent {
  date: string
  event: string
  type: string
}

export interface FieldTrip {
  date: string
  destination: string
  attendees: string[]
  hasNote: boolean
  daysOverdue?: number
}

// Updated EventsData to handle new array of events structure
export interface EventsData {
  events: ApiEvent[]
  // Legacy structure for backwards compatibility
  internal: InternalEvent[]
  public: PublicEvent[]
  fieldTrips: FieldTrip[]
}

export interface EventsSectionProps {
  eventsData: EventsData
}

// KeyMetrics interfaces
export interface KeyMetricsData {
  iv: string
  downside: string
  target: string
  irr: string
  moc: string
  riskReward: string
}

export interface KeyMetricsProps {
  keyMetrics: KeyMetricsData
  onEdit: (field: MetricField, currentValue: string) => void
  sourceDoc?: LinkedDoc | null
}

// Document API interfaces
export interface ApiDocument {
  id: number
  mime_type: string
  company_ids: number[]
  embedding_status: string
  doc_metadata: Record<string, unknown> | null
  file_hash: string | null
  created_at: string
  analysis_status: string
  uploaded_by: number
  description: string
  extracted_text: string | null
  user_id: number
  extracted_data: Record<string, unknown> | null
  user_access: number[]
  org_id: number
  schema_data: Record<string, unknown>
  extraction_error: string | null
  file_extension: string
  analysis_data: Record<string, unknown> | null
  filename: string
  document_type: string
  updated_at: string
  original_filename: string
  s3_object_name: string
  text_extraction_status: string
  file_size: number
  actionable: string
  chunking_status: string
}

export interface ApiDocumentsResponse {
  data: ApiDocument[]
  total: number
  skip: number
  limit: number
  message: string
}

// LinkedDocuments interfaces
export interface LinkedDoc {
  id: number
  title: string
  type: string
  date: string
  filename: string
  fileSize: number
  status: string
  description: string
  url?: string
}

export interface LinkedDocumentsProps {
  linkedDocs: LinkedDoc[]
}

// PriceChart interfaces
export interface PriceData {
  date: string
  price: number
  iv: number
  weight: number
}

// API response format for price history
export interface ApiPriceHistoryItem {
  iv: number
  created_at: string
  price_history: number
}

export interface PriceChartProps {
  priceData: PriceData[]
}

// CompanyHeader interfaces
export interface CompanyInfo {
  name: string
  ticker: string
  exchange?: string
  status: string
  currentPrice: string
  priceChange: string
  lastUpdated: string
}

export interface CompanyHeaderProps {
  companyInfo: CompanyInfo
}

// EarningsChart interfaces
export interface EarningsData {
  date: string
  consensus: number
  internal: number
}

export interface EditableQuarter {
  quarter: string
  consensus: string
  internal: string
}

export interface EarningsChartProps {
  earningsData: EarningsData[]
  onSaveEarnings: (historicalData: EarningsData[], forwardData: EarningsData[]) => Promise<void>
  isSaving?: boolean
}

// Earnings update API interfaces
export interface ApiEarningsUpdateQuarter {
  quarter: string
  internal: number | null
  consensus: number | null
}

export interface ApiEarningsUpdatePayload {
  forward_eps: ApiEarningsUpdateQuarter[]
  historical_eps: ApiEarningsUpdateQuarter[]
}

// TearsheetContainer interfaces
export interface TearsheetContainerProps {
  companyId: number
}

// AnalystInfo interfaces
export interface AnalystInfo {
  id: number
  name: string
  fullName: string
  email: string
}

export interface AnalystDetailsData {
  primaryAnalysts: AnalystInfo[]
  secondaryAnalysts: AnalystInfo[]
  stageAssignmentId?: number
}

export interface AnalystInfoProps {
  analystDetails: AnalystDetailsData | null
  companyName?: string
  ticker?: string
  tickerExchange?: string
  refetch?: () => void
}
