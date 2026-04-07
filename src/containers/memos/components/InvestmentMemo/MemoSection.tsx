'use client'

import { Textarea } from '@/components/ui/textarea'
import type { MemoSectionProps, SectionData } from '@/containers/memos/lib/types'
import { getTextValue } from '@/containers/memos/lib/helpers'
import { MarkdownTextarea } from './MarkdownTextarea'
import { MediaBlocksContainer } from '../shared/MediaBlock'

/**
 * Create updated section data preserving images when text changes
 */
function createUpdatedSectionData(currentValue: unknown, newText: string): SectionData {
  // If current value is a SectionData object, preserve its images
  if (typeof currentValue === 'object' && currentValue !== null) {
    const sectionData = currentValue as SectionData
    return {
      text: newText,
      images: sectionData.images || [],
    }
  }
  // Otherwise just return the new text wrapped in SectionData format
  return { text: newText, images: [] }
}

export function MemoSection({
  config,
  formValues,
  onFieldChange,
  mediaBlocks,
  mediaHandlers,
  isViewOnly,
}: MemoSectionProps) {
  const { key, title, titleClassName, placeholder, useMarkdown, minHeight } = config
  const textValue = getTextValue(formValues[key])

  const handleTextChange = (newText: string) => {
    // Pass SectionData object to preserve images - the handler accepts string but works with objects too
    onFieldChange(key, createUpdatedSectionData(formValues[key], newText) as unknown as string)
  }

  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-medium ${titleClassName || 'text-gray-900'}`}>{title}</h3>
      {useMarkdown ? (
        <MarkdownTextarea
          placeholder={placeholder}
          value={textValue}
          onChange={handleTextChange}
          minHeight={minHeight}
          disabled={isViewOnly}
        />
      ) : (
        <Textarea
          placeholder={placeholder}
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          className="min-h-20 resize-y text-xs"
          disabled={isViewOnly}
        />
      )}
      <MediaBlocksContainer
        blocks={mediaBlocks}
        onAdd={mediaHandlers.onAdd}
        onUpdate={mediaHandlers.onUpdate}
        onRemove={mediaHandlers.onRemove}
        buttonLabel="Add Image/Chart"
        disabled={isViewOnly}
      />
    </div>
  )
}

// Re-export constants from lib for backwards compatibility
export { MEMO_SECTIONS, ALL_SECTION_KEYS } from '@/containers/memos/lib/constants'
export type { SectionConfig, MediaHandlers } from '@/containers/memos/lib/types'
