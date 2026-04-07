import type { MetricField, EditableQuarter } from './type'
import type { EditableTableColumn } from '@/components/shared/editable-table'

export const getFieldTitle = (field: MetricField | null) => {
  switch (field) {
    case 'iv':
      return 'Intrinsic Value (IV)'
    case 'downside':
      return 'Downside Value'
    case 'target':
      return 'Target Price'
    case 'irr':
      return 'IRR'
    case 'moc':
      return 'MoC (Multiple on Cost)'
    case 'riskReward':
      return 'Risk/Reward'
    default:
      return 'Metric'
  }
}

// PriceChart constants
export const PRICE_CHART_CONFIG = {
  leftYAxisDomain: ['auto', 'auto'] as const,
  colors: {
    gridStroke: '#e5e7eb',
    textStroke: '#6b7280',
    iv: '#06b6d4',
    price: '#000000',
  },
  strokeWidth: 2,
  opacity: 0.6,
}

export const formatPriceChartTooltip = (value: unknown, name: unknown): [string, string] => {
  const label = String(name ?? '')
  const num =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  if (Number.isNaN(num)) return ['—', label]
  if (label === 'iv') return [`${num.toFixed(2)}`, 'Valuation']
  if (label === 'price') return [`${num.toFixed(2)}`, 'Price']
  return [String(num), label]
}

export const PRICE_CHART_LEGEND_ITEMS = [
  { color: 'bg-cyan-500', label: 'Valuation (lhs)', height: 'h-0.5' },
  { color: 'bg-black', label: 'Price (lhs)', height: 'h-0.5' },
]

// KeyMetrics constants
export const KEY_METRICS_GRID_CLASSES = {
  container:
    'grid cursor-pointer grid-cols-2 gap-2 border-b border-gray-100 py-2 transition-colors hover:bg-gray-50',
  lastItem: 'grid cursor-pointer grid-cols-2 gap-2 py-2 transition-colors hover:bg-gray-50',
  label: 'text-xs text-gray-600',
  value: 'text-right text-xs font-medium text-gray-900',
}

// Modal validation constants
export const VALIDATION_CONSTANTS = {
  MIN_REASON_LENGTH: 15,
  MIN_THESIS_REASON_LENGTH: 20,
}

// EarningsChart constants
export const EARNINGS_COLUMNS: EditableTableColumn<EditableQuarter>[] = [
  { key: 'quarter', header: 'Quarter', align: 'left', readOnly: true },
  { key: 'consensus', header: 'Consensus', align: 'right' },
  { key: 'internal', header: 'Internal', align: 'right' },
]
