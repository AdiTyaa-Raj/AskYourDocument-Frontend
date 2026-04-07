'use client'

import { Fragment, useMemo } from 'react'
import type {
  ScreenTemplateViewProps,
  EconomicsTableData,
  ViewChartData,
  SupportingChartsViewProps,
  EconomicsDataGridViewProps,
  EconomicsRowData,
} from '@/containers/memos/lib/types'
import {
  VIEW_KEY_DATA_FIELDS,
  VIEW_TAM_FIELDS,
  VIEW_MARKET_SHARE_FIELDS,
  VIEW_ANALYZABILITY_FIELDS,
  VIEW_ANALYSIS_QUESTIONS,
  VIEW_MOAT_QUESTIONS,
  VIEW_MANAGEMENT_QUESTIONS,
  ECONOMICS_METRICS,
  KEY_DATA_FIELD_IDS,
} from '@/containers/memos/lib/constants'
import { formatShortDate } from '@/lib/date-utils'
import { calculateCompletionStats, resolveChartImageUrl } from '@/containers/memos/lib/helpers'
import {
  Section,
  SubSection,
  DataField,
  TextContent,
  AnalysisPoint,
} from '@/containers/memos/components/shared/ViewComponents'
import { DataCompletenessChart } from '@/containers/memos/components/shared/DataCompletenessChart'
import { DataTable, type ColumnConfig } from '@/components/shared/DataTable'

/** TAM section row lengths: 4-col grid, rows 2–4 have empty area on the right (matches form/Figma) */
const TAM_ROW_LENGTHS = [4, 3, 2, 2] as const

/**
 * Safely parse JSON string to array of charts
 */
function parseChartsData(value: string): ViewChartData[] {
  if (!value || value.trim() === '') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to parse supporting charts data:', error)
    return []
  }
}

function SupportingChartsView({ value, templateImageUrls = {} }: SupportingChartsViewProps) {
  const charts = useMemo(() => parseChartsData(value), [value])

  if (charts.length === 0) {
    return <p className="text-sm text-gray-400 italic">No supporting charts available</p>
  }

  return (
    <div className="space-y-6">
      {charts.map((chart) => {
        const imageUrl = resolveChartImageUrl(chart, templateImageUrls)
        const isLoadingImage = !imageUrl && Boolean(chart.s3Key)

        return (
          <div key={chart.id} className="space-y-3">
            {chart.title && <h4 className="text-sm font-semibold text-gray-800">{chart.title}</h4>}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={chart.title || 'Supporting chart'}
                className="max-h-[400px] max-w-full rounded-lg border border-gray-200 object-contain"
              />
            )}
            {isLoadingImage && (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <p className="text-sm text-gray-400">Loading image...</p>
              </div>
            )}
            {chart.caption && <p className="text-sm text-gray-600 italic">{chart.caption}</p>}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Safely parse JSON string to economics table data
 */
function parseEconomicsData(value: string): EconomicsTableData | null {
  if (!value || value.trim() === '') return null
  try {
    const parsed = JSON.parse(value)
    if (parsed?.columns && parsed?.data) {
      return parsed as EconomicsTableData
    }
    return null
  } catch (error) {
    console.error('Failed to parse economics data:', error)
    return null
  }
}

/**
 * Check if a cell value is non-empty
 */
function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim() !== '')
}

/**
 * Filter columns that have at least one non-empty cell
 */
function getColumnsWithData(
  columns: EconomicsTableData['columns'],
  data: EconomicsTableData['data']
): EconomicsTableData['columns'] {
  return columns.filter((col) =>
    ECONOMICS_METRICS.some((metric) => hasValue(data[metric]?.[col.id]))
  )
}

/**
 * Filter metrics that have at least one non-empty cell in any column
 */
function getMetricsWithData(
  columns: EconomicsTableData['columns'],
  data: EconomicsTableData['data']
): string[] {
  return ECONOMICS_METRICS.filter((metric) =>
    columns.some((col) => hasValue(data[metric]?.[col.id]))
  )
}

/**
 * Get column header label with fallback
 */
function getColumnLabel(column: { label: string }, index: number): string {
  return hasValue(column.label) ? column.label : `Year ${index + 1}`
}

function EconomicsDataGridView({ value }: EconomicsDataGridViewProps) {
  const tableData = useMemo(() => parseEconomicsData(value), [value])

  const columnsWithData = useMemo(() => {
    if (!tableData) return []
    return getColumnsWithData(tableData.columns, tableData.data)
  }, [tableData])

  const metricsWithData = useMemo(() => {
    if (!tableData) return []
    return getMetricsWithData(columnsWithData, tableData.data)
  }, [tableData, columnsWithData])

  // Transform data for DataTable
  const rows = useMemo<EconomicsRowData[]>(() => {
    if (!tableData) return []
    return metricsWithData.map((metric) => {
      const rowData = tableData.data[metric] || {}
      const row: EconomicsRowData = {
        id: metric,
        metric,
      }
      columnsWithData.forEach((col) => {
        row[col.id] = rowData[col.id] || '-'
      })
      return row
    })
  }, [tableData, metricsWithData, columnsWithData])

  // Build column configs for DataTable
  const columns = useMemo<ColumnConfig<EconomicsRowData>[]>(() => {
    const cols: ColumnConfig<EconomicsRowData>[] = [
      {
        key: 'metric',
        label: 'METRICS',
        width: 150,
        visible: true,
        align: 'left',
        sortable: false,
      },
    ]
    columnsWithData.forEach((col, index) => {
      cols.push({
        key: col.id,
        label: getColumnLabel(col, index),
        width: 120,
        visible: true,
        align: 'center',
        alignHeaderToCell: true,
        sortable: false,
      })
    })
    return cols
  }, [columnsWithData])

  if (!tableData || columnsWithData.length === 0) {
    return <p className="text-sm text-gray-400 italic">No financial metrics data available</p>
  }

  return (
    <DataTable<EconomicsRowData>
      data={rows}
      columns={columns}
      showPagination={false}
      minTableWidth={400}
      emptyStateTitle="No financial metrics"
      emptyStateDescription="No financial metrics data available"
    />
  )
}

export function ScreenTemplateView({
  formValues,
  templateImageUrls = {},
}: ScreenTemplateViewProps) {
  // Calculate completion stats for view mode
  const { completedFields, totalFields, completionPercentage } = useMemo(
    () => calculateCompletionStats(formValues, KEY_DATA_FIELD_IDS),
    [formValues]
  )

  return (
    <div className="space-y-8 bg-white p-8">
      <div className="border-b border-gray-200 pb-6">
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {formValues.ticker || 'N/A'}
          </span>
          <span className="text-sm text-gray-500">{formatShortDate()}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Screening Template</h1>
        <p className="mt-1 text-lg text-gray-700">{formValues.companyName || 'Company Name'}</p>
      </div>

      <Section title="Key Data Snapshot">
        <div className="flex gap-8">
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 md:grid-cols-4">
              {VIEW_KEY_DATA_FIELDS.map((field) => (
                <DataField
                  key={field.key}
                  label={field.label}
                  value={formValues[field.key] as string}
                />
              ))}
            </div>
          </div>
          <div className="w-[200px] shrink-0">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-center text-xs font-semibold text-gray-900">
                Data Completeness
              </h3>
              <DataCompletenessChart
                completed={completedFields}
                total={totalFields}
                percentage={completionPercentage}
              />
              <p className="text-center text-[11px] text-gray-600">
                {completionPercentage === 100
                  ? 'All fields completed!'
                  : `${completedFields} of ${totalFields} key fields filled`}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Business & Thesis">
        <SubSection title="In 1-2 sentences - What do they do?">
          <TextContent value={formValues.businessOverview as string} />
        </SubSection>
        <SubSection title="What is the thesis on how we make money?">
          <TextContent value={formValues.variantPerception as string} />
        </SubSection>
      </Section>

      <Section title="Market Analysis">
        <SubSection title="Size of the TAM and how fast is it growing?">
          {/* Same 4-column grid as form: rows 2–4 have empty area on the right */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-4">
            {TAM_ROW_LENGTHS.map((rowLen, rowIndex) => {
              const start = TAM_ROW_LENGTHS.slice(0, rowIndex).reduce((a, n) => a + n, 0)
              const rowFields = VIEW_TAM_FIELDS.slice(start, start + rowLen)
              return (
                <Fragment key={rowIndex}>
                  {rowFields.map((field) => (
                    <DataField
                      key={field.key}
                      label={field.label}
                      value={formValues[field.key] as string}
                    />
                  ))}
                  {Array.from({ length: 4 - rowFields.length }, (_, i) => (
                    <div key={`tam-empty-${rowIndex}-${i}`} aria-hidden />
                  ))}
                </Fragment>
              )
            })}
          </div>
        </SubSection>

        <SubSection title="What is their market share?">
          {/* Same 3-column grid as form: both rows aligned */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-4">
            {VIEW_MARKET_SHARE_FIELDS.map((field) => (
              <DataField
                key={field.key}
                label={field.label}
                value={formValues[field.key] as string}
              />
            ))}
          </div>
        </SubSection>

        <SubSection title="Momentum & Audit">
          <DataField
            label="Do they appear to be taking market share?"
            value={formValues.takingMarketShare as string}
          />
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-gray-600">Is it analyzable?</p>
            <div className="grid grid-cols-3 gap-4">
              {VIEW_ANALYZABILITY_FIELDS.map((field) => (
                <DataField
                  key={field.key}
                  label={field.label}
                  value={formValues[field.key] as string}
                />
              ))}
            </div>
          </div>
        </SubSection>

        <SubSection title="Analysis">
          {VIEW_ANALYSIS_QUESTIONS.map((item) => (
            <AnalysisPoint
              key={item.key}
              question={item.question}
              value={formValues[item.key] as string}
            />
          ))}
        </SubSection>
      </Section>

      <Section title="Moat Analysis">
        {VIEW_MOAT_QUESTIONS.map((item) => (
          <AnalysisPoint
            key={item.key}
            question={item.question}
            value={formValues[item.key] as string}
          />
        ))}
      </Section>

      {formValues.economicsDataGrid && (
        <Section title="Economics of the Business">
          <SubSection title="Financial Metrics">
            <EconomicsDataGridView value={formValues.economicsDataGrid as string} />
          </SubSection>
        </Section>
      )}

      {formValues.supportingCharts && (
        <Section title="Supporting Charts">
          <SupportingChartsView
            value={formValues.supportingCharts as string}
            templateImageUrls={templateImageUrls}
          />
        </Section>
      )}

      <Section title="Management Quality">
        {VIEW_MANAGEMENT_QUESTIONS.map((item) => (
          <AnalysisPoint
            key={item.key}
            question={item.question}
            value={formValues[item.key] as string}
          />
        ))}
        <AnalysisPoint question="Biggest Concerns" value={formValues.preMortem as string} />
        <AnalysisPoint
          question="Do they have a strong capital allocation track record?"
          value={formValues.capitalAllocation as string}
        />
      </Section>
    </div>
  )
}
