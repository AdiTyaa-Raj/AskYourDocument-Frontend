'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarkdownTextarea } from './MarkdownTextarea'
import type {
  ContentBlockData,
  ContentBlockProps,
  ContentBlocksContainerProps,
} from '@/containers/memos/lib/types'

// Re-export types for backward compatibility
export type { ContentBlockData } from '@/containers/memos/lib/types'

/**
 * Single Content Block component with subheading and markdown content
 */
export function ContentBlock({
  block,
  onUpdate,
  onRemove,
  placeholderSubheading = 'Subheading (optional)',
  placeholderContent = 'Add your content here...',
  disabled = false,
}: ContentBlockProps) {
  return (
    <Card className="group border border-gray-200 bg-white shadow-sm">
      <CardContent className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {/* Subheading input - always shown but optional */}
              <Input
                type="text"
                placeholder={placeholderSubheading}
                value={block.subheading}
                onChange={(e) => onUpdate(block.id, 'subheading', e.target.value)}
                className="h-8 text-xs font-semibold"
                disabled={disabled}
              />

              {/* Content Markdown Textarea */}
              <MarkdownTextarea
                placeholder={placeholderContent}
                value={block.content}
                onChange={(value) => onUpdate(block.id, 'content', value)}
                minHeight="min-h-20"
                disabled={disabled}
              />
            </div>

            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(block.id)}
                className="h-7 w-7 flex-shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Container for managing multiple content blocks with add functionality
 */
export function ContentBlocksContainer({
  blocks,
  onAdd,
  onUpdate,
  onRemove,
  placeholderSubheading = 'Subheading (optional)',
  placeholderContent = 'Add your content here...',
  disabled = false,
}: ContentBlocksContainerProps) {
  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <ContentBlock
          key={block.id}
          block={block}
          onUpdate={onUpdate}
          onRemove={onRemove}
          placeholderSubheading={placeholderSubheading}
          placeholderContent={placeholderContent}
          disabled={disabled}
        />
      ))}

      {/* Add Paragraph Button */}
      {!disabled && (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAdd(false)}
            className="h-8 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Paragraph
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Helper to generate unique content block ID
 */
export function createContentBlock(isParagraphOnly: boolean = false): ContentBlockData {
  return {
    id: `content-${Date.now()}`,
    subheading: '',
    content: '',
    isParagraphOnly,
  }
}
