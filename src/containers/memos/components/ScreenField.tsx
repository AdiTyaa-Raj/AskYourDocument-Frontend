'use client'

import { AlertTriangle, CheckCircle, Circle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ScreenFieldProps, MemoFieldDefinition } from '@/containers/memos/lib/types'
import {
  countWords,
  hasValidationError,
  handleWordLimitKeyDown,
  handleWordLimitPaste,
  truncateToWordLimit,
  isScreenNumericFieldInvalid,
  shouldUseUppercaseScreenLabel,
} from '@/containers/memos/lib/helpers'
import { ALLOWED_NAVIGATION_KEYS, YES_NO_OPTIONS } from '@/containers/memos/lib/constants'

/**
 * Individual field component for Screen template
 * Renders different input types based on field configuration
 */
export function ScreenField({
  id,
  label,
  type,
  required = false,
  placeholder,
  helperText,
  selectOptions,
  step,
  maxWords,
  value = '',
  onChange,
  validationErrors,
  isViewOnly,
}: ScreenFieldProps) {
  const showError = hasValidationError(id, validationErrors)
  const wordCount = maxWords ? countWords(value) : undefined
  const exceedsWordLimit = maxWords && wordCount !== undefined && wordCount > maxWords
  const isFilled = value && value.trim().length > 0

  // Check if this is one of the tracked fields for the circle indicator
  const trackedFieldIds = ['preMortem', 'capitalAllocation']
  const showIndicator = trackedFieldIds.includes(id)
  const isNumericInvalid = isScreenNumericFieldInvalid(id, value)

  const field: MemoFieldDefinition = {
    id,
    label,
    type: type as MemoFieldDefinition['type'],
    required,
    placeholder,
    helperText,
    selectOptions,
    step,
    maxWords,
  }

  const handleValueChange = (nextValue: string) => {
    // Prevent input beyond word limit
    if (maxWords && !isViewOnly) {
      const { value: truncatedValue, wasTruncated } = truncateToWordLimit(nextValue, maxWords)
      if (wasTruncated) {
        onChange(id, truncatedValue)
        return
      }
    }
    onChange(id, nextValue)
  }

  const baseProps = {
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleValueChange(event.target.value),
    placeholder,
    disabled: isViewOnly,
    className: isViewOnly ? 'cursor-not-allowed opacity-60 bg-gray-100' : 'bg-gray-50',
  }

  return (
    <div className="space-y-1">
      {label && (
        <Label
          className={`text-[8px] font-medium tracking-wide text-gray-600 ${shouldUseUppercaseScreenLabel(id) ? 'uppercase' : ''}`}
        >
          {label}
          {required && !isViewOnly ? <span className="text-red-500"> *</span> : null}
        </Label>
      )}

      {/* Render appropriate control */}
      {type === 'textarea' && (
        <div className="relative">
          <Textarea
            value={value}
            onChange={(event) => handleValueChange(event.target.value)}
            placeholder={placeholder}
            disabled={isViewOnly}
            rows={5}
            className={`min-h-[120px] resize-none rounded-md border border-gray-200 text-sm ${isViewOnly ? 'cursor-not-allowed bg-gray-100 opacity-60' : 'bg-gray-50'} ${exceedsWordLimit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            onKeyDown={(e) =>
              handleWordLimitKeyDown(e, field, value, isViewOnly, ALLOWED_NAVIGATION_KEYS)
            }
            onPaste={(e) => handleWordLimitPaste(e, field, value, handleValueChange, isViewOnly)}
          />
          {/* Show indicator for tracked fields */}
          {showIndicator &&
            !isViewOnly &&
            (isFilled ? (
              <CheckCircle className="pointer-events-none absolute top-2 right-2 h-5 w-5 text-green-500" />
            ) : (
              <Circle className="pointer-events-none absolute top-2 right-2 h-5 w-5 text-gray-300" />
            ))}
        </div>
      )}

      {type === 'select' && (
        <Select value={value} onValueChange={(val) => onChange(id, val)} disabled={isViewOnly}>
          <SelectTrigger
            className={`h-8 w-full text-xs ${isViewOnly ? 'cursor-not-allowed bg-gray-100 opacity-60' : 'border-gray-200 bg-gray-50'}`}
          >
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(selectOptions ?? []).map((option: string) => (
              <SelectItem key={option} value={option} className="text-xs">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === 'number' && (
        <Input
          {...baseProps}
          type="number"
          step={step}
          className={`h-8 border-gray-200 text-xs ${baseProps.className}`}
        />
      )}

      {type === 'yesno' && (
        <Select value={value} onValueChange={(val) => onChange(id, val)} disabled={isViewOnly}>
          <SelectTrigger
            className={`h-8 w-full text-xs ${isViewOnly ? 'cursor-not-allowed bg-gray-100 opacity-60' : 'border-gray-200 bg-gray-50'}`}
          >
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {YES_NO_OPTIONS.map((option) => (
              <SelectItem key={option} value={option} className="text-xs">
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === 'text' && (
        <Input
          {...baseProps}
          type="text"
          className={`h-8 border-gray-200 text-xs ${baseProps.className}`}
        />
      )}

      {/* Helper text */}
      {helperText && !showError && (
        <p className="text-muted-foreground text-[10px]">{helperText}</p>
      )}

      {/* Word count */}
      {typeof wordCount === 'number' && maxWords && (
        <div
          className={`text-[10px] ${exceedsWordLimit ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {wordCount} / {maxWords} words
          {exceedsWordLimit && ' (limit exceeded)'}
        </div>
      )}

      {/* Validation errors */}
      {exceedsWordLimit && !isViewOnly && (
        <p className="text-destructive flex items-center gap-1 text-xs">
          <AlertTriangle className="size-3" />
          Word limit exceeded. Maximum {maxWords} words allowed.
        </p>
      )}
      {(showError || isNumericInvalid) && !isViewOnly && (
        <p className="text-destructive flex items-center gap-1 text-xs">
          <AlertTriangle className="size-3" />
          {isNumericInvalid ? 'Invalid number' : 'This field is required'}
        </p>
      )}
    </div>
  )
}
