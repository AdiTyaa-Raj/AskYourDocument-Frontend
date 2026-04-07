'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Chart, SupportingChartsProps } from '@/containers/memos/lib/types'
import {
  generateUniqueId,
  parseCharts,
  resolveChartImageUrl,
  updateChartsWhenUrlsLoad,
} from '@/containers/memos/lib/helpers'

export function SupportingCharts({
  value,
  onChange,
  isViewOnly = false,
  templateImageUrls = {},
}: SupportingChartsProps) {
  const [charts, setCharts] = useState<Chart[]>(() => parseCharts(value))
  const [hoveredChartId, setHoveredChartId] = useState<string | null>(null)
  const prevTemplateUrlKeys = useRef('')

  const templateUrlKeys = useMemo(
    () => Object.keys(templateImageUrls).sort().join(','),
    [templateImageUrls]
  )

  useEffect(() => {
    const parsedCharts = parseCharts(value)
    setCharts(parsedCharts)
  }, [value])

  useEffect(() => {
    setCharts((prevCharts) => {
      const updated = updateChartsWhenUrlsLoad(
        prevCharts,
        templateUrlKeys,
        prevTemplateUrlKeys,
        templateImageUrls
      )
      return updated ?? prevCharts
    })
  }, [templateUrlKeys, templateImageUrls])

  const updateCharts = (newCharts: Chart[]) => {
    setCharts(newCharts)
    const serializable = newCharts.map(({ imageFile, ...rest }) => rest)
    onChange(JSON.stringify(serializable))
  }

  const addChart = () => {
    const newChart: Chart = {
      id: generateUniqueId(),
      title: '',
      caption: '',
    }
    updateCharts([...charts, newChart])
  }

  const removeChart = (chartId: string) => {
    updateCharts(charts.filter((c) => c.id !== chartId))
  }

  const updateChartField = (chartId: string, field: keyof Chart, fieldValue: string) => {
    const newCharts = charts.map((c) => (c.id === chartId ? { ...c, [field]: fieldValue } : c))
    updateCharts(newCharts)
  }

  const handleFileSelect = (chartId: string, file: File | null) => {
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const updatedCharts = charts.map((c) =>
        c.id === chartId
          ? {
              ...c,
              imageUrl: reader.result as string,
              imageFile: file,
            }
          : c
      )
      updateCharts(updatedCharts)
    }
    reader.onerror = () => {
      console.error('FileReader error:', reader.error)
    }
    reader.readAsDataURL(file)
  }

  const triggerFileInput = (chartId: string) => {
    if (isViewOnly) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFileSelect(chartId, file)
    }
    input.click()
  }

  return (
    <div className="space-y-4">
      {charts.map((chart) => {
        const imageUrl = resolveChartImageUrl(chart, templateImageUrls)
        const isLoadingImage = !imageUrl && Boolean(chart.s3Key)

        return (
          <div
            key={chart.id}
            className="space-y-2.5"
            onMouseEnter={() => setHoveredChartId(chart.id)}
            onMouseLeave={() => setHoveredChartId(null)}
          >
            <div className="relative flex items-center gap-2">
              <Input
                type="text"
                value={chart.title}
                onChange={(e) => updateChartField(chart.id, 'title', e.target.value)}
                placeholder="Chart Title (e.g., Rule of 40, Retention Scenarios)"
                className="h-9 flex-1 border-gray-200 bg-gray-100 text-sm"
                disabled={isViewOnly}
              />
              {!isViewOnly && hoveredChartId === chart.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => removeChart(chart.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div
              className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-md ${
                imageUrl
                  ? 'bg-transparent'
                  : 'border-2 border-dashed border-gray-300 bg-transparent hover:border-gray-400'
              }`}
              onClick={() => triggerFileInput(chart.id)}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={chart.title || 'Chart'}
                  className="max-h-[300px] max-w-full object-contain"
                />
              ) : isLoadingImage ? (
                <div className="flex flex-col items-center gap-2.5 py-6 text-center">
                  <ImageIcon className="h-9 w-9 text-gray-400" />
                  <p className="text-sm text-gray-400">Loading image...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5 py-6 text-center">
                  <ImageIcon className="h-9 w-9 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload screenshot</p>
                </div>
              )}
            </div>

            <Input
              type="text"
              value={chart.caption}
              onChange={(e) => updateChartField(chart.id, 'caption', e.target.value)}
              placeholder="Caption..."
              className="h-9 border-gray-200 bg-gray-100 text-sm"
              disabled={isViewOnly}
            />
          </div>
        )
      })}

      {!isViewOnly && (
        <button
          onClick={addChart}
          className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 bg-transparent py-3 text-sm font-normal text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add Chart / Image
        </button>
      )}
    </div>
  )
}
