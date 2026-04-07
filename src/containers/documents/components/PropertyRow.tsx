/**
 * PropertyRow Component
 * Reusable component for displaying label-value pairs in document properties
 */

import React from 'react'

/**
 * Property Row Props
 */
interface PropertyRowProps {
  label: string
  value: React.ReactNode
  fullWidth?: boolean
  isLast?: boolean
}

/**
 * PropertyRow Component
 * Displays a label-value pair in a consistent format
 */
export function PropertyRow({
  label,
  value,
  fullWidth = false,
  isLast: _isLast = false,
}: PropertyRowProps) {
  if (fullWidth) {
    return (
      <div className="px-4 py-3">
        <span className="block text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="mt-1 block text-sm font-medium text-gray-900 dark:text-gray-100">
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      {typeof value === 'string' ? (
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
      ) : (
        value
      )}
    </div>
  )
}
