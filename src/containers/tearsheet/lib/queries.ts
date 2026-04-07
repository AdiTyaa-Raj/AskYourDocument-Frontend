import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tearsheetService } from '@/services/api/tearsheet.service'
import { formatDate, formatDateTime } from '@/lib/date-utils'
import type {
  TearsheetApiResponse,
  ApiEarningsQuarter,
  FinancialRow,
  EarningsData,
  PriceData,
  KeyMetricsData,
  InvestmentThesis,
  InvestmentThesisSource,
  CompanyInfo,
  LinkedDoc,
  Filing,
  EventsData,
  ApiKeyMetrics,
  ApiEvent,
  ApiYFinanceEpsQuarter,
  RawEventPayload,
  Attendee,
  ApiDocument,
  ApiDocumentsResponse,
  ApiEarningsUpdatePayload,
  AnalystDetailsData,
  ApiStageAssignments,
} from './type'

// Data transformation functions
export function transformCompanyInfo(apiResponse: TearsheetApiResponse): CompanyInfo {
  const { company, yfinance, stage } = apiResponse

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return `$${numPrice.toFixed(2)}`
  }
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  // Get price data - try yfinance first, then company.meta as fallback
  const currentPrice =
    yfinance?.current_price ||
    (company?.meta?.price ? parseFloat(String(company.meta.price)) : null) ||
    0
  const dailyChange = yfinance?.daily_change_pct || 0
  const lastUpdate = yfinance?.last_update_time || new Date().toISOString()

  const exchangeRaw = company?.exchange
  const exchange =
    typeof exchangeRaw === 'string' && exchangeRaw.trim().length > 0
      ? exchangeRaw.trim()
      : undefined

  return {
    name: company?.name || 'Unknown',
    ticker: company?.ticker || '',
    exchange,
    status: stage?.name || 'Unknown',
    currentPrice: formatPrice(currentPrice),
    priceChange: formatChange(dailyChange),
    lastUpdated: formatDateTime(lastUpdate),
  }
}

export function transformKeyMetrics(apiResponse: TearsheetApiResponse): KeyMetricsData {
  const metrics = apiResponse?.tearsheet_meta?.meta?.key_metrics

  const formatValue = (value: number | null | undefined): string => {
    return value !== null && value !== undefined ? value.toString() : 'N/A'
  }

  if (!metrics) {
    return {
      iv: 'N/A',
      downside: 'N/A',
      target: 'N/A',
      irr: 'N/A',
      moc: 'N/A',
      riskReward: 'N/A',
    }
  }

  return {
    iv: formatValue(metrics.iv),
    downside: formatValue(metrics.downside),
    target: formatValue(calculateTargetPrice(metrics)),
    irr: formatValue(metrics.irr),
    moc: formatValue(metrics.moc),
    riskReward: formatValue(metrics.risk_reward),
  }
}

export function transformKeyMetricsSourceDoc(apiResponse: TearsheetApiResponse): LinkedDoc | null {
  const source = apiResponse?.tearsheet_meta?.meta?.key_metrics_source

  if (!source) {
    return null
  }

  const fileMetadata = source.file_metadata ?? null
  const title =
    source.title || fileMetadata?.original_filename || fileMetadata?.filename || 'Document'
  const date = formatDate(source.updated_at || source.published_at)

  return {
    id: source.content_id,
    title,
    type: source.content_type || 'Document',
    date,
    filename: fileMetadata?.original_filename || fileMetadata?.filename || title,
    fileSize: fileMetadata?.file_size || 0,
    status: source.category || 'document',
    description: '',
    url: source.content_id ? `/documents?id=${source.content_id}` : undefined,
  }
}

export function transformInvestmentThesis(apiResponse: TearsheetApiResponse): InvestmentThesis {
  const thesis = apiResponse?.tearsheet_meta?.meta?.investment_thesis

  if (typeof thesis === 'string') {
    return {
      text: thesis,
    }
  }

  return {
    text: '',
  }
}

export function transformInvestmentThesisSourceDoc(
  apiResponse: TearsheetApiResponse
): InvestmentThesisSource | null {
  const source = apiResponse?.tearsheet_meta?.meta?.investment_thesis_source

  if (!source) {
    return null
  }

  const fileMetadata = source.file_metadata ?? null
  const title =
    source.title || fileMetadata?.original_filename || fileMetadata?.filename || 'Document'
  const date = formatDate(source.updated_at || source.published_at)
  const authorName = source.author_name || undefined

  return {
    title,
    date,
    authorName: authorName || undefined,
    url: source.content_id ? `/documents?id=${source.content_id}` : undefined,
  }
}

export function transformEarningsData(apiResponse: TearsheetApiResponse): EarningsData[] {
  const { tearsheet_meta, yfinance } = apiResponse
  const earnings = tearsheet_meta?.meta?.earnings_expectations

  // First try to use tearsheet_meta earnings data
  let allQuarters: (ApiEarningsQuarter | ApiYFinanceEpsQuarter)[] = []
  if (earnings?.historical && earnings?.forward) {
    allQuarters = [...(earnings.historical || []), ...(earnings.forward || [])]
  }

  // If tearsheet earnings data is empty, use yfinance data as fallback
  if (allQuarters.length === 0 && yfinance?.historical_eps && yfinance?.forward_eps) {
    allQuarters = [...(yfinance.historical_eps || []), ...(yfinance.forward_eps || [])]
  }

  return allQuarters.map((quarter: ApiEarningsQuarter | ApiYFinanceEpsQuarter) => ({
    date: quarter.quarter,
    consensus: quarter.consensus || 0,
    internal: quarter.internal || 0,
  }))
}

export function transformFinancialsData(apiResponse: TearsheetApiResponse): FinancialRow[] {
  const ratios = apiResponse?.tearsheet_meta?.meta?.financials_ratios

  // Helper formatting functions
  const formatMillion = (value: number) => value.toFixed(0)
  const formatNumber = (value: number) => value.toFixed(2)
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  const safeFormatValue = (
    value: number | null | undefined,
    formatType: 'million' | 'number' | 'percentage'
  ) => {
    if (value === null || value === undefined) return 'N/A'

    switch (formatType) {
      case 'million':
        return formatMillion(value)
      case 'percentage':
        return formatPercentage(value)
      case 'number':
      default:
        return formatNumber(value)
    }
  }

  if (!ratios) {
    // Return empty rows with N/A values
    return [
      { metric: 'Revenue ($m)', lastYear: 'N/A', nextYear: 'N/A', yearAfter: 'N/A' },
      { metric: 'EBITDA ($m)', lastYear: 'N/A', nextYear: 'N/A', yearAfter: 'N/A' },
      { metric: 'EBIT ($m)', lastYear: 'N/A', nextYear: 'N/A', yearAfter: 'N/A' },
      { metric: 'NPAT ($m)', lastYear: 'N/A', nextYear: 'N/A', yearAfter: 'N/A' },
      { metric: 'EPS ($)', lastYear: 'N/A', nextYear: 'N/A', yearAfter: 'N/A' },
      { metric: 'DPS ($)', lastYear: 'N/A', nextYear: 'N/A', yearAfter: 'N/A' },
      { metric: 'P/E', lastYear: 'N/A', nextYear: 'N/A', yearAfter: 'N/A' },
      { metric: 'EPS Growth', lastYear: 'N/A', nextYear: 'N/A', yearAfter: 'N/A' },
    ]
  }

  // Always show all rows, even when all values are null
  const financialRows: FinancialRow[] = [
    // Revenue ($m)
    {
      metric: 'Revenue ($m)',
      lastYear: safeFormatValue(ratios.last_year?.revenue_m, 'million'),
      nextYear: safeFormatValue(ratios.next_year?.revenue_m, 'million'),
      yearAfter: safeFormatValue(ratios.year_after?.revenue_m, 'million'),
    },
    // EBITDA ($m)
    {
      metric: 'EBITDA ($m)',
      lastYear: safeFormatValue(ratios.last_year?.ebitda_m, 'million'),
      nextYear: safeFormatValue(ratios.next_year?.ebitda_m, 'million'),
      yearAfter: safeFormatValue(ratios.year_after?.ebitda_m, 'million'),
    },
    // EBIT ($m)
    {
      metric: 'EBIT ($m)',
      lastYear: safeFormatValue(ratios.last_year?.ebit_m, 'million'),
      nextYear: safeFormatValue(ratios.next_year?.ebit_m, 'million'),
      yearAfter: safeFormatValue(ratios.year_after?.ebit_m, 'million'),
    },
    // NPAT ($m)
    {
      metric: 'NPAT ($m)',
      lastYear: safeFormatValue(ratios.last_year?.npat_m, 'million'),
      nextYear: safeFormatValue(ratios.next_year?.npat_m, 'million'),
      yearAfter: safeFormatValue(ratios.year_after?.npat_m, 'million'),
    },
    // EPS ($)
    {
      metric: 'EPS ($)',
      lastYear: safeFormatValue(ratios.last_year?.eps, 'number'),
      nextYear: safeFormatValue(ratios.next_year?.eps, 'number'),
      yearAfter: safeFormatValue(ratios.year_after?.eps, 'number'),
    },
    // DPS ($)
    {
      metric: 'DPS ($)',
      lastYear: safeFormatValue(ratios.last_year?.dps, 'number'),
      nextYear: safeFormatValue(ratios.next_year?.dps, 'number'),
      yearAfter: safeFormatValue(ratios.year_after?.dps, 'number'),
    },
    // P/E
    {
      metric: 'P/E',
      lastYear: safeFormatValue(ratios.last_year?.pe, 'number'),
      nextYear: safeFormatValue(ratios.next_year?.pe, 'number'),
      yearAfter: safeFormatValue(ratios.year_after?.pe, 'number'),
    },
    // EPS Growth
    {
      metric: 'EPS Growth',
      lastYear: safeFormatValue(ratios.last_year?.eps_growth_pct, 'percentage'),
      nextYear: safeFormatValue(ratios.next_year?.eps_growth_pct, 'percentage'),
      yearAfter: safeFormatValue(ratios.year_after?.eps_growth_pct, 'percentage'),
    },
  ]

  return financialRows
}

export function transformPriceData(apiResponse: TearsheetApiResponse): PriceData[] {
  const { yfinance, tearsheet_meta, company } = apiResponse

  // Check if price_history data exists in the API response
  const priceHistoryData = tearsheet_meta?.meta?.price_history

  if (priceHistoryData && Array.isArray(priceHistoryData) && priceHistoryData.length > 0) {
    // Transform the API response data to the format expected by the chart
    return priceHistoryData.map((item) => ({
      date: item.created_at, // Use created_at as the date
      price: item.price_history, // Use price_history as the price
      iv: item.iv, // Use iv from the data
      weight: parseFloat(String(company?.meta?.mcap_usd_m || '0')) || 0,
    }))
  }

  // Fallback: Generate mock data if no price_history is available
  const ivPrice = tearsheet_meta?.meta?.key_metrics?.iv ?? 0
  const currentPrice =
    yfinance?.current_price ||
    (company?.meta?.price ? parseFloat(String(company.meta.price)) : null) ||
    100
  const mockPriceData: PriceData[] = []
  const currentDate = new Date()

  for (let i = 12; i >= 0; i--) {
    const date = new Date(currentDate)
    date.setMonth(date.getMonth() - i)

    // Generate mock price with some variation around current price
    const variation = (Math.random() - 0.5) * 0.2 // ±10% variation
    const price = currentPrice * (1 + variation)

    mockPriceData.push({
      date: date.toISOString().split('T')[0],
      price: price,
      iv: ivPrice,
      weight: parseFloat(String(company?.meta?.mcap_usd_m || '0')) || 0,
    })
  }

  return mockPriceData
}

export function transformSECFilings(apiResponse: TearsheetApiResponse): Filing[] {
  if (!apiResponse?.sec_filings || !Array.isArray(apiResponse.sec_filings)) {
    return []
  }
  return apiResponse.sec_filings.map((filing) => ({
    date: filing.filing_date,
    title: `${filing.form_type} - ${filing.data?.accession || ''}`,
    source: filing.form_type,
    url: filing.url,
  }))
}

export function transformLinkedDocuments(
  documentsResponse: ApiDocumentsResponse | null
): LinkedDoc[] {
  if (!documentsResponse || !documentsResponse.data) {
    return []
  }

  return documentsResponse.data.map((doc: ApiDocument) => {
    // Map document_type to display type
    const getDocumentType = (docType: string) => {
      const typeMap: Record<string, string> = {
        SCREEN: 'Research Screen',
        MEMO: 'Investment Memo',
        TRANSCRIPT: 'Transcript',
        REPORT: 'Research Report',
        PRESENTATION: 'Presentation',
        FINANCIAL: 'Financial Document',
      }
      return typeMap[docType] || docType
    }

    // Get status based on processing states
    const getStatus = (doc: ApiDocument) => {
      if (
        doc.text_extraction_status === 'COMPLETED' &&
        doc.analysis_status === 'COMPLETED' &&
        doc.embedding_status === 'COMPLETED'
      ) {
        return 'Processed'
      } else if (
        doc.text_extraction_status === 'FAILED' ||
        doc.analysis_status === 'FAILED' ||
        doc.embedding_status === 'FAILED'
      ) {
        return 'Failed'
      } else {
        return 'Processing'
      }
    }

    return {
      id: doc.id,
      title: doc.original_filename,
      type: getDocumentType(doc.document_type),
      date: formatDate(doc.created_at),
      filename: doc.filename,
      fileSize: doc.file_size,
      status: getStatus(doc),
      description: doc.description || '',
      url: `/documents/${doc.id}`,
    }
  })
}

export function transformEventsData(apiResponse: TearsheetApiResponse): EventsData {
  // Handle new API structure where events is an array of ApiEvent objects
  const apiEvents = apiResponse.events || []

  if (!Array.isArray(apiEvents) || apiEvents.length === 0) {
    return {
      events: [],
      internal: [],
      public: [],
      fieldTrips: [],
    }
  }

  // Initialize the result structure
  const transformedEvents: EventsData = {
    events: apiEvents,
    internal: [],
    public: [],
    fieldTrips: [],
  }

  // Extract attendees from raw_payload, including organizer info
  const getAttendees = (rawPayload: RawEventPayload): string[] => {
    const attendees: string[] = []

    // Add organizer if available
    if (rawPayload?.organizer?.emailAddress?.name) {
      attendees.push(rawPayload.organizer.emailAddress.name)
    }

    // Add other attendees if available
    if (rawPayload?.attendees && Array.isArray(rawPayload.attendees)) {
      rawPayload.attendees.forEach((attendee: Attendee) => {
        const name = attendee?.emailAddress?.name || attendee?.name
        if (name && !attendees.includes(name)) {
          attendees.push(name)
        }
      })
    }

    return attendees.length > 0 ? attendees : []
  }

  // Extract location with improved logic
  const getLocation = (event: ApiEvent): string => {
    // First try the location field
    if (event.location && event.location.trim() !== '') {
      return event.location
    }

    // Then try raw_payload location data
    const rawLocation = event.raw_payload?.location
    if (rawLocation?.displayName && rawLocation.displayName.trim() !== '') {
      return rawLocation.displayName
    }

    // Build from address components if available
    if (rawLocation?.address) {
      const parts = [
        rawLocation.address.street,
        rawLocation.address.city,
        rawLocation.address.state,
      ].filter((part) => part && part.trim() !== '')

      if (parts.length > 0) {
        return parts.join(', ')
      }
    }

    return ''
  }

  // Process each event and categorize it
  apiEvents.forEach((apiEvent) => {
    const eventDate = formatDate(apiEvent.start_time, { month: 'short', day: 'numeric' })
    const attendees = getAttendees(apiEvent.raw_payload)
    const location = getLocation(apiEvent)

    // Categorize based on category field
    if (apiEvent.category === 'internal_meeting') {
      transformedEvents.internal.push({
        date: eventDate,
        type: apiEvent.title,
        attendees,
        location,
        hasNote: !!apiEvent.description,
        daysOverdue: undefined, // Could calculate if needed
      })
    } else if (apiEvent.category === 'public_event') {
      transformedEvents.public.push({
        date: eventDate,
        event: apiEvent.title,
        type: apiEvent.category,
      })
    } else if (apiEvent.category === 'field_research' || apiEvent.category === 'field_trip') {
      // Map field_research to fieldTrips for UI compatibility
      transformedEvents.fieldTrips.push({
        date: eventDate,
        destination: location || apiEvent.title,
        attendees,
        hasNote: !!apiEvent.description,
        daysOverdue: undefined, // Could calculate if needed
      })
    } else {
      // Default to internal for unknown categories
      transformedEvents.internal.push({
        date: eventDate,
        type: apiEvent.title,
        attendees,
        location,
        hasNote: !!apiEvent.description,
        daysOverdue: undefined,
      })
    }
  })

  return transformedEvents
}

export function transformAnalystDetails(
  apiResponse: TearsheetApiResponse
): AnalystDetailsData | null {
  const details = apiResponse?.analyst_details

  if (!details) {
    return null
  }

  const stageAssignments = apiResponse?.stage_assignments
  let stageAssignmentId: number | undefined
  if (stageAssignments && !Array.isArray(stageAssignments)) {
    stageAssignmentId = (stageAssignments as ApiStageAssignments).id
  } else if (Array.isArray(stageAssignments)) {
    // Tuple shape: [ApiStageAssignments[], number]
    const innerArray = stageAssignments[0]
    if (Array.isArray(innerArray) && innerArray.length > 0) {
      stageAssignmentId = innerArray[0].id
    }
  }

  return {
    stageAssignmentId,
    primaryAnalysts: (details.primary_analyst || []).map((a) => ({
      id: a.id,
      name: a.name,
      fullName: a.full_name,
      email: a.email,
    })),
    secondaryAnalysts: (details.secondary_analyst || []).map((a) => ({
      id: a.id,
      name: a.name,
      fullName: a.full_name,
      email: a.email,
    })),
  }
}

function calculateTargetPrice(metrics: ApiKeyMetrics): number | null {
  // Simple calculation based on IV and other metrics
  if (metrics.iv === null || metrics.iv === undefined) {
    return null
  }
  return metrics.iv * 1.1 // 10% above IV as an example
}

// React Query hooks
export function useTearsheetQuery(companyId: number) {
  return useQuery({
    queryKey: ['tearsheet', companyId],
    queryFn: () => tearsheetService.getTearsheetData(companyId),
    enabled: !!companyId,
  })
}

export function useTearsheetData(companyId: number) {
  const { data: apiResponse, ...queryResult } = useTearsheetQuery(companyId)
  if (!apiResponse) {
    return {
      ...queryResult,
      companyInfo: null,
      keyMetrics: null,
      investmentThesis: null,
      earningsData: null,
      financialsData: null,
      priceData: null,
      secFilings: null,
      eventsData: null,
      keyMetricsSourceDoc: null,
      investmentThesisSourceDoc: null,
      analystDetails: null,
    }
  }

  // Wrapper to safely transform data and handle API errors
  const safeTransform = <T>(fn: () => T, fallback: T | null = null): T | null => {
    try {
      return fn()
    } catch (error) {
      console.error('Tearsheet data transformation error:', error)
      return fallback
    }
  }

  return {
    ...queryResult,
    companyInfo: safeTransform(() => transformCompanyInfo(apiResponse)),
    keyMetrics: safeTransform(() => transformKeyMetrics(apiResponse)),
    investmentThesis: safeTransform(() => transformInvestmentThesis(apiResponse)),
    earningsData: safeTransform(() => transformEarningsData(apiResponse), []),
    financialsData: safeTransform(() => transformFinancialsData(apiResponse), []),
    priceData: safeTransform(() => transformPriceData(apiResponse), []),
    secFilings: safeTransform(() => transformSECFilings(apiResponse), []),
    eventsData: safeTransform(() => transformEventsData(apiResponse)),
    keyMetricsSourceDoc: safeTransform(() => transformKeyMetricsSourceDoc(apiResponse)),
    investmentThesisSourceDoc: safeTransform(() => transformInvestmentThesisSourceDoc(apiResponse)),
    analystDetails: safeTransform(() => transformAnalystDetails(apiResponse)),
    rawApiData: apiResponse,
  }
}

// Helper function to map frontend field names to API field names
function mapFieldToApiKey(field: string): string {
  const fieldMap: Record<string, string> = {
    iv: 'iv',
    downside: 'downside',
    irr: 'irr',
    moc: 'moc',
    riskReward: 'risk_reward',
  }
  return fieldMap[field] || field
}

// Helper function to transform FinancialRow[] to API format
export function transformFinancialRowsToApiFormat(financialRows: FinancialRow[]) {
  const apiFormat = {
    last_year: {} as Record<string, number | null>,
    next_year: {} as Record<string, number | null>,
    year_after: {} as Record<string, number | null>,
  }

  // Map of metric names to API field names
  const metricToApiField: Record<string, string> = {
    'Revenue ($m)': 'revenue_m',
    'EBITDA ($m)': 'ebitda_m',
    'EBIT ($m)': 'ebit_m',
    'NPAT ($m)': 'npat_m',
    'EPS ($)': 'eps',
    'DPS ($)': 'dps',
    'P/E': 'pe',
    'EPS Growth': 'eps_growth_pct',
  }

  // Helper to parse numeric value from string, returns null for N/A or empty values
  const parseValue = (value: string): number | null => {
    if (value === 'N/A' || value === '' || value === undefined) {
      return null
    }

    // Remove percentage sign if present
    const cleanValue = value.toString().replace('%', '')
    const numericValue = parseFloat(cleanValue)

    return isNaN(numericValue) ? null : numericValue
  }

  financialRows.forEach((row) => {
    const apiFieldName = metricToApiField[row.metric]
    if (apiFieldName) {
      const lastYearValue = parseValue(row.lastYear)
      const nextYearValue = parseValue(row.nextYear)
      const yearAfterValue = parseValue(row.yearAfter)

      // Always include fields, even if null
      apiFormat.last_year[apiFieldName] = lastYearValue
      apiFormat.next_year[apiFieldName] = nextYearValue
      apiFormat.year_after[apiFieldName] = yearAfterValue
    }
  })

  return apiFormat
}

// Mutation hook for updating key metrics
export function useUpdateKeyMetrics(companyId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      field,
      value,
      currentMetrics,
    }: {
      field: string
      value: number
      currentMetrics: ApiKeyMetrics
    }) => {
      // Create updated key metrics object
      const apiFieldName = mapFieldToApiKey(field)

      // Helper to convert null to 0 for API compatibility
      const toNumber = (val: number | null): number => val ?? 0

      // Build the complete key metrics object with the updated value
      // Convert null values to 0 for API compatibility
      const updatedKeyMetrics = {
        iv: toNumber(currentMetrics.iv),
        downside: toNumber(currentMetrics.downside),
        irr: toNumber(currentMetrics.irr),
        moc: toNumber(currentMetrics.moc),
        risk_reward: toNumber(currentMetrics.risk_reward),
        internal_eps_q1_2025: toNumber(currentMetrics.internal_eps_q1_2025),
        consensus_eps_q1_2025: toNumber(currentMetrics.consensus_eps_q1_2025),
        [apiFieldName]: value,
      }

      return tearsheetService.updateKeyMetricsMeta(companyId, updatedKeyMetrics)
    },
    onSuccess: () => {
      // Invalidate and refetch the tearsheet data to get the updated values
      queryClient.invalidateQueries({ queryKey: ['tearsheet', companyId] })
    },
  })
}

// Mutation hook for updating financial ratios
export function useUpdateFinancialRatios(companyId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (financialRows: FinancialRow[]) => {
      const apiFormatData = transformFinancialRowsToApiFormat(financialRows)
      return tearsheetService.updateFinancialRatiosMeta(companyId, apiFormatData)
    },
    onSuccess: () => {
      // Invalidate and refetch the tearsheet data to get the updated values
      queryClient.invalidateQueries({ queryKey: ['tearsheet', companyId] })
    },
  })
}

// Helper function to transform EarningsData[] to API format
export function transformEarningsDataToApiFormat(
  historicalData: EarningsData[],
  forwardData: EarningsData[]
): ApiEarningsUpdatePayload {
  return {
    historical_eps: historicalData.map((item) => ({
      quarter: item.date,
      internal: item.internal,
      consensus: item.consensus,
    })),
    forward_eps: forwardData.map((item) => ({
      quarter: item.date,
      internal: item.internal,
      consensus: item.consensus,
    })),
  }
}

// Mutation hook for updating earnings data
export function useUpdateEarningsData(companyId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      historicalData,
      forwardData,
    }: {
      historicalData: EarningsData[]
      forwardData: EarningsData[]
    }) => {
      const apiFormatData = transformEarningsDataToApiFormat(historicalData, forwardData)
      return tearsheetService.updateEarningsDataMeta(companyId, apiFormatData)
    },
    onSuccess: () => {
      // Invalidate and refetch the tearsheet data to get the updated values
      queryClient.invalidateQueries({ queryKey: ['tearsheet', companyId] })
    },
  })
}

// Documents query hook
export function useDocumentsQuery(companyId: number, skip = 0, limit = 25) {
  return useQuery({
    queryKey: ['documents', companyId, skip, limit],
    queryFn: () => tearsheetService.getDocuments(companyId, skip, limit),
    enabled: !!companyId,
  })
}

// Hook to get transformed documents data
export function useLinkedDocuments(companyId: number) {
  const { data: documentsResponse, ...queryResult } = useDocumentsQuery(companyId)

  return {
    ...queryResult,
    linkedDocs: transformLinkedDocuments(documentsResponse ?? null),
  }
}
