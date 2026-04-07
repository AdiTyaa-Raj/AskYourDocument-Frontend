'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { GoingInVCPProps } from '@/containers/memos/lib/types'
import {
  VCP_SECTIONS,
  VCP_VALUATION_FIELDS,
  VCP_ALL_SECTION_KEYS,
} from '@/containers/memos/lib/constants'
import { MediaBlocksContainer } from '@/containers/memos/components/shared/MediaBlock'
import { useMediaBlocks } from '@/containers/memos/components/shared/useMediaBlocks'
import { GoingInVCPView } from './GoingInVCPView'
import { extractTextValue } from '@/containers/memos/lib/helpers'

export function GoingInVCP({
  formValues,
  validationErrors: _validationErrors,
  onFieldChange,
  isViewOnly = false,
  templateImageUrls = {},
}: GoingInVCPProps) {
  const { mediaBlocks, getHandlers } = useMediaBlocks(
    formValues,
    onFieldChange,
    VCP_ALL_SECTION_KEYS,
    templateImageUrls
  )

  // If view only, render the read-only view component
  if (isViewOnly) {
    return <GoingInVCPView formValues={formValues} templateImageUrls={templateImageUrls} />
  }

  return (
    <div className="space-y-4">
      {/* Main Sections with Textareas */}
      {VCP_SECTIONS.map((config) => (
        <div key={config.key} className="space-y-2">
          <Label className="text-sm font-medium text-gray-900">{config.title}</Label>
          <Textarea
            placeholder={config.placeholder}
            value={extractTextValue(formValues[config.key]) || ''}
            onChange={(e) => onFieldChange(config.key, e.target.value)}
            className="min-h-20 resize-y text-xs"
            disabled={isViewOnly}
          />
          <MediaBlocksContainer
            blocks={mediaBlocks[config.key] || []}
            onAdd={getHandlers(config.key).onAdd}
            onUpdate={getHandlers(config.key).onUpdate}
            onRemove={getHandlers(config.key).onRemove}
            buttonLabel="Attach Image/Chart"
            disabled={isViewOnly}
          />
        </div>
      ))}

      {/* Valuation Fields */}
      {VCP_VALUATION_FIELDS.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-gray-900">{field.title}</Label>
          {field.type === 'input' ? (
            <Input
              type="text"
              placeholder={field.placeholder}
              value={extractTextValue(formValues[field.key]) || ''}
              onChange={(e) => onFieldChange(field.key, e.target.value)}
              className="h-9 text-xs"
              disabled={isViewOnly}
            />
          ) : (
            <Textarea
              placeholder={field.placeholder}
              value={extractTextValue(formValues[field.key]) || ''}
              onChange={(e) => onFieldChange(field.key, e.target.value)}
              className="min-h-20 resize-y text-xs"
              disabled={isViewOnly}
            />
          )}
          <MediaBlocksContainer
            blocks={mediaBlocks[field.key] || []}
            onAdd={getHandlers(field.key).onAdd}
            onUpdate={getHandlers(field.key).onUpdate}
            onRemove={getHandlers(field.key).onRemove}
            buttonLabel="Attach Image/Chart"
            disabled={isViewOnly}
          />
        </div>
      ))}
    </div>
  )
}
