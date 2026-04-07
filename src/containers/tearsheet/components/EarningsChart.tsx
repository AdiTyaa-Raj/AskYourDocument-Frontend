'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Edit, Save } from 'lucide-react'
import type { EarningsChartProps, EarningsData, EditableQuarter } from '../lib/type'
import { EditableTable } from '@/components/shared/editable-table'
import { EARNINGS_COLUMNS } from '../lib/constants'

export function EarningsChart({
  earningsData,
  onSaveEarnings,
  isSaving = false,
}: EarningsChartProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editableData, setEditableData] = useState<{
    historical: EditableQuarter[]
    forward: EditableQuarter[]
  }>({ historical: [], forward: [] })

  // Separate historical and forward-looking data
  const { historical, forward, chartData } = useMemo(() => {
    // Sort data chronologically
    const sortedData = [...earningsData].sort((a, b) => {
      const parseQuarter = (q: string) => {
        const [quarter, year] = q.split(' ')
        const qNum = parseInt(quarter.replace('Q', ''))
        return parseInt(year) * 10 + qNum
      }
      return parseQuarter(a.date) - parseQuarter(b.date)
    })

    // Take first 4 as historical, next 8 as forward
    const hist = sortedData.slice(0, 4)
    const fwd = sortedData.slice(4, 12)

    return { historical: hist, forward: fwd, chartData: sortedData }
  }, [earningsData])

  const handleEdit = () => {
    // Initialize editable data with current values
    setEditableData({
      historical: historical.map((d) => ({
        quarter: d.date,
        consensus: d.consensus.toFixed(2),
        internal: d.internal.toFixed(2),
      })),
      forward: forward.map((d) => ({
        quarter: d.date,
        consensus: d.consensus.toFixed(2),
        internal: d.internal.toFixed(2),
      })),
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!onSaveEarnings) {
      console.error('onSaveEarnings handler is required')
      return
    }

    try {
      // Convert editable data back to EarningsData format
      const historicalEarningsData: EarningsData[] = editableData.historical.map((quarter) => ({
        date: quarter.quarter,
        consensus: parseFloat(quarter.consensus) || 0,
        internal: parseFloat(quarter.internal) || 0,
      }))

      const forwardEarningsData: EarningsData[] = editableData.forward.map((quarter) => ({
        date: quarter.quarter,
        consensus: parseFloat(quarter.consensus) || 0,
        internal: parseFloat(quarter.internal) || 0,
      }))

      // Call the save handler from parent container
      await onSaveEarnings(historicalEarningsData, forwardEarningsData)

      // Close edit mode on success
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving earnings data:', error)
      // Error is handled by parent container (notifications shown there)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset to original data
    setEditableData({
      historical: historical.map((d) => ({
        quarter: d.date,
        consensus: d.consensus.toFixed(2),
        internal: d.internal.toFixed(2),
      })),
      forward: forward.map((d) => ({
        quarter: d.date,
        consensus: d.consensus.toFixed(2),
        internal: d.internal.toFixed(2),
      })),
    })
  }

  const handleCellChange = (
    section: 'historical' | 'forward',
    index: number,
    field: keyof EditableQuarter,
    value: string
  ) => {
    setEditableData((prev) => {
      const newData = { ...prev }
      newData[section][index][field] = value
      return newData
    })
  }

  const handlePaste = (
    section: 'historical' | 'forward',
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
    field: keyof EditableQuarter
  ) => {
    const pastedData = e.clipboardData.getData('text')
    const lines = pastedData.split('\n').filter((line) => line.trim())

    // If multiple lines pasted, try to fill multiple cells
    if (lines.length > 1) {
      e.preventDefault()
      setEditableData((prev) => {
        const newData = { ...prev }
        lines.forEach((line, i) => {
          const currentIndex = index + i
          if (currentIndex < newData[section].length) {
            const value = line.trim()
            if (!isNaN(parseFloat(value))) {
              newData[section][currentIndex][field] = value
            }
          }
        })
        return newData
      })
    }
  }

  // Add reference line for current quarter (between historical and forward)
  const currentQuarterIndex = historical.length - 1

  return (
    <Card className="col-span-2 border border-gray-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm text-gray-900">Earnings Expectations (EPS)</CardTitle>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-sm font-normal"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2 bg-gray-900 text-sm font-normal hover:bg-gray-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="gap-2 text-sm font-normal"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      {isEditing && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500">
            Click cells to edit. Paste from Excel/Google Sheets supported.
          </p>
        </div>
      )}
      <CardContent className="p-4 pt-0">
        {!isEditing ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip />
              {currentQuarterIndex >= 0 && (
                <ReferenceLine
                  x={chartData[currentQuarterIndex]?.date}
                  stroke="#000"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                />
              )}
              <Line
                type="monotone"
                dataKey="consensus"
                stroke="#9ca3af"
                strokeWidth={2}
                name="Consensus"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="internal"
                stroke="#2563eb"
                strokeWidth={2}
                name="Internal"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {/* Historical Section */}
            <div className="mb-6">
              <h3 className="sticky top-0 -mx-3 mb-3 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                Historical (Last 4 Quarters)
              </h3>
              <EditableTable
                data={editableData.historical}
                columns={EARNINGS_COLUMNS}
                onChange={(index, field, value) =>
                  handleCellChange('historical', index, field, value)
                }
                onPaste={(e, index, field) => handlePaste('historical', e, index, field)}
                getRowKey={(item) => item.quarter}
              />
            </div>

            {/* Forward-looking Section */}
            <div>
              <h3 className="-mx-3 mb-3 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                Forward-looking (Next 8 Quarters)
              </h3>
              <EditableTable
                data={editableData.forward}
                columns={EARNINGS_COLUMNS}
                onChange={(index, field, value) => handleCellChange('forward', index, field, value)}
                onPaste={(e, index, field) => handlePaste('forward', e, index, field)}
                getRowKey={(item) => item.quarter}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
