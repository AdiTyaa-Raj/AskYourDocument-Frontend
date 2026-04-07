'use client'

import type { ImageData } from '@/containers/memos/lib/types'
import { ImageIcon } from 'lucide-react'

/**
 * Resolve image URL - prefer presigned URL from templateImageUrls
 */
function resolveImageUrl(
  image: ImageData,
  templateImageUrls: Record<string, string>
): string | undefined {
  if (image.s3Key && templateImageUrls[image.s3Key]) {
    return templateImageUrls[image.s3Key]
  }
  return undefined
}

interface ImageCardsProps {
  images: ImageData[]
  templateImageUrls?: Record<string, string>
}

/**
 * Component to render image cards with actual images or placeholders
 */
export function ImageCards({ images, templateImageUrls = {} }: ImageCardsProps) {
  if (!images || images.length === 0) return null

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image, index) => {
        const imageUrl = resolveImageUrl(image, templateImageUrls)
        const isLoadingImage = !imageUrl && Boolean(image.s3Key)

        return (
          <div
            key={image.s3Key || index}
            className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={image.caption || 'Supporting image'}
                className="max-h-[300px] w-full rounded-lg border border-gray-200 object-contain"
              />
            ) : isLoadingImage ? (
              <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white">
                <p className="text-sm text-gray-400">Loading image...</p>
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-xs text-gray-400">Image</p>
                </div>
              </div>
            )}
            {/* Caption */}
            {image.caption && <p className="text-sm text-gray-600 italic">{image.caption}</p>}
          </div>
        )
      })}
    </div>
  )
}
