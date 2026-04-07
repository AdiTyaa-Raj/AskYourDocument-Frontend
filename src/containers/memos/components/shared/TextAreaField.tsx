'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TextAreaFieldProps } from '@/containers/memos/lib/types'

/**
 * Reusable text area field component for memo forms
 */
export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  validationErrors,
  isViewOnly,
}: TextAreaFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-900">{label}</Label>
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        disabled={isViewOnly}
        rows={5}
        className={`min-h-[120px] resize-none rounded-md border border-gray-200 text-sm ${
          isViewOnly ? 'cursor-not-allowed bg-gray-100 opacity-60' : 'bg-white'
        }`}
      />
      {validationErrors.has(id) && !isViewOnly && (
        <p className="text-destructive flex items-center gap-1 text-xs">This field is required</p>
      )}
    </div>
  )
}
