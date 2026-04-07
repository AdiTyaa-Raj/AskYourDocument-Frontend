'use client'

import { useRef, ClipboardEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import type { MarkdownTextareaProps } from '@/containers/memos/lib/types'

/**
 * Markdown-enabled Textarea component
 * Supports auto-conversion of pasted tabular data to markdown tables
 */
export function MarkdownTextarea({
  value,
  onChange,
  placeholder,
  className = '',
  minHeight = 'min-h-24',
  disabled = false,
}: MarkdownTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return

    const clipboardData = e.clipboardData
    const pastedText = clipboardData.getData('text/plain')

    // Check if pasted data looks like tabular data (from Excel/Sheets)
    const hasMultipleTabs = pastedText.includes('\t')
    const hasMultipleLines = pastedText.split('\n').length > 1

    if (hasMultipleTabs && hasMultipleLines) {
      e.preventDefault()

      // Convert to markdown table
      const lines = pastedText.trim().split('\n')
      const rows = lines.map((line) => line.split('\t'))

      // Create markdown table
      let markdownTable = ''

      // Header row
      if (rows.length > 0) {
        markdownTable += '| ' + rows[0].join(' | ') + ' |\n'
        markdownTable += '|' + rows[0].map(() => ' --- ').join('|') + '|\n'

        // Data rows
        for (let i = 1; i < rows.length; i++) {
          markdownTable += '| ' + rows[i].join(' | ') + ' |\n'
        }
      }

      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newValue = value.substring(0, start) + markdownTable + value.substring(end)
        onChange(newValue)

        // Set cursor position after inserted table
        setTimeout(() => {
          const newPos = start + markdownTable.length
          textarea.setSelectionRange(newPos, newPos)
        }, 0)
      }
    }
  }

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={handlePaste}
      placeholder={placeholder}
      className={`${minHeight} resize-y text-xs ${className}`}
      disabled={disabled}
    />
  )
}
