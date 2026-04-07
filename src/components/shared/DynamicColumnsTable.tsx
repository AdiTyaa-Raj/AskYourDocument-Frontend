'use client'

import { useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Column definition for dynamic columns table
 */
export interface DynamicColumn {
  id: string
  label: string
}

/**
 * Row definition for dynamic columns table
 */
export interface DynamicRow {
  id: string
  label: string
}

/**
 * Table data structure
 */
export interface DynamicColumnsTableData {
  columns: DynamicColumn[]
  data: Record<string, Record<string, string>> // rowId -> columnId -> value
}

/**
 * Props for DynamicColumnsTable component
 */
export interface DynamicColumnsTableProps {
  /** Current table value as JSON string */
  value: string | undefined
  /** Callback when table data changes */
  onChange: (value: string) => void
  /** Whether the table is in view-only mode */
  isViewOnly?: boolean
  /** Initial rows to display (e.g., metrics) */
  rows: DynamicRow[]
  /** Label for the column header input placeholder */
  columnPlaceholder?: string
  /** Label for adding new column button */
  addColumnLabel?: string
  /** Label for the rows header */
  rowsHeaderLabel?: string
  /** Whether to show a summary column at the end (e.g., CAGR) */
  showSummaryColumn?: boolean
  /** Label for the summary column */
  summaryColumnLabel?: string
  /** Custom summary column renderer */
  renderSummaryCell?: (rowId: string, data: DynamicColumnsTableData) => React.ReactNode
  /** Custom cell placeholder */
  cellPlaceholder?: string
  /** Generate unique ID function */
  generateId?: () => string
  /** Minimum number of columns (prevents removing below this) */
  minColumns?: number
  /** Custom class for the table container */
  className?: string
}

/**
 * Default ID generator
 */
function defaultGenerateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * A reusable table component with dynamic columns that can be added/removed.
 * Rows are fixed (passed as props) while columns are dynamic.
 */
export function DynamicColumnsTable({
  value,
  onChange,
  isViewOnly = false,
  rows,
  columnPlaceholder = 'Column',
  addColumnLabel = 'Column',
  rowsHeaderLabel = 'ROWS',
  showSummaryColumn = false,
  summaryColumnLabel = 'SUMMARY',
  renderSummaryCell,
  cellPlaceholder = '--',
  generateId = defaultGenerateId,
  minColumns = 1,
  className = '',
}: DynamicColumnsTableProps) {
  // Parse the stored value or initialize with default columns
  const [tableData, setTableData] = useState<DynamicColumnsTableData>(() => {
    if (value) {
      try {
        return JSON.parse(value)
      } catch {
        return {
          columns: [{ id: generateId(), label: '' }],
          data: {},
        }
      }
    }
    return {
      columns: [{ id: generateId(), label: '' }],
      data: {},
    }
  })

  // Update parent when tableData changes
  const updateTableData = useCallback(
    (newData: DynamicColumnsTableData) => {
      setTableData(newData)
      onChange(JSON.stringify(newData))
    },
    [onChange]
  )

  // Add a new column
  const addColumn = useCallback(() => {
    const newColumn: DynamicColumn = {
      id: generateId(),
      label: '',
    }
    updateTableData({
      ...tableData,
      columns: [...tableData.columns, newColumn],
    })
  }, [tableData, updateTableData, generateId])

  // Remove a column
  const removeColumn = useCallback(
    (columnId: string) => {
      if (tableData.columns.length <= minColumns) return

      const newColumns = tableData.columns.filter((c) => c.id !== columnId)
      const newData = { ...tableData.data }

      // Remove data for this column from all rows
      Object.keys(newData).forEach((rowId) => {
        if (newData[rowId]) {
          delete newData[rowId][columnId]
        }
      })

      updateTableData({
        columns: newColumns,
        data: newData,
      })
    },
    [tableData, updateTableData, minColumns]
  )

  // Update column label
  const updateColumnLabel = useCallback(
    (columnId: string, newLabel: string) => {
      const newColumns = tableData.columns.map((c) =>
        c.id === columnId ? { ...c, label: newLabel } : c
      )
      updateTableData({
        ...tableData,
        columns: newColumns,
      })
    },
    [tableData, updateTableData]
  )

  // Update cell value
  const updateCell = useCallback(
    (rowId: string, columnId: string, cellValue: string) => {
      const newData = { ...tableData.data }
      if (!newData[rowId]) {
        newData[rowId] = {}
      }
      newData[rowId][columnId] = cellValue

      updateTableData({
        ...tableData,
        data: newData,
      })
    },
    [tableData, updateTableData]
  )

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              {/* Row labels header */}
              <th className="bg-gray-50 p-3 text-left text-[11px] font-medium tracking-wide text-gray-600 uppercase">
                {rowsHeaderLabel}
              </th>

              {/* Dynamic column headers */}
              {tableData.columns.map((column) => (
                <th key={column.id} className="bg-gray-50 p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="text"
                      value={column.label}
                      onChange={(e) => updateColumnLabel(column.id, e.target.value)}
                      placeholder={columnPlaceholder}
                      className="h-8 w-24 border-gray-200 bg-white text-center text-sm"
                      disabled={isViewOnly}
                    />
                    {!isViewOnly && tableData.columns.length > minColumns && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeColumn(column.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </th>
              ))}

              {/* Add column button */}
              <th className="bg-gray-50 p-3 text-center">
                {!isViewOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-sm"
                    onClick={addColumn}
                  >
                    <Plus className="h-4 w-4" />
                    {addColumnLabel}
                  </Button>
                )}
              </th>

              {/* Summary column header */}
              {showSummaryColumn && (
                <th className="bg-blue-50 p-3 text-center text-[11px] font-medium tracking-wide text-gray-600 uppercase">
                  {summaryColumnLabel}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-200">
                {/* Row label */}
                <td className="bg-gray-50 p-3 text-sm text-gray-700">{row.label}</td>

                {/* Dynamic column cells */}
                {tableData.columns.map((column) => (
                  <td key={column.id} className="p-2 text-center">
                    <Input
                      type="text"
                      value={tableData.data[row.id]?.[column.id] || ''}
                      onChange={(e) => updateCell(row.id, column.id, e.target.value)}
                      placeholder={cellPlaceholder}
                      className="h-9 border-gray-200 bg-gray-50 text-center text-sm"
                      disabled={isViewOnly}
                    />
                  </td>
                ))}

                {/* Empty cell for add column button alignment */}
                <td className="p-2"></td>

                {/* Summary cell */}
                {showSummaryColumn && (
                  <td className="bg-blue-50 p-2 text-center">
                    {renderSummaryCell ? (
                      renderSummaryCell(row.id, tableData)
                    ) : (
                      <div className="flex h-9 items-center justify-center text-sm text-gray-500">
                        {cellPlaceholder}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
