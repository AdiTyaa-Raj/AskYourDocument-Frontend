'use client'

import Image from 'next/image'
import { Upload, X, Trash2, Paperclip } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import notify from '@/lib/notifications'
import type {
  MediaBlockData,
  MediaBlockProps,
  MediaBlocksContainerProps,
} from '@/containers/memos/lib/types'

// Re-export types for backward compatibility
export type { MediaBlockData } from '@/containers/memos/lib/types'

/**
 * Single Media Block component for displaying/editing an image with title and caption
 */
export function MediaBlock({ block, onUpdate, onRemove, disabled = false }: MediaBlockProps) {
  const handleImageUpload = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      notify.error({
        title: 'Invalid file type',
        description: 'Only JPG, PNG, WEBP, and SVG images are allowed',
      })
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      notify.error({
        title: 'File too large',
        description: 'Image size must be less than 5MB',
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      onUpdate(block.id, 'imageUrl', reader.result as string)
      notify.success({
        title: 'Image uploaded',
        description: 'Image uploaded successfully',
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card className="group border border-gray-300 bg-gray-50 shadow-sm">
      <CardHeader className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Figure 1: Revenue Growth"
            value={block.title}
            onChange={(e) => onUpdate(block.id, 'title', e.target.value)}
            className="h-7 flex-1 bg-white text-xs font-medium"
            disabled={disabled}
          />
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(block.id)}
              className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-2">
          {/* Image Container */}
          {block.imageUrl ? (
            <div className="relative overflow-hidden rounded-lg border border-gray-300 bg-white">
              <div className="relative aspect-video w-full">
                <Image
                  src={block.imageUrl}
                  alt={block.title || 'Uploaded image'}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdate(block.id, 'imageUrl', '')}
                  className="absolute top-2 right-2 h-6 bg-white/90 hover:bg-white"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <label className="block">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
                disabled={disabled}
              />
              <div
                className={`cursor-pointer rounded-lg border-2 border-dashed border-gray-400 bg-white p-6 text-center transition-colors hover:border-gray-500 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <Upload className="mx-auto mb-2 h-7 w-7 text-gray-400" />
                <div className="text-xs text-gray-600">
                  Click to upload image (JPG, PNG, WEBP, SVG)
                </div>
                <div className="mt-1 text-[10px] text-gray-500">Max 5MB</div>
              </div>
            </label>
          )}

          {/* Caption */}
          <Textarea
            placeholder="Description/Caption..."
            value={block.caption}
            onChange={(e) => onUpdate(block.id, 'caption', e.target.value)}
            className="min-h-16 resize-y bg-white text-xs"
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Container for managing multiple media blocks with add functionality
 */
export function MediaBlocksContainer({
  blocks,
  onAdd,
  onUpdate,
  onRemove,
  buttonLabel = 'Add Reference Image/Chart',
  disabled = false,
}: MediaBlocksContainerProps) {
  return (
    <div className="mt-3 space-y-3">
      {blocks.length > 0 && (
        <div className="space-y-3">
          {blocks.map((block) => (
            <MediaBlock
              key={block.id}
              block={block}
              onUpdate={onUpdate}
              onRemove={onRemove}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Add Media Button - Left Aligned with Paperclip Icon */}
      {!disabled && (
        <div className="flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdd}
            className="h-8 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <Paperclip className="mr-1.5 h-3.5 w-3.5" />
            {buttonLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Helper to generate unique media block ID
 */
export function createMediaBlock(): MediaBlockData {
  return {
    id: `media-${Date.now()}`,
    title: '',
    imageUrl: '',
    caption: '',
  }
}
