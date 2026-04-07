'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PriceChartProps } from '../lib/type'
import {
  PRICE_CHART_CONFIG,
  formatPriceChartTooltip,
  PRICE_CHART_LEGEND_ITEMS,
} from '../lib/constants'

export function PriceChart({ priceData }: PriceChartProps) {
  return (
    <Card className="col-span-2 border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-900">Price History and Valuation</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={priceData}>
            <CartesianGrid strokeDasharray="3 3" stroke={PRICE_CHART_CONFIG.colors.gridStroke} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              stroke={PRICE_CHART_CONFIG.colors.textStroke}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10 }}
              stroke={PRICE_CHART_CONFIG.colors.textStroke}
              domain={PRICE_CHART_CONFIG.leftYAxisDomain}
            />
            <Tooltip formatter={formatPriceChartTooltip} contentStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="left"
              type="stepAfter"
              dataKey="iv"
              stroke={PRICE_CHART_CONFIG.colors.iv}
              strokeWidth={PRICE_CHART_CONFIG.strokeWidth}
              name="Valuation (lhs)"
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="price"
              stroke={PRICE_CHART_CONFIG.colors.price}
              strokeWidth={PRICE_CHART_CONFIG.strokeWidth}
              name="Price (lhs)"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center justify-center gap-6 text-xs text-gray-600">
          {PRICE_CHART_LEGEND_ITEMS.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-4 ${item.height} ${item.color}`}></div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
