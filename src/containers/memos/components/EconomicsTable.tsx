'use client'

import { useMemo } from 'react'
import { DynamicColumnsTable, type DynamicRow } from '@/components/shared/DynamicColumnsTable'
import type { EconomicsTableProps } from '@/containers/memos/lib/types'
import { ECONOMICS_METRICS } from '@/containers/memos/lib/constants'
import { generateUniqueId } from '@/containers/memos/lib/helpers'

export function EconomicsTable({ value, onChange, isViewOnly = false }: EconomicsTableProps) {
  // Convert ECONOMICS_METRICS to DynamicRow format
  const rows: DynamicRow[] = useMemo(
    () =>
      ECONOMICS_METRICS.map((metric) => ({
        id: metric,
        label: metric,
      })),
    []
  )

  return (
    <DynamicColumnsTable
      value={value}
      onChange={onChange}
      isViewOnly={isViewOnly}
      rows={rows}
      columnPlaceholder="Year"
      addColumnLabel="Year"
      rowsHeaderLabel="METRICS"
      showSummaryColumn={true}
      summaryColumnLabel="CAGR"
      cellPlaceholder="--"
      generateId={generateUniqueId}
      minColumns={1}
    />
  )
}
