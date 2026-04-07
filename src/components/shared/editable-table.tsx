import React from 'react'

export interface EditableTableColumn<T> {
  key: keyof T
  header: string | React.ReactNode
  align?: 'left' | 'right' | 'center'
  readOnly?: boolean
  width?: string
  cellClassName?: string
  headerClassName?: string
}

export interface EditableTableProps<T extends object> {
  data: T[]
  columns: EditableTableColumn<T>[]
  onChange: (index: number, field: keyof T, value: string) => void
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>, index: number, field: keyof T) => void
  getRowKey?: (item: T, index: number) => string
  inputClassName?: string
  tableClassName?: string
  headerClassName?: string
  rowClassName?: string
  cellClassName?: string
}

export function EditableTable<T extends object>({
  data,
  columns,
  onChange,
  onPaste,
  getRowKey = (_, index) => String(index),
  inputClassName = 'w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none',
  tableClassName = 'w-full border-collapse',
  headerClassName = 'border-b border-gray-200',
  rowClassName = 'border-b border-gray-100',
  cellClassName = 'px-3 py-2',
}: EditableTableProps<T>) {
  const getAlignmentClass = (align?: 'left' | 'right' | 'center') => {
    switch (align) {
      case 'right':
        return 'text-right'
      case 'center':
        return 'text-center'
      case 'left':
      default:
        return 'text-left'
    }
  }

  return (
    <table className={tableClassName}>
      <thead>
        <tr className={headerClassName}>
          {columns.map((column) => (
            <th
              key={String(column.key)}
              className={`${cellClassName} text-sm font-medium text-gray-700 ${getAlignmentClass(column.align)} ${column.headerClassName || ''}`}
              style={column.width ? { width: column.width } : undefined}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={getRowKey(row, rowIndex)} className={rowClassName}>
            {columns.map((column) => {
              const value = row[column.key]
              const isReadOnly = column.readOnly

              return (
                <td
                  key={String(column.key)}
                  className={`${cellClassName} ${column.cellClassName || ''}`}
                >
                  {isReadOnly ? (
                    <span className={`text-sm text-gray-900 ${getAlignmentClass(column.align)}`}>
                      {String(value ?? '')}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={String(value ?? '')}
                      onChange={(e) => onChange(rowIndex, column.key, e.target.value)}
                      onPaste={onPaste ? (e) => onPaste(e, rowIndex, column.key) : undefined}
                      className={`${inputClassName} ${getAlignmentClass(column.align)}`}
                    />
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
