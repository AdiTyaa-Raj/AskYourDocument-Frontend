'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FloatingSideSheetContent } from '@/components/shared/FloatingSideSheet'
import { AnalystSelectFields } from '@/containers/coverage/components/AnalystSelectFields'
import { getHeaderDescription } from '@/containers/coverage/lib/helper'
import type { AnalystAssignmentModalProps } from '@/containers/coverage/lib/types'

export function AnalystAssignmentModal({
  isOpen,
  onClose,
  companyData,
  primaryAnalysts = [],
  secondaryAnalysts = [],
  isLoadingPrimaryAnalysts = false,
  isLoadingSecondaryAnalysts = false,
  isSubmitting = false,
  onSubmit,
  contextLabel = 'selected',
}: AnalystAssignmentModalProps) {
  const [selectedPrimaryAnalystId, setSelectedPrimaryAnalystId] = useState('')
  const [selectedSecondaryAnalystId, setSelectedSecondaryAnalystId] = useState('')
  const [errors, setErrors] = useState<{ primaryAnalyst?: string; secondaryAnalyst?: string }>({})

  useEffect(() => {
    if (!isOpen) {
      setSelectedPrimaryAnalystId('')
      setSelectedSecondaryAnalystId('')
      setErrors({})
      return
    }
    setSelectedPrimaryAnalystId(companyData?.primaryAnalystId?.toString() ?? '')
    setSelectedSecondaryAnalystId(companyData?.secondaryAnalystId?.toString() ?? '')
    setErrors({})
  }, [companyData?.primaryAnalystId, companyData?.secondaryAnalystId, isOpen])

  const handlePrimaryAnalystChange = useCallback(
    (value: string) => {
      setSelectedPrimaryAnalystId(value)
      if (selectedSecondaryAnalystId === value) {
        setSelectedSecondaryAnalystId('')
      }
      setErrors((prev) => ({ ...prev, primaryAnalyst: undefined, secondaryAnalyst: undefined }))
    },
    [selectedSecondaryAnalystId]
  )

  const handleSecondaryAnalystChange = useCallback(
    (value: string) => {
      setSelectedSecondaryAnalystId(value)
      if (selectedPrimaryAnalystId === value) {
        setSelectedPrimaryAnalystId('')
      }
      setErrors((prev) => ({ ...prev, primaryAnalyst: undefined, secondaryAnalyst: undefined }))
    },
    [selectedPrimaryAnalystId]
  )

  const handleSubmit = useCallback(() => {
    const nextErrors: { primaryAnalyst?: string; secondaryAnalyst?: string } = {}
    const stageAssignmentId = companyData?.stageAssignmentId

    if (!stageAssignmentId) {
      nextErrors.primaryAnalyst = 'Stage assignment id is missing for this company'
      setErrors(nextErrors)
      return
    }
    if (!selectedPrimaryAnalystId) {
      nextErrors.primaryAnalyst = 'Primary analyst is required'
    }
    if (!selectedSecondaryAnalystId) {
      nextErrors.secondaryAnalyst = 'Secondary analyst is required'
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    onSubmit({
      stageAssignmentId,
      primaryAnalystId: Number(selectedPrimaryAnalystId),
      secondaryAnalystId: Number(selectedSecondaryAnalystId),
    })
  }, [companyData?.stageAssignmentId, onSubmit, selectedPrimaryAnalystId, selectedSecondaryAnalystId])

  const isSaveDisabled =
    isSubmitting ||
    !companyData?.stageAssignmentId ||
    !selectedPrimaryAnalystId ||
    !selectedSecondaryAnalystId ||
    selectedPrimaryAnalystId === selectedSecondaryAnalystId

  const contextDescription = `${contextLabel} company`
  const idPrefix = contextLabel.replace(/\s+/g, '-').toLowerCase() || 'analyst'

  const hasExistingAnalysts =
    Boolean(companyData?.primaryAnalystId) && Boolean(companyData?.secondaryAnalystId)
  const isChangeMode = hasExistingAnalysts

  const headerTitle = isChangeMode ? 'Change Analyst Assignment' : 'Assign Analysts'
  const headerDescription = getHeaderDescription({ companyData, contextDescription })

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <FloatingSideSheetContent
        side="right"
        className="flex h-full min-h-0 flex-col overflow-hidden p-0"
      >
        <SheetTitle className="sr-only">{headerTitle}</SheetTitle>
        <SheetDescription className="sr-only">
          {headerDescription}
        </SheetDescription>

        <div className="border-b border-gray-200 px-6 py-4">
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">{headerTitle}</p>
            <p className="text-sm text-gray-600">
              {headerDescription}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-company`}>Company</Label>
              <div className="text-sm">
                <strong>{companyData?.name || 'Unknown Company'}</strong>
                <br />
                {companyData?.ticker || 'N/A'}
              </div>
            </div>

            <AnalystSelectFields
              primaryAnalysts={primaryAnalysts}
              secondaryAnalysts={secondaryAnalysts}
              selectedPrimaryAnalystId={selectedPrimaryAnalystId}
              selectedSecondaryAnalystId={selectedSecondaryAnalystId}
              onPrimaryAnalystChange={handlePrimaryAnalystChange}
              onSecondaryAnalystChange={handleSecondaryAnalystChange}
              isLoadingPrimaryAnalysts={isLoadingPrimaryAnalysts}
              isLoadingSecondaryAnalysts={isLoadingSecondaryAnalysts}
              primaryError={errors.primaryAnalyst}
              secondaryError={errors.secondaryAnalyst}
              idPrefix={idPrefix}
            />

            {isChangeMode && (
              <Alert
                className="rounded-lg border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-700"
                role="status"
              >
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                <AlertTitle className="font-semibold text-blue-800">
                  Approval Required
                </AlertTitle>
                <AlertDescription className="text-blue-700">
                  This change requires approval from the Lead Investor before it takes effect.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex w-full justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaveDisabled}
              className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </FloatingSideSheetContent>
    </Sheet>
  )
}
