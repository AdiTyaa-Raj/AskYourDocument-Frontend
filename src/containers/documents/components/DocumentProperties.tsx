/**
 * Document Properties Component
 *
 * Displays comprehensive document metadata including:
 * - Document information (title, company, type, etc.)
 * - Financial consensus data (earnings, EBITA, EPS)
 * - Internal metrics (target weight, IRR, risk/reward)
 * - Investment thesis
 *
 * Falls back to mock data when real data is unavailable.
 *
 * @component
 */

import { TrendingUp, TrendingDown } from 'lucide-react'
import { DocumentPropertiesProps } from '@/containers/documents/lib/types'
import {
  getValueOrDefault,
  getActionableBadgeInfo,
  formatPercentage,
  formatTearsheetMetric,
} from '@/containers/documents/lib/utils'
import { formatTickerWithExchange } from '@/lib/utils'
import { InfoCard, InfoRow } from './InfoCard'

/**
 * Renders a metric change indicator with trending icon and appropriate color
 * @param changeValue - The change value (e.g., "+5.2%", "-3.1%", or "-")
 * @returns JSX element with trending icon and styled text, or null if no change
 */
function renderMetricChangeIndicator(changeValue: string) {
  if (changeValue === '-') return null

  const isNegative = changeValue.startsWith('-')
  const TrendIcon = isNegative ? TrendingDown : TrendingUp

  return (
    <span
      className={`flex items-center gap-1 text-xs ${
        isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
      }`}
    >
      <TrendIcon className="size-3" />
      {changeValue}
    </span>
  )
}

/** Same N/A logic as Tearsheet Financials & Ratios: null/undefined → "N/A" */
function formatConsensusValue(
  value: number | null | undefined,
  formatter: (n: number) => string
): string {
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return 'N/A'
  }
  return formatter(value)
}

export function DocumentProperties({
  document,
  tearsheetData,
}: DocumentPropertiesProps & {
  ticker?: string
  isLoadingTearsheet?: boolean
}) {
  // Current Consensus: same source and fallback as Tearsheet (financials_ratios → N/A when null)
  const ratios = tearsheetData?.financialsRatios
  const consensusEarnings =
    tearsheetData == null
      ? getValueOrDefault(document.earnings, '-')
      : formatConsensusValue(ratios?.next_year?.revenue_m, (n) => `$${n}M`)

  const consensusEbitda =
    tearsheetData == null
      ? getValueOrDefault(document.ebita, '-')
      : formatConsensusValue(ratios?.next_year?.ebitda_m, (n) => `$${n}M`)

  const consensusEps =
    tearsheetData == null
      ? getValueOrDefault(document.eps, '-')
      : formatConsensusValue(ratios?.next_year?.eps, (n) => `$${n.toFixed(2)}`)

  const thesisValue = tearsheetData?.investmentThesis?.text
    ? tearsheetData.investmentThesis.text
    : getValueOrDefault(document.thesis, '-')

  // Extract internal metrics from tearsheet
  const iveValue = tearsheetData?.keyMetrics?.iv
    ? formatTearsheetMetric(tearsheetData.keyMetrics.iv)
    : getValueOrDefault(document.ive, '-')

  const downsideValue = tearsheetData?.keyMetrics?.downside
    ? formatTearsheetMetric(tearsheetData.keyMetrics.downside)
    : getValueOrDefault(document.downside, '-')

  // Calculate downside percentage
  const downsidePercentValue =
    iveValue !== '-' && downsideValue !== '-'
      ? formatPercentage(
          ((parseFloat(downsideValue.replace('$', '')) - parseFloat(iveValue.replace('$', ''))) /
            parseFloat(iveValue.replace('$', ''))) *
            100
        )
      : getValueOrDefault(document.downsidePercent, '-')

  const irrValue = tearsheetData?.keyMetrics?.irr
    ? formatTearsheetMetric(tearsheetData.keyMetrics.irr, formatPercentage)
    : getValueOrDefault(document.irr, '-')

  const riskRewardValue = tearsheetData?.keyMetrics?.riskReward
    ? `${tearsheetData.keyMetrics.riskReward}x`
    : getValueOrDefault(document.riskReward, '-')

  return (
    <div className="space-y-4">
      {/* Consensus */}
      <InfoCard title="Current Consensus (YFinance)">
        <InfoRow
          label="Earnings:"
          value={
            <>
              {consensusEarnings}
              {renderMetricChangeIndicator(document.earningsChange ?? '-')}
            </>
          }
        />

        <InfoRow
          label="EBITA:"
          value={
            <>
              {consensusEbitda}
              {renderMetricChangeIndicator(document.ebitaChange ?? '-')}
            </>
          }
        />

        <InfoRow
          label="EPS:"
          value={
            <>
              {consensusEps}
              {renderMetricChangeIndicator(document.epsChange ?? '-')}
            </>
          }
        />
      </InfoCard>
      {/* Current Internal Metrics */}
      <InfoCard title="Current Internal Metrics">
        <InfoRow label="IVE:" value={iveValue} />

        <InfoRow
          label="Downside:"
          value={
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              {downsideValue}
            </span>
          }
        />

        <InfoRow
          label="Downside %:"
          value={
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              {downsidePercentValue}
            </span>
          }
        />

        <InfoRow
          label="IRR:"
          value={
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              {irrValue}
            </span>
          }
        />

        <InfoRow label="R/R:" value={riskRewardValue} />
      </InfoCard>
      {/* Thesis */}
      <InfoCard title="Investment Thesis">
        <p className="text-xs leading-5 text-gray-700 dark:text-gray-300">{thesisValue}</p>
      </InfoCard>
      {/* Document Info */}
      <InfoCard title="Document Info" contentClassName="space-y-3">
        <InfoRow
          label="Company:"
          value={
            <span className="rounded-md bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700">
              {getValueOrDefault(formatTickerWithExchange(document.ticker, document.exchange), '-')}
            </span>
          }
        />

        <InfoRow label="Type:" value={getValueOrDefault(document.type, '-')} className="pt-3" />

        <InfoRow
          label="Actionable:"
          className="pt-3"
          value={(() => {
            const { isActionable, displayText } = getActionableBadgeInfo(document.actionable)

            return (
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  isActionable
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {displayText}
              </span>
            )
          })()}
        />

        <InfoRow
          label="Author:"
          value={getValueOrDefault(document.uploader, '-')}
          className="pt-3"
        />

        <InfoRow
          label="Primary Analyst:"
          value={getValueOrDefault(document.primary, '-')}
          className="pt-3"
        />

        <InfoRow
          label="Secondary Analyst:"
          value={getValueOrDefault(document.secondary, '-')}
          className="pt-3"
        />

        <InfoRow
          label="Upload Date:"
          className="pt-3"
          value={
            document.uploadDate ||
            document.created_at ||
            document.date ||
            new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          }
        />

        <InfoRow
          label="Date Published:"
          className="pt-3"
          value={
            document.datePublished ||
            new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          }
        />
      </InfoCard>
    </div>
  )
}
