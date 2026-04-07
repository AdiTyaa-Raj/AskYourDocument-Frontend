'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Save } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import type { FinancialRow, FinancialsTableProps } from '../lib/type'
import {
  getFinancialColumns,
  getFinancialEditableColumns,
  type FinancialRowWithId,
} from '@/lib/tableColumns'
import { notify } from '@/lib/notifications'
import { EditableTable } from '@/components/shared/editable-table'

export function FinancialsTable({
  financialsData,
  onSaveFinancials,
  isSaving = false,
}: FinancialsTableProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editableData, setEditableData] = useState<FinancialRow[]>(financialsData || [])

  const handleEdit = () => {
    setIsEditing(true)
    setEditableData([...(financialsData || [])])
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditableData([...(financialsData || [])])
  }

  const handleSave = async () => {
    try {
      // Call the parent's save handler
      await onSaveFinancials(editableData)
      setIsEditing(false)
    } catch {
      notify.error({
        title: 'Error',
        description: 'Failed to save financial data. Please try again.',
      })
    }
  }

  const handleCellChange = useCallback(
    (rowIndex: number, field: keyof FinancialRow, value: string) => {
      setEditableData((prevData) => {
        const newData = [...prevData]
        newData[rowIndex][field] = value
        return newData
      })
    },
    []
  )

  // Column definition for EditableTable
  const financialColumns = useMemo(() => getFinancialEditableColumns(), [])

  // Transform data to include IDs for DataTable
  const tableData: FinancialRowWithId[] = useMemo(() => {
    const displayData = isEditing ? editableData : financialsData || []
    return displayData.map((row, index) => ({
      ...row,
      id: index,
    }))
  }, [isEditing, editableData, financialsData])

  // Column configuration for DataTable
  const columns = useMemo(
    () =>
      getFinancialColumns({
        isEditing,
        handleCellChange,
      }),
    [isEditing, handleCellChange]
  )

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-gray-900">Financials & Ratios</CardTitle>
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
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
        {isEditing && (
          <p className="mt-2 text-xs text-gray-500">Click on the respective cells to edit.</p>
        )}
      </CardHeader>
      <CardContent className="px-3 pt-0">
        {tableData.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">No financial data available</div>
        ) : isEditing ? (
          <EditableTable
            data={editableData}
            columns={financialColumns}
            onChange={(index, field, value) => handleCellChange(index, field, value)}
            getRowKey={(item) => item.metric}
            inputClassName="w-full border-0 bg-transparent text-sm text-gray-900 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
          />
        ) : (
          <DataTable
            data={tableData}
            columns={columns}
            className="border-0 shadow-none"
            minTableWidth={100}
          />
        )}
      </CardContent>
    </Card>
  )
}
