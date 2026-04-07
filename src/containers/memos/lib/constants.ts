/**
 * Exchange to Country Mapping
 * Maps stock exchange codes to country names
 */
export const EXCHANGE_TO_COUNTRY: Record<string, string> = {
  // North America
  US: 'USA',
  NYSE: 'USA',
  NASDAQ: 'USA',
  AMEX: 'USA',

  // Europe
  LSE: 'UK',
  LON: 'UK',
  FRA: 'Germany',
  PAR: 'France',
  AMS: 'Netherlands',
  SWX: 'Switzerland',
  MIL: 'Italy',
  MAD: 'Spain',

  // Asia Pacific
  HK: 'Hong Kong',
  HKEX: 'Hong Kong',
  JPX: 'Japan',
  TSE: 'Japan',
  SHA: 'China',
  SHE: 'China',
  SSE: 'China',
  SZSE: 'China',
  SGX: 'Singapore',
  ASX: 'Australia',
  NSE: 'India',
  BSE: 'India',
  KRX: 'South Korea',

  // Others
  TSX: 'Canada',
  BMV: 'Mexico',
  BOVESPA: 'Brazil',
  MOEX: 'Russia',
  JSE: 'South Africa',
}

export const MEMO_TYPE_FILTER_OPTIONS = [
  'All Types',
  'Earnings Preview',
  'Earnings Summary',
  'Target Weight Change',
  'Company Meeting – Owned',
  'Company Meeting – Watchlist',
  'Company Meeting – First',
  'Company Meeting – Lesser',
  '40% Drawdown',
  'Going-in Value Creation Plan',
  'Screen',
  'Investment Memo',
] as const

export const MEMO_STATUS_FILTER_OPTIONS = [
  'All Status',
  'Draft',
  'Submitted',
  'Approved',
  'Rejected',
] as const

export const MEMO_ANALYST_FILTER_OPTIONS = ['All Analysts'] as const

/**
 * Document type options for uploaded files
 * Based on backend ContentCategory enum (Document categories)
 */
export const UPLOAD_DOCUMENT_TYPE_OPTIONS = [
  'Model',
  'Screen',
  'Going-in Value Creation Plan',
  'Investment Memo',
  'Earnings Preview',
  'Earnings Summary',
  'Target Weight Change',
  'Company Meeting - Owned',
  'Company Meeting - Watchlist',
  'Company Meeting - First',
  'Company Meeting - Lesser',
  '40% Drawdown',
  'Misc',
] as const

/**
 * Mapping from display names to API category values
 * Based on backend ContentCategory enum
 * Used for document upload type selection
 */
export const DOCUMENT_TYPE_TO_API_CATEGORY: Record<string, string> = {
  // Document categories (for file uploads)
  Model: 'MODELS',
  Screen: 'SCREEN',
  'Going-in Value Creation Plan': 'GOING_IN_VALUE_CREATION_PLAN',
  'Investment Memo': 'INVESTMENT_MEMO',
  'Earnings Preview': 'EARNINGS_PREVIEW',
  'Earnings Summary': 'EARNINGS_SUMMARY',
  'Target Weight Change': 'TARGET_WEIGHT_CHANGE',
  'Company Meeting - Owned': 'MEETING_OWNED',
  'Company Meeting - Watchlist': 'MEETING_WATCHLIST',
  'Company Meeting - First': 'MEETING_FIRST',
  'Company Meeting - Lesser': 'MEETING_LESSER',
  '40% Drawdown': 'DRAWDOWN_40',
  Misc: 'MISCELLANEOUS',
}

/**
 * Allowed navigation and editing keys for textarea fields with word limits
 * Used to determine which keys should be allowed when a word limit is reached
 */
export const ALLOWED_NAVIGATION_KEYS = [
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'Tab',
  'Enter',
] as const

/**
 * Maintenance Task Status Options
 */
export const MAINTENANCE_TASK_STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'INPROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Completed' },
] as const

/**
 * Economics Table Metrics
 */
export const ECONOMICS_METRICS = [
  'Headcount',
  'Sharecount',
  'Invested Capital',
  'Sales',
  'GM',
  'Adj. EBITDA',
  'EBIT',
  'EBITM',
  'Incr. EBITM',
  'ROIC',
  'ROE',
  'ND/EBITDA',
  'Net Income',
  'FCF',
  'FCF Conv',
] as const

/**
 * Yes/No select options
 */
export const YES_NO_OPTIONS = ['yes', 'no'] as const

/**
 * Key data fields to track for completion percentage in Screen template
 */
export const KEY_DATA_FIELD_IDS = [
  'industryGrowthAnalysis',
  'marketStructure',
  'competitorMetrics',
  'tamExpansion',
  'moatUniqueness',
  'moatOrganization',
  'moatWidening',
  'moatProven',
  'moatConstraint',
  'economicsDataGrid',
  'founderLedAnalysis',
  'managementIncentives',
  'preMortem',
  'capitalAllocation',
] as const

/**
 * Snapshot fields configuration - Row 1
 */
export const SNAPSHOT_FIELDS_ROW_1 = [
  {
    id: 'ticker',
    label: 'TICKER',
    type: 'text' as const,
    placeholder: 'ELIX LN',
    viewOnly: true,
  },
  {
    id: 'companyName',
    label: 'NAME',
    type: 'text' as const,
    placeholder: 'Auto-fill',
    viewOnly: true,
  },
  {
    id: 'sectorIndustry',
    label: 'CLASSIFICATION',
    type: 'text' as const,
    placeholder: 'e.g., Technology, Health',
  },
  {
    id: 'country',
    label: 'COUNTRY',
    type: 'text' as const,
    placeholder: 'Auto-fill',
    viewOnly: true,
  },
] as const

/**
 * Snapshot fields configuration - Row 2
 */
export const SNAPSHOT_FIELDS_ROW_2 = [
  { id: 'gics', label: 'GICS', type: 'text' as const, placeholder: 'Auto-fill' },
  { id: 'investor', label: 'INVESTOR', type: 'text' as const, placeholder: 'Enter investor' },
  {
    id: 'currency',
    label: 'CURR',
    type: 'select' as const,
    selectOptions: ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
  },
  {
    id: 'rating',
    label: 'RATING',
    type: 'text' as const,
    placeholder: 'e.g., Buy, Hold, Sell',
  },
] as const

/**
 * Snapshot fields configuration - Row 3
 */
export const SNAPSHOT_FIELDS_ROW_3 = [
  {
    id: 'marketCap',
    label: 'MC (USD)',
    type: 'text' as const,
    placeholder: '2.8B',
  },
  { id: 'cash', label: 'CASH (USD)', type: 'text' as const, placeholder: '500M' },
  { id: 'debt', label: 'DEBT (USD)', type: 'text' as const, placeholder: '200M' },
  {
    id: 'ev',
    label: 'EV (USD)',
    type: 'text' as const,
    placeholder: '2.5B',
  },
] as const

/**
 * TAM (Total Addressable Market) fields - Row 1
 */
export const TAM_FIELDS_ROW_1 = [
  {
    id: 'tamIndustry',
    label: 'INDUSTRY',
    type: 'text' as const,
    placeholder: 'BPO Services',
  },
  {
    id: 'tamSize',
    label: 'SIZE',
    type: 'number' as const,
    placeholder: '350',
    step: '1',
  },
  { id: 'tamUnit', label: '000s', type: 'select' as const, selectOptions: ['M', 'B', 'T'] },
  { id: 'tamBaseYear', label: 'REF YEAR', type: 'number' as const, placeholder: '2018', step: '1' },
] as const

/**
 * TAM (Total Addressable Market) fields - Row 2
 */
export const TAM_FIELDS_ROW_2 = [
  {
    id: 'growthLastYear',
    label: 'GROWTH LAST YEAR',
    type: 'text' as const,
    placeholder: '3.8%',
  },
  {
    id: 'expectedSize',
    label: 'EXPECTED SIZE',
    type: 'number' as const,
    placeholder: '416',
    step: '1',
  },
  {
    id: 'expectedUnit',
    label: 'EXP. UNIT',
    type: 'select' as const,
    selectOptions: ['M', 'B', 'T'],
  },
] as const

/**
 * TAM (Total Addressable Market) fields - Row 3
 */
export const TAM_FIELDS_ROW_3 = [
  {
    id: 'expectedGrowth',
    label: 'EXPECTED GROWTH',
    type: 'text' as const,
    placeholder: '10%',
  },
  { id: 'untilYear', label: 'UNTIL YEAR', type: 'number' as const, placeholder: '2023', step: '1' },
] as const

/**
 * TAM (Total Addressable Market) fields - Row 4
 */
export const TAM_FIELDS_ROW_4 = [
  {
    id: 'cagrMode',
    label: 'CAGR MODE',
    type: 'select' as const,
    selectOptions: ['Select...', 'Automatic', 'Manual'],
  },
  { id: 'cagr', label: 'CAGR', type: 'text' as const, placeholder: '10.5%' },
] as const

/** TAM section rows: 4-col grid with empty cells on the right per Figma */
export const TAM_FIELD_GRIDS = [
  { fields: TAM_FIELDS_ROW_1 },
  { fields: TAM_FIELDS_ROW_2 },
  { fields: TAM_FIELDS_ROW_3 },
  { fields: TAM_FIELDS_ROW_4 },
] as const

/**
 * Market Share fields - Row 1
 */
export const MARKET_SHARE_ROW_1 = [
  { id: 'sales', label: 'SALES', type: 'number' as const, placeholder: '25', step: '1' },
  { id: 'salesUnit', label: '000s', type: 'select' as const, selectOptions: ['M', 'B', 'T'] },
  { id: 'region', label: 'REGION', type: 'text' as const, placeholder: 'The World' },
] as const

/**
 * Market Share fields - Row 2
 */
export const MARKET_SHARE_ROW_2 = [
  { id: 'marketShare', label: 'MARKET SHARE', type: 'text' as const, placeholder: '2.5%' },
  {
    id: 'calculationMode',
    label: 'CALCULATION MODE',
    type: 'select' as const,
    selectOptions: ['Automatic', 'Manual'],
  },
  { id: 'impliedShare', label: 'IMPLIED SHARE', type: 'text' as const, placeholder: '--%' },
] as const

/**
 * Analyzability fields for determining if a company can be analyzed
 */
export const ANALYZABILITY_FIELDS = [
  { id: 'analyzabilityWebsite', label: 'Website', selectOptions: ['...', 'Yes', 'No'] },
  { id: 'analyzabilityInvestorDeck', label: 'Investor Pres.', selectOptions: ['...', 'Yes', 'No'] },
  { id: 'analyzabilityExternalData', label: 'Info Online', selectOptions: ['...', 'Yes', 'No'] },
] as const

/**
 * Analysis questions for market and industry analysis
 */
export const ANALYSIS_QUESTIONS = [
  {
    id: 'industryGrowthAnalysis',
    label: 'How big is the industry and how fast has it been growing?',
  },
  { id: 'marketStructure', label: 'Describe the market structure' },
  {
    id: 'competitorMetrics',
    label: 'What sort of margins, returns and growth rates do the larger competitors earn?',
  },
  {
    id: 'tamExpansion',
    label: 'Have they entered new markets/products that expanded the TAM in the last 5 years?',
  },
] as const

/**
 * Moat analysis questions
 */
export const MOAT_QUESTIONS = [
  { id: 'moatUniqueness', label: 'What, if anything, makes them unique?' },
  { id: 'moatOrganization', label: 'How are their people organized (G&A, R&D, S&M % of sales)' },
  { id: 'moatWidening', label: 'Is there moat widening or shrinking?' },
  { id: 'moatProven', label: 'Is this a proven company? Why/why not?' },
  { id: 'moatConstraint', label: 'What has been the constraint to growth?' },
] as const

/**
 * Management quality questions
 */
export const MANAGEMENT_QUESTIONS = [
  { id: 'founderLedAnalysis', label: 'Is it a founder led organization?' },
  { id: 'managementIncentives', label: 'How is management incentivized?' },
] as const

/**
 * Circular Progress Constants
 */
export const CIRCULAR_PROGRESS_CONFIG = {
  RADIUS: 56,
  STROKE_WIDTH: 10,
  SVG_SIZE: 128,
  CENTER: 64,
} as const

/**
 * Screen Template View Constants - Key Data Fields
 */
export const VIEW_KEY_DATA_FIELDS = [
  { label: 'Ticker', key: 'ticker' },
  { label: 'Name', key: 'companyName' },
  { label: 'Classification', key: 'sectorIndustry' },
  { label: 'Country', key: 'country' },
  { label: 'GICS', key: 'gics' },
  { label: 'Investor', key: 'investor' },
  { label: 'Currency', key: 'currency' },
  { label: 'Rating', key: 'rating' },
  { label: 'Market Cap (USD)', key: 'marketCap' },
  { label: 'Cash (USD)', key: 'cash' },
  { label: 'Debt (USD)', key: 'debt' },
  { label: 'EV (USD)', key: 'ev' },
] as const

/**
 * Screen Template View Constants - TAM Fields
 */
export const VIEW_TAM_FIELDS = [
  { label: 'Industry', key: 'tamIndustry' },
  { label: 'Size', key: 'tamSize' },
  { label: 'Unit', key: 'tamUnit' },
  { label: 'Ref Year', key: 'tamBaseYear' },
  { label: 'Growth Last Year', key: 'growthLastYear' },
  { label: 'Expected Size', key: 'expectedSize' },
  { label: 'Expected Unit', key: 'expectedUnit' },
  { label: 'Expected Growth', key: 'expectedGrowth' },
  { label: 'Until Year', key: 'untilYear' },
  { label: 'CAGR Mode', key: 'cagrMode' },
  { label: 'CAGR', key: 'cagr' },
] as const

/**
 * Screen Template View Constants - Market Share Fields
 */
export const VIEW_MARKET_SHARE_FIELDS = [
  { label: 'Sales', key: 'sales' },
  { label: 'Sales Unit', key: 'salesUnit' },
  { label: 'Region', key: 'region' },
  { label: 'Market Share', key: 'marketShare' },
  { label: 'Calculation Mode', key: 'calculationMode' },
  { label: 'Implied Share', key: 'impliedShare' },
] as const

/**
 * Screen Template View Constants - Analyzability Fields
 */
export const VIEW_ANALYZABILITY_FIELDS = [
  { label: 'Website', key: 'analyzabilityWebsite' },
  { label: 'Investor Presentation', key: 'analyzabilityInvestorDeck' },
  { label: 'Info Online', key: 'analyzabilityExternalData' },
] as const

/**
 * Screen Template View Constants - Analysis Questions
 */
export const VIEW_ANALYSIS_QUESTIONS = [
  {
    question: 'How big is the industry and how fast has it been growing?',
    key: 'industryGrowthAnalysis',
  },
  { question: 'Describe the market structure', key: 'marketStructure' },
  {
    question: 'What sort of margins, returns and growth rates do the larger competitors earn?',
    key: 'competitorMetrics',
  },
  {
    question: 'Have they entered new markets/products that expanded the TAM in the last 5 years?',
    key: 'tamExpansion',
  },
] as const

/**
 * Screen Template View Constants - Moat Questions
 */
export const VIEW_MOAT_QUESTIONS = [
  { question: 'What, if anything, makes them unique?', key: 'moatUniqueness' },
  {
    question: 'How are their people organized (G&A, R&D, S&M % of sales)',
    key: 'moatOrganization',
  },
  { question: 'Is there moat widening or shrinking?', key: 'moatWidening' },
  { question: 'Is this a proven company? Why/why not?', key: 'moatProven' },
  { question: 'What has been the constraint to growth?', key: 'moatConstraint' },
] as const

/**
 * Screen Template View Constants - Management Questions
 */
export const VIEW_MANAGEMENT_QUESTIONS = [
  { question: 'Is it a founder led organization?', key: 'founderLedAnalysis' },
  { question: 'How is management incentivized?', key: 'managementIncentives' },
] as const

/**
 * Investment Memo View Constants - Criteria Checklist Fields
 */
export const CRITERIA_CHECKLIST_VIEW_FIELDS = [
  { label: '3.1 Returns on Capital (ROIC / ROE)', key: 'returnsOnCapitalRoicRoe' },
  { label: '3.2 Cash Conversion', key: 'cashConversion' },
  { label: '3.3 Reinvestment Rate', key: 'reinvestmentRate' },
  { label: '3.4 FCF Margins', key: 'fcfMargins' },
  { label: '3.5 Balance Sheet Strength', key: 'balanceSheetStrength' },
  { label: '3.6 Management Quality', key: 'managementQuality' },
  { label: '3.7 Valuation Margin of Safety', key: 'valuationMarginOfSafety' },
] as const

// Note: Type exports (MemoTypeFilter, MemoStatusFilter, etc.) are defined in types.ts

/**
 * Section configurations for InvestmentMemo
 */
export const MEMO_SECTIONS = [
  {
    key: 'introductionOriginStory',
    title: 'Introduction + Origin Story',
    placeholder: 'Overview of the business model, history, and why this opportunity exists...',
    useMarkdown: true,
    minHeight: 'min-h-32',
  },
  {
    key: 'thesisRecommendation',
    title: 'Thesis + Recommendation',
    placeholder: 'Summary of the investment case, edge, and return profile...',
    useMarkdown: true,
    minHeight: 'min-h-32',
  },
  // Criteria Checklist is handled separately due to unique structure
  {
    key: 'stateOfTheIndustry',
    title: 'State of the Industry',
    placeholder: 'Market size (TAM), Growth rates, Competition, Regulatory environment...',
  },
  {
    key: 'howWeLoseDollarRisks',
    title: 'How We Lose $ (RISKS)',
    placeholder: 'Valuation compression, Disruption, Macro factors, Execution risks...',
  },
  {
    key: 'keyOperationalPriorities',
    title: 'Key Operational Priorities',
    placeholder:
      'What matters most? (e.g., Cost control, Pricing power, Innovation, Churn reduction)...',
  },
  {
    key: 'fundamentalGapValueDrivers',
    title: 'Fundamental Gap & Value Drivers',
    placeholder: 'Sources of upside variance vs consensus...',
  },
  {
    key: 'furtherAreasToExplore',
    title: 'Further Areas to Explore',
    placeholder: 'Outstanding questions, channel checks needed...',
  },
] as const satisfies readonly import('./types').SectionConfig[]

/**
 * Get all section keys including criteria checklist for media blocks hook
 */
export const ALL_SECTION_KEYS = [
  'introductionOriginStory',
  'thesisRecommendation',
  'criteriaChecklist',
  'stateOfTheIndustry',
  'howWeLoseDollarRisks',
  'keyOperationalPriorities',
  'fundamentalGapValueDrivers',
  'furtherAreasToExplore',
] as const

/**
 * Section configurations for Going-in Value Creation Plan
 */
export const VCP_SECTIONS = [
  {
    key: 'sourcing',
    title: 'Sourcing',
    placeholder:
      'How did this opportunity come to our attention? (e.g., screen, referral, conference)',
  },
  {
    key: 'situationOverview',
    title: 'Situation Overview',
    placeholder: "What's happening now? Why is this interesting? What's the market missing?",
  },
  {
    key: 'nonObviousCompChecklistItems',
    title: 'Non-Obvious Compounder Checklist',
    placeholder:
      'What makes this a potential compounder? (e.g., pricing power, network effects, switching costs, reinvestment opportunities)',
  },
  {
    key: 'mistakeAvoidanceChecklistItems',
    title: 'Mistake Avoidance Checklist',
    placeholder: 'What could go wrong? What are we most likely to get wrong about this thesis?',
  },
  {
    key: 'trustBank',
    title: 'Trust Bank Account',
    placeholder: 'Track record, management credibility, capital allocation history...',
  },
  {
    key: 'historyInNumbers',
    title: 'History in Numbers - Key Takeaways',
    placeholder: '5-10 year financial performance summary. What are the key trends?',
  },
  {
    key: 'valueDrivers',
    title: 'Value Drivers',
    placeholder: 'What are the 2-3 key drivers that will create value over the next 3-5 years?',
  },
  {
    key: 'verificationSteps',
    title: 'Verification Steps',
    placeholder: 'What do we need to verify? What questions must we answer before investing?',
  },
  {
    key: 'thesisInCharts',
    title: 'Thesis in Charts Description (Optional)',
    placeholder: "Narrative description of the charts you're about to upload...",
  },
] as const satisfies readonly import('./types').SectionConfig[]

/**
 * Valuation fields for Going-in Value Creation Plan
 */
export const VCP_VALUATION_FIELDS = [
  {
    key: 'currentMultiple',
    title: 'Current Valuation Multiple',
    placeholder: 'e.g., 18.5x P/E',
    type: 'input' as const,
  },
  {
    key: 'historicalRange',
    title: 'Historical Valuation Range',
    placeholder: 'e.g., 15x - 25x P/E',
    type: 'input' as const,
  },
  {
    key: 'peerComparison',
    title: 'Peer Valuation Comparison',
    placeholder:
      "How does this company's valuation compare to peers? What explains the premium/discount?",
    type: 'textarea' as const,
  },
  {
    key: 'outstandingQuestions',
    title: 'Outstanding Questions',
    placeholder: 'What remains unanswered? What are the next steps in our diligence process?',
    type: 'textarea' as const,
  },
] as const

/**
 * Get all VCP section keys for media blocks hook
 */
export const VCP_ALL_SECTION_KEYS = [
  'sourcing',
  'situationOverview',
  'nonObviousCompChecklistItems',
  'mistakeAvoidanceChecklistItems',
  'trustBank',
  'historyInNumbers',
  'valueDrivers',
  'verificationSteps',
  'thesisInCharts',
  'currentMultiple',
  'historicalRange',
  'peerComparison',
  'outstandingQuestions',
] as const

/**
 * Sections rendered before valuation in Going-in VCP View
 */
export const PRE_VALUATION_SECTIONS: import('./types').VCPSectionConfig[] = [
  { title: 'Sourcing', sectionKey: 'sourcing' },
  { title: 'Situation Overview', sectionKey: 'situationOverview' },
  { title: 'Non-Obvious Compounder Checklist', sectionKey: 'nonObviousCompChecklistItems' },
  { title: 'Mistake Avoidance Checklist', sectionKey: 'mistakeAvoidanceChecklistItems' },
  { title: 'Trust Bank Account', sectionKey: 'trustBank' },
  { title: 'History in Numbers - Key Takeaways', sectionKey: 'historyInNumbers' },
  { title: 'Value Drivers', sectionKey: 'valueDrivers' },
  { title: 'Verification Steps', sectionKey: 'verificationSteps' },
  { title: 'Thesis in Charts Description', sectionKey: 'thesisInCharts' },
]
