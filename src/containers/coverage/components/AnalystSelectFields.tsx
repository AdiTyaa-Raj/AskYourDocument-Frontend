'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AnalystOption, AnalystSelectFieldsProps } from '@/containers/coverage/lib/types'

const normalizeAnalystOptions = (options: AnalystOption[] = []) => {
  const seen = new Set<string>()
  const normalized: AnalystOption[] = []
  options.forEach((option) => {
    const value = option.value ?? String(option.id ?? '')
    if (!value || seen.has(value)) return
    seen.add(value)
    normalized.push({ ...option, value })
  })
  return normalized
}

export function AnalystSelectFields({
  primaryAnalysts = [],
  secondaryAnalysts = [],
  selectedPrimaryAnalystId,
  selectedSecondaryAnalystId,
  onPrimaryAnalystChange,
  onSecondaryAnalystChange,
  isLoadingPrimaryAnalysts = false,
  isLoadingSecondaryAnalysts = false,
  primaryError,
  secondaryError,
  idPrefix = 'analyst',
}: AnalystSelectFieldsProps) {
  const uniquePrimaryAnalysts = useMemo(
    () => normalizeAnalystOptions(primaryAnalysts),
    [primaryAnalysts]
  )
  const uniqueSecondaryAnalysts = useMemo(
    () => normalizeAnalystOptions(secondaryAnalysts),
    [secondaryAnalysts]
  )

  const filteredPrimaryAnalysts = useMemo(
    () => uniquePrimaryAnalysts.filter((analyst) => analyst.value !== selectedSecondaryAnalystId),
    [uniquePrimaryAnalysts, selectedSecondaryAnalystId]
  )
  const filteredSecondaryAnalysts = useMemo(
    () => uniqueSecondaryAnalysts.filter((analyst) => analyst.value !== selectedPrimaryAnalystId),
    [uniqueSecondaryAnalysts, selectedPrimaryAnalystId]
  )

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-primary-analyst`}>
          Primary Analyst <span className="text-red-500">*</span>
        </Label>
        <Select
          value={selectedPrimaryAnalystId}
          onValueChange={onPrimaryAnalystChange}
          disabled={isLoadingPrimaryAnalysts}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                isLoadingPrimaryAnalysts ? 'Loading analysts...' : 'Select primary analyst...'
              }
            />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            {filteredPrimaryAnalysts.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">No analysts available</div>
            ) : (
              filteredPrimaryAnalysts.map((analyst) => (
                <SelectItem key={`${idPrefix}-primary-${analyst.value}`} value={analyst.value}>
                  {analyst.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {primaryError ? <p className="text-sm text-red-500">{primaryError}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-secondary-analyst`}>
          Secondary Analyst <span className="text-red-500">*</span>
        </Label>
        <Select
          value={selectedSecondaryAnalystId}
          onValueChange={onSecondaryAnalystChange}
          disabled={isLoadingSecondaryAnalysts}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                isLoadingSecondaryAnalysts ? 'Loading analysts...' : 'Select secondary analyst...'
              }
            />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            {filteredSecondaryAnalysts.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">No analysts available</div>
            ) : (
              filteredSecondaryAnalysts.map((analyst) => (
                <SelectItem key={`${idPrefix}-secondary-${analyst.value}`} value={analyst.value}>
                  {analyst.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {secondaryError ? <p className="text-sm text-red-500">{secondaryError}</p> : null}
      </div>
    </>
  )
}
