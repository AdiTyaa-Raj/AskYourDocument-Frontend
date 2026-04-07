'use client'

import { useMemo, type ChangeEvent, type ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle } from 'lucide-react'
import {
  getTemplateFields,
  countWords,
  countBullets,
  hasValidationError,
  handleWordLimitKeyDown,
  handleWordLimitPaste,
} from '@/containers/memos/lib/helpers'
import { ScreenTemplateForm } from '@/containers/memos/components/ScreenTemplateForm'
import { InvestmentMemo } from '@/containers/memos/components/InvestmentMemo/InvestmentMemo'
import { GoingInVCP } from '@/containers/memos/components/GoingInVCP'
import { TemplateUserMultiSelect } from '@/containers/memos/components/TemplateUserMultiSelect'
import type {
  DocumentDraftFormProps,
  MemoFieldComponentProps,
} from '@/containers/documents/lib/types'
import {
  mapCategoryToTemplateId,
  formatDocumentDate,
  isDraftEnabledTemplate,
} from '@/containers/documents/lib/document-helpers'
import { ALLOWED_NAVIGATION_KEYS } from '@/containers/memos/lib'
import { TEMPLATE_IDS } from '@/containers/documents/lib/constants'
import { formatTickerWithExchange } from '@/lib/utils'
function MemoFieldComponent({
  field,
  value,
  validationErrors = new Set(),
  onChange = () => {},
  isViewOnly = false,
  userMultiFieldResources,
}: MemoFieldComponentProps) {
  const showError = hasValidationError(field.id, validationErrors)
  const bulletCount = field.maxBullets ? countBullets(value) : undefined
  const wordCount = field.maxWords ? countWords(value) : undefined
  const exceedsWordLimit = field.maxWords && wordCount !== undefined && wordCount > field.maxWords

  const handleValueChange = (nextValue: string) => {
    if (field.maxWords && !isViewOnly) {
      const words = nextValue.trim().split(/\s+/u).filter(Boolean)
      if (words.length > field.maxWords) {
        onChange(field.id, words.slice(0, field.maxWords).join(' '))
        return
      }
    }
    onChange(field.id, nextValue)
  }

  // Render simple text for view mode (as per meeting notes)
  const renderViewModeText = () => {
    if (field.type === 'user_multi') {
      return (
        <TemplateUserMultiSelect
          value={value}
          onChange={() => {}}
          disabled
          className="mt-0"
          fetchUsersByIds={userMultiFieldResources.fetchUsersByIds}
          mentionPicker={userMultiFieldResources.mentionPicker}
        />
      )
    }

    if (!value?.trim()) return <span className="text-sm text-gray-400 italic">Not provided</span>

    if (field.type === 'date' || field.type === 'datetime-local') {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {field.type === 'datetime-local' ? date.toLocaleString() : date.toLocaleDateString()}
          </span>
        )
      }
    }

    // Format URL values
    if (field.type === 'url' && value.startsWith('http')) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          {value}
        </a>
      )
    }

    // Format yes/no values
    if (field.type === 'yesno') {
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {value === 'yes' ? 'Yes' : value === 'no' ? 'No' : value}
        </span>
      )
    }

    // Default: render as plain text
    return (
      <div className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
        {field.type === 'textarea' ? (
          <div className="space-y-1">
            {value.split('\n').map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        ) : (
          <span>{value}</span>
        )}
      </div>
    )
  }

  const renderControl = () => {
    if (isViewOnly) return <div className="mt-1">{renderViewModeText()}</div>

    const baseProps = {
      value,
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleValueChange(e.target.value),
      placeholder: field.placeholder,
      disabled: false,
      className: '',
    }

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...baseProps}
            rows={field.maxBullets ? 4 : 3}
            className={`text-xs ${
              exceedsWordLimit ? 'border-destructive focus-visible:ring-destructive' : ''
            }`}
            onKeyDown={(e) =>
              handleWordLimitKeyDown(e, field, value, isViewOnly, ALLOWED_NAVIGATION_KEYS)
            }
            onPaste={(e) => handleWordLimitPaste(e, field, value, handleValueChange, isViewOnly)}
          />
        )
      case 'select':
        return (
          <Select value={value} onValueChange={handleValueChange} disabled={isViewOnly}>
            <SelectTrigger
              className={`h-9 text-xs ${isViewOnly ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
            >
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {(field.selectOptions ?? []).map((option: string) => (
                <SelectItem key={option} value={option} className="text-xs">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'number':
        return <Input {...baseProps} type="number" step={field.step} className="h-9 text-xs" />
      case 'date':
      case 'datetime-local':
        return <Input {...baseProps} type={field.type} className="h-9 text-xs" />
      case 'url':
        return <Input {...baseProps} type="url" className="h-9 text-xs" />
      case 'yesno':
        return (
          <Select value={value} onValueChange={handleValueChange} disabled={isViewOnly}>
            <SelectTrigger
              className={`h-9 text-xs ${isViewOnly ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
            >
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes" className="text-xs">
                Yes
              </SelectItem>
              <SelectItem value="no" className="text-xs">
                No
              </SelectItem>
            </SelectContent>
          </Select>
        )
      case 'user_multi':
        return (
          <TemplateUserMultiSelect
            value={value}
            onChange={(next) => handleValueChange(next)}
            placeholder={field.placeholder}
            helperText={field.helperText}
            fetchUsersByIds={userMultiFieldResources.fetchUsersByIds}
            mentionPicker={userMultiFieldResources.mentionPicker}
          />
        )
      default:
        return <Input {...baseProps} type="text" className="h-9 text-xs" />
    }
  }

  return (
    <div className={isViewOnly ? 'space-y-2' : ''}>
      <Label
        className={`${
          isViewOnly
            ? 'mb-0 block text-sm font-semibold text-gray-900 dark:text-gray-100'
            : 'mb-1.5 block text-xs text-gray-900 dark:text-gray-100'
        }`}
      >
        {field.label}
        {field.required && !isViewOnly && <span className="text-red-500"> *</span>}
      </Label>
      {renderControl()}
      {/* Only show word/bullet counts and validation errors in edit mode */}
      {!isViewOnly && (typeof wordCount === 'number' || typeof bulletCount === 'number') && (
        <div
          className={`mt-1 text-[10px] ${exceedsWordLimit ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
        >
          {typeof wordCount === 'number' && field.maxWords ? (
            <span>
              {wordCount} / {field.maxWords} words
              {exceedsWordLimit && ' (limit exceeded)'}
            </span>
          ) : null}
          {typeof bulletCount === 'number' && field.maxBullets ? (
            <span>
              {typeof wordCount === 'number' && field.maxWords ? ' • ' : ''}
              {bulletCount} / {field.maxBullets} bullet points
            </span>
          ) : null}
        </div>
      )}
      {exceedsWordLimit && !isViewOnly && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="size-3" />
          Word limit exceeded. Maximum {field.maxWords} words allowed.
        </p>
      )}
      {showError && !isViewOnly && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="size-3" />
          This field is required
        </p>
      )}
    </div>
  )
}

export function DocumentDraftForm({
  document,
  formValues,
  onFieldChange = () => {},
  validationErrors = new Set(),
  isViewOnly = false,
  isDraftMode = false,
  useViewModeLayout = false,
  templateImageUrls = {},
  userMultiFieldResources,
}: DocumentDraftFormProps) {
  const templateId = useMemo(() => mapCategoryToTemplateId(document.category), [document.category])
  const fields = useMemo(() => getTemplateFields(templateId ?? undefined), [templateId])
  const showDraftTitleInput = isDraftMode && isDraftEnabledTemplate(templateId) && !isViewOnly

  const ticker = document.primary_company_details?.ticker || document.ticker || ''
  const tickerLabel = formatTickerWithExchange(ticker, document.primary_company_details?.exchange)
  const companyName = document.primary_company_details?.name || ''
  const date = useMemo(() => formatDocumentDate(document), [document])

  // Use view mode layout styling if explicitly set or if in view-only mode
  const useNiceLayout = isViewOnly || useViewModeLayout

  return (
    <div
      className={`flex h-full flex-col ${useNiceLayout ? 'bg-gray-30 overflow-auto p-4 dark:bg-gray-900' : ''}`}
    >
      <Card
        className={`flex-1 overflow-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${
          useNiceLayout ? 'mx-auto w-full max-w-4xl shadow-sm' : ''
        }`}
      >
        {!(
          useNiceLayout &&
          (templateId === TEMPLATE_IDS.SCREEN || templateId === TEMPLATE_IDS.INVESTMENT_MEMO)
        ) && (
          <CardHeader>
            {showDraftTitleInput ? (
              <div className="space-y-3">
                <Label className="mb-1.5 block text-xs text-gray-900 dark:text-gray-100">
                  Document Title
                </Label>
                <Input
                  type="text"
                  value={String(formValues.title ?? document.title ?? '')}
                  onChange={(e) => onFieldChange('title', e.target.value)}
                  placeholder="Enter document title"
                  className="h-9 text-sm dark:bg-gray-800"
                />
              </div>
            ) : useNiceLayout ? (
              <div className="mb-8 space-y-4 border-b border-gray-200 pb-6 dark:border-gray-700">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  {tickerLabel && (
                    <span className="rounded-md bg-gray-200 px-2 py-0.5 font-medium text-black">
                      {tickerLabel}
                    </span>
                  )}
                  {date && <span>{date}</span>}
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {document.title || document.category || 'Untitled Document'}
                </h1>
                {companyName && (
                  <p className="text-base text-gray-700 dark:text-gray-300">{companyName}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="mb-1.5 block text-xs text-gray-900 dark:text-gray-100">
                    Document Title
                  </Label>
                  <Input
                    type="text"
                    value={document.title || ''}
                    readOnly
                    className="h-9 cursor-not-allowed bg-gray-50 text-sm dark:bg-gray-800"
                  />
                </div>
              </div>
            )}
          </CardHeader>
        )}
        <CardContent className={useNiceLayout ? 'space-y-8' : 'space-y-4'}>
          {(() => {
            const defaultRenderer = () =>
              fields.map((field) => (
                <MemoFieldComponent
                  key={field.id}
                  field={field}
                  value={String(formValues[field.id] ?? '')}
                  validationErrors={validationErrors}
                  onChange={onFieldChange}
                  isViewOnly={isViewOnly}
                  userMultiFieldResources={userMultiFieldResources}
                />
              ))

            const templateRenderers: Record<string, () => ReactNode> = {
              [TEMPLATE_IDS.SCREEN]: () => (
                <ScreenTemplateForm
                  formValues={formValues}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  isViewOnly={isViewOnly}
                  isFieldsEnabled={true}
                  templateImageUrls={templateImageUrls}
                />
              ),
              [TEMPLATE_IDS.INVESTMENT_MEMO]: () => (
                <InvestmentMemo
                  formValues={formValues}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  isViewOnly={isViewOnly}
                  templateImageUrls={templateImageUrls}
                />
              ),
              [TEMPLATE_IDS.VCP_SCREEN]: () => (
                <GoingInVCP
                  formValues={formValues}
                  validationErrors={validationErrors}
                  onFieldChange={onFieldChange}
                  isViewOnly={isViewOnly}
                  isFieldsEnabled={true}
                  templateImageUrls={templateImageUrls}
                />
              ),
              [TEMPLATE_IDS.DEFAULT]: defaultRenderer,
            }

            const renderer =
              templateRenderers[templateId ?? TEMPLATE_IDS.DEFAULT] ?? defaultRenderer
            return renderer()
          })()}
        </CardContent>
      </Card>
    </div>
  )
}
