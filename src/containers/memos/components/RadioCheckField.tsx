'use client'

import { CheckCircle, Circle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { RadioCheckFieldProps } from '@/containers/memos/lib/types'
import { countWords, truncateToWordLimit } from '@/containers/memos/lib/helpers'

export function RadioCheckField({
  id,
  label,
  value = '',
  onChange,
  isViewOnly = false,
  placeholder = '',
  maxWords,
}: RadioCheckFieldProps) {
  const isFilled = value && value.trim().length > 0
  const wordCount = maxWords ? countWords(value) : undefined

  const handleValueChange = (nextValue: string) => {
    if (maxWords && !isViewOnly) {
      const { value: truncatedValue, wasTruncated } = truncateToWordLimit(nextValue, maxWords)
      if (wasTruncated) {
        onChange(id, truncatedValue)
        return
      }
    }
    onChange(id, nextValue)
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-900">{label}</Label>

      <div className="relative">
        <Textarea
          value={value}
          onChange={(event) => handleValueChange(event.target.value)}
          placeholder={placeholder}
          disabled={isViewOnly}
          rows={5}
          className={`min-h-[120px] resize-none rounded-md border border-gray-200 text-sm ${
            isViewOnly ? 'cursor-not-allowed bg-gray-100 opacity-60' : 'bg-gray-50'
          }`}
        />
        {/* Show filled checkmark or empty circle inside textarea on the right */}
        {!isViewOnly &&
          (isFilled ? (
            <CheckCircle className="pointer-events-none absolute top-2 right-2 h-5 w-5 text-green-500" />
          ) : (
            <Circle className="pointer-events-none absolute top-2 right-2 h-5 w-5 text-gray-300" />
          ))}
      </div>

      {/* Word count */}
      {typeof wordCount === 'number' && maxWords && (
        <div className="text-muted-foreground text-[10px]">
          {wordCount} / {maxWords} words
        </div>
      )}
    </div>
  )
}
