'use client'

import { useState, useMemo } from 'react'
import { isAxiosError } from 'axios'
import {
  useTearsheetData,
  useUpdateKeyMetrics,
  useUpdateFinancialRatios,
  useUpdateEarningsData,
} from './lib/queries'
import { useAllLinkedDocsMemoQuery, type StageAttachment } from '@/lib/attachments'
import { PageLoadingFallback } from '@/components/shared/LoadingFallbacks'
import { AppErrorState } from '@/components/shared/AppFeedbackState'
import { CompanyNotFound } from '@/components/shared/CompanyNotFound'
import { tearsheetService } from '@/services/api/tearsheet.service'
import { notify } from '@/lib/notifications'
import { formatDate } from '@/lib/date-utils'

// Import all components
import { CompanyHeader } from '@/containers/tearsheet/components/CompanyHeader'
import { AnalystInfo } from '@/containers/tearsheet/components/AnalystInfo'
import { InvestmentThesis } from '@/containers/tearsheet/components/InvestmentThesis'
import { EventsSection } from '@/containers/tearsheet/components/EventsSection'
import { EarningsChart } from '@/containers/tearsheet/components/EarningsChart'
import { PriceChart } from '@/containers/tearsheet/components/PriceChart'
import { KeyMetrics } from '@/containers/tearsheet/components/KeyMetrics'
import { SECFilings } from '@/containers/tearsheet/components/SECFilings'
import { LinkedDocuments } from '@/containers/tearsheet/components/LinkedDocuments'
import { FinancialsTable } from '@/containers/tearsheet/components/FinancialsTable'
import { EditMetricModal } from '@/containers/tearsheet/components/EditMetricModal'
import type {
  MetricField,
  TearsheetContainerProps,
  FinancialRow,
  EarningsData,
  LinkedDoc,
} from './lib/type'

export function TearsheetContainer({ companyId }: TearsheetContainerProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [editField, setEditField] = useState<MetricField | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editReason, setEditReason] = useState('')

  // Investment thesis editing state
  const [isThesisLoading, setIsThesisLoading] = useState(false)

  // Financial ratios editing state
  const [isFinancialsLoading, setIsFinancialsLoading] = useState(false)

  // Earnings data editing state
  const [isEarningsLoading, setIsEarningsLoading] = useState(false)

  // Fetch tearsheet data using React Query
  const tearsheetData = useTearsheetData(companyId)
  const {
    companyInfo,
    keyMetrics,
    investmentThesis,
    earningsData,
    financialsData,
    priceData,
    secFilings,
    eventsData,
    keyMetricsSourceDoc,
    investmentThesisSourceDoc,
    analystDetails,
    isLoading,
    error,
    refetch,
  } = tearsheetData

  // Fetch documents data using useAllLinkedDocsMemoQuery
  const documentsQuery = useAllLinkedDocsMemoQuery({
    enabled: !!companyId,
    companyId,
  })

  // Transform StageAttachment[] to LinkedDoc[]
  const linkedDocs = useMemo((): LinkedDoc[] => {
    if (!documentsQuery.data?.pages) return []

    const attachments: StageAttachment[] = documentsQuery.data.pages.flatMap((page) => page.items)

    return attachments.map((attachment): LinkedDoc => {
      const meta = attachment.meta ?? {}
      const fileMetadata = meta.file_metadata as
        | {
            filename?: string
            original_filename?: string
            file_size?: number
          }
        | null
        | undefined

      return {
        id: attachment.id,
        title: attachment.label,
        type: attachment.documentType || attachment.subLabel || 'Document',
        date: formatDate(meta.created_at as string | undefined),
        filename: fileMetadata?.original_filename || fileMetadata?.filename || attachment.label,
        fileSize: fileMetadata?.file_size || 0,
        status: (meta.status as string) || 'published',
        description: (meta.description as string) || '',
        url: `/documents?id=${attachment.id}`,
      }
    })
  }, [documentsQuery.data])

  // Mutation for updating key metrics
  const updateKeyMetricsMutation = useUpdateKeyMetrics(companyId)

  // Mutation for updating financial ratios
  const updateFinancialRatiosMutation = useUpdateFinancialRatios(companyId)

  // Mutation for updating earnings data
  const updateEarningsMutation = useUpdateEarningsData(companyId)

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageLoadingFallback />
      </div>
    )
  }

  // Show error state
  if (error) {
    // Check if this is a "TearSheet not found" or "Company not found" error from backend
    const isNotFoundError =
      error?.message?.includes('TearSheet not found') ||
      (isAxiosError(error) &&
        (error.response?.data?.detail === 'TearSheet not found' ||
          (error.response?.status === 404 && error.response?.data?.detail === 'Company not found')))

    if (isNotFoundError) {
      return (
        <div className="container mx-auto px-4 py-8">
          <CompanyNotFound
            companyId={String(companyId)}
            onRetry={refetch}
            customMessage="Company tearsheet not found. This company may not be in our coverage universe or the tearsheet data has not been generated yet."
          />
        </div>
      )
    }

    // Show generic error state for other errors
    return (
      <div className="container mx-auto px-4 py-8">
        <AppErrorState
          message="Failed to load tearsheet data. Please try again."
          onRetry={refetch}
        />
      </div>
    )
  }

  // Don't render if data is not available
  if (!companyInfo || !keyMetrics || !investmentThesis) {
    return (
      <div className="container mx-auto px-4 py-8">
        <CompanyNotFound
          companyId={String(companyId)}
          onRetry={refetch}
          customMessage="Company data is currently unavailable. This could be due to the company not being in our coverage universe or a temporary data synchronization issue."
        />
      </div>
    )
  }

  const handleEdit = (field: MetricField, currentValue: string) => {
    setEditField(field)
    setEditValue(currentValue)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    const rawApiData = 'rawApiData' in tearsheetData ? tearsheetData.rawApiData : null

    if (!editField || !editValue || !rawApiData || !rawApiData.tearsheet_meta?.meta?.key_metrics) {
      return
    }

    // Skip API call for 'target' field as it's calculated, not stored directly
    if (editField === 'target') {
      setShowEditModal(false)
      setEditValue('')
      setEditReason('')
      return
    }

    try {
      const numericValue = parseFloat(editValue)
      if (isNaN(numericValue)) {
        return
      }

      // Call the mutation with the current metrics from the API
      await updateKeyMetricsMutation.mutateAsync({
        field: editField,
        value: numericValue,
        currentMetrics: rawApiData.tearsheet_meta.meta.key_metrics,
      })

      // Close modal and reset state on success
      setShowEditModal(false)
      setEditValue('')
      setEditReason('')
    } catch {
      // Modal stays open so user can try again or see the error
    }
  }

  const handleCloseModal = () => {
    setShowEditModal(false)
    setEditField(null)
    setEditValue('')
    setEditReason('')
  }

  const handleInvestmentThesisSave = async (
    text: string,
    reason: string
  ): Promise<{ success: boolean }> => {
    setIsThesisLoading(true)

    try {
      await tearsheetService.updateInvestmentThesisMeta(companyId, {
        text,
        reason,
      })

      notify.success({
        title: 'Success',
        description: 'Investment thesis updated successfully.',
      })

      // Refetch tearsheet data to get the latest data
      await refetch()

      return { success: true }
    } catch {
      notify.error({
        title: 'Error',
        description: 'Failed to update investment thesis. Please try again.',
      })
      return { success: false }
    } finally {
      setIsThesisLoading(false)
    }
  }

  const handleFinancialsSave = async (financialData: FinancialRow[]) => {
    setIsFinancialsLoading(true)

    try {
      await updateFinancialRatiosMutation.mutateAsync(financialData)

      notify.success({
        title: 'Success',
        description: 'Financial data updated successfully.',
      })
    } catch {
      notify.error({
        title: 'Error',
        description: 'Failed to update financial data. Please try again.',
      })
      throw error // Re-throw to let the component know it failed
    } finally {
      setIsFinancialsLoading(false)
    }
  }

  const handleEarningsSave = async (
    historicalData: EarningsData[],
    forwardData: EarningsData[]
  ) => {
    setIsEarningsLoading(true)

    try {
      await updateEarningsMutation.mutateAsync({
        historicalData,
        forwardData,
      })

      notify.success({
        title: 'Success',
        description: 'Earnings data updated successfully.',
      })
    } catch {
      notify.error({
        title: 'Error',
        description: 'Failed to update earnings data. Please try again.',
      })
      throw error // Re-throw to let the component know it failed
    } finally {
      setIsEarningsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <CompanyHeader companyInfo={companyInfo} />
          </div>
          <AnalystInfo
            analystDetails={analystDetails ?? null}
            companyName={companyInfo.name}
            ticker={companyInfo.ticker}
            tickerExchange={companyInfo.exchange}
            refetch={refetch}
          />
        </div>

        {/* Investment Thesis + Events Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Investment Thesis - 2/3 width */}
          <InvestmentThesis
            investmentThesis={investmentThesis}
            companyId={companyId}
            sourceDoc={investmentThesisSourceDoc}
            onSaveThesis={handleInvestmentThesisSave}
            isLoading={isThesisLoading}
          />

          {/* Events - 1/3 width */}
          <EventsSection
            eventsData={eventsData || { events: [], internal: [], public: [], fieldTrips: [] }}
          />
        </div>

        {/* Charts and Key Metrics */}
        <div className="grid grid-cols-6 gap-4">
          {/* Earnings Expectations Chart */}
          <EarningsChart
            earningsData={earningsData || []}
            onSaveEarnings={handleEarningsSave}
            isSaving={isEarningsLoading}
          />

          {/* Price Chart */}
          <PriceChart priceData={priceData || []} />

          {/* Consolidated Key Metrics */}
          <KeyMetrics keyMetrics={keyMetrics} onEdit={handleEdit} sourceDoc={keyMetricsSourceDoc} />
        </div>

        {/* SEC Filings, Linked Documents, & Financials Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* SEC Filings & IR Updates */}
          <SECFilings filings={secFilings || []} />

          {/* Linked Documents */}
          <LinkedDocuments linkedDocs={linkedDocs || []} />

          {/* Financials & Ratios - 1/3 width */}
          <FinancialsTable
            financialsData={financialsData || []}
            companyId={companyId}
            onSaveFinancials={handleFinancialsSave}
            isSaving={isFinancialsLoading}
          />
        </div>

        {/* Edit Metric Modal */}
        <EditMetricModal
          showModal={showEditModal}
          onClose={handleCloseModal}
          editField={editField}
          editValue={editValue}
          editReason={editReason}
          onValueChange={setEditValue}
          onReasonChange={setEditReason}
          onSave={handleSaveEdit}
        />
      </div>
    </div>
  )
}
