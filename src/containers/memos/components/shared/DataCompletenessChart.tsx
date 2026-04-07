'use client'

import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import type { DataCompletenessChartProps } from '@/containers/memos/lib/types'

/**
 * DataCompletenessChart component for displaying field completion percentage
 * Uses recharts RadialBarChart to show a circular progress visualization
 */
export function DataCompletenessChart({
  completed,
  total,
  percentage,
}: DataCompletenessChartProps) {
  const chartData = [{ value: percentage, fill: '#22c55e' }]

  return (
    <div className="mb-2 flex justify-center">
      <div className="relative h-32 w-32">
        <RadialBarChart
          width={128}
          height={128}
          cx={64}
          cy={64}
          innerRadius={50}
          outerRadius={62}
          barSize={12}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: '#e5e7eb' }}
            dataKey="value"
            cornerRadius={6}
            angleAxisId={0}
          />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-gray-900">
            {completed}/{total}
          </div>
          <div className="text-xs text-gray-500">{percentage}%</div>
        </div>
      </div>
    </div>
  )
}
