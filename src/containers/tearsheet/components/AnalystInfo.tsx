'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil } from 'lucide-react'
import { notify } from '@/lib/notifications'
import { useAnalysts, useUpdateStageAssignmentAnalysts } from '@/containers/coverage/lib/queries'
import { AnalystAssignmentModal } from '@/containers/coverage/components/AnalystAssignmentModal'
import { AnalystReassignmentWarningModal } from '@/containers/coverage/components/AnalystReassignmentWarningModal'
import type { UpdateAnalystSubmissionData } from '@/containers/coverage/lib/types'
import { formatTickerWithExchange } from '@/lib/utils'
import type { AnalystInfoProps, AnalystInfo } from '../lib/type'

function getInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function AnalystRow({ label, analyst }: { label: string; analyst: AnalystInfo }) {
  const initials = getInitials(analyst.fullName || analyst.name)

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold text-white">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-gray-400">{label}</p>
        <p className="text-sm leading-tight font-semibold text-gray-900">
          {analyst.fullName || analyst.name}
        </p>
      </div>
    </div>
  )
}

export function AnalystInfo({
  analystDetails,
  companyName,
  ticker,
  tickerExchange,
  refetch,
}: AnalystInfoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [reassignmentWarning, setReassignmentWarning] = useState<{
    isOpen: boolean
    warnings: string[]
    pendingData: UpdateAnalystSubmissionData | null
  }>({ isOpen: false, warnings: [], pendingData: null })

  const primaryAnalysts = analystDetails?.primaryAnalysts ?? []
  const secondaryAnalysts = analystDetails?.secondaryAnalysts ?? []
  const stageAssignmentId = analystDetails?.stageAssignmentId

  const { data: primaryAnalystOptions = [], isLoading: isLoadingPrimary } = useAnalysts(
    'arnie-primary-analyst',
    isModalOpen
  )
  const { data: secondaryAnalystOptions = [], isLoading: isLoadingSecondary } = useAnalysts(
    'arnie-secondary-analyst',
    isModalOpen
  )

  const updateAnalystsMutation = useUpdateStageAssignmentAnalysts()

  const handleSubmit = useCallback(
    async (data: UpdateAnalystSubmissionData) => {
      try {
        const response = await updateAnalystsMutation.mutateAsync(data)
        if (response?.status === 'confirmation_required') {
          setReassignmentWarning({
            isOpen: true,
            warnings: response.warnings ?? [],
            pendingData: data,
          })
          return
        }
        notify.success({
          title: 'Analysts updated',
          description: `${formatTickerWithExchange(ticker, tickerExchange) || 'Company'} analyst assignment saved.`,
        })
        setIsModalOpen(false)
        refetch?.()
      } catch (error: unknown) {
        const err = error as { response?: { status?: number }; status?: number }
        const statusCode = err?.response?.status ?? err?.status
        if (statusCode === 422) {
          notify.error({
            title: 'Approval pending',
            description: 'An approval request is already pending for this company.',
          })
        } else {
          notify.error({
            title: 'Error',
            description: 'Failed to update analyst assignment. Please try again.',
          })
        }
      }
    },
    [updateAnalystsMutation, ticker, tickerExchange, refetch]
  )

  const handleReassignmentWarningConfirm = useCallback(async () => {
    if (!reassignmentWarning.pendingData) return
    try {
      await updateAnalystsMutation.mutateAsync({
        ...reassignmentWarning.pendingData,
        confirmReassignment: true,
      })
      setReassignmentWarning({ isOpen: false, warnings: [], pendingData: null })
      notify.success({
        title: 'Analysts updated',
        description: `${formatTickerWithExchange(ticker, tickerExchange) || 'Company'} analyst assignment saved.`,
      })
      setIsModalOpen(false)
      refetch?.()
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; status?: number }
      const statusCode = err?.response?.status ?? err?.status
      if (statusCode === 422) {
        notify.error({
          title: 'Approval pending',
          description: 'An approval request is already pending for this company.',
        })
      } else {
        notify.error({
          title: 'Error',
          description: 'Failed to update analyst assignment. Please try again.',
        })
      }
    }
  }, [reassignmentWarning.pendingData, updateAnalystsMutation, ticker, tickerExchange, refetch])

  if (primaryAnalysts.length === 0 && secondaryAnalysts.length === 0) {
    return null
  }

  const companyData = {
    ticker: ticker ?? '',
    name: companyName ?? '',
    stageAssignmentId,
    primaryAnalystId: primaryAnalysts[0]?.id,
    secondaryAnalystId: secondaryAnalysts[0]?.id,
  }

  return (
    <>
      <Card className="h-full w-full border border-gray-200 bg-white shadow-sm">
        <CardContent className="relative flex items-center px-4 py-2 pr-12">
          <button
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Edit analysts"
            onClick={() => setIsModalOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </button>

          <div className="flex flex-col justify-center gap-1.5">
            {primaryAnalysts.map((analyst) => (
              <AnalystRow key={analyst.id} label="Primary Analyst" analyst={analyst} />
            ))}
            {secondaryAnalysts.map((analyst) => (
              <AnalystRow key={analyst.id} label="Secondary Analyst" analyst={analyst} />
            ))}
          </div>
        </CardContent>
      </Card>

      <AnalystAssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        companyData={companyData}
        primaryAnalysts={primaryAnalystOptions}
        secondaryAnalysts={secondaryAnalystOptions}
        isLoadingPrimaryAnalysts={isLoadingPrimary}
        isLoadingSecondaryAnalysts={isLoadingSecondary}
        isSubmitting={updateAnalystsMutation.isPending}
        onSubmit={handleSubmit}
        contextLabel="tearsheet"
      />

      <AnalystReassignmentWarningModal
        isOpen={reassignmentWarning.isOpen}
        onClose={() => setReassignmentWarning({ isOpen: false, warnings: [], pendingData: null })}
        onConfirm={handleReassignmentWarningConfirm}
        warnings={reassignmentWarning.warnings}
        isConfirming={updateAnalystsMutation.isPending}
      />
    </>
  )
}
