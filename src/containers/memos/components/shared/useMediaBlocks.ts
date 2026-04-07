'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { MediaBlockData, SectionData } from '@/containers/memos/lib/types'
import {
  getImageS3KeysFromFormValues,
  imageDataToMediaBlock,
  buildMediaBlocksFromFormValues,
  applyTemplateUrlsToMediaBlocks,
} from '@/containers/memos/lib/helpers'
import { createMediaBlock } from './MediaBlock'

/**
 * Custom hook to manage multiple media block sections
 * Reduces boilerplate for useState, handlers, and useEffect syncing
 */
export function useMediaBlocks(
  formValues: Record<string, unknown>,
  onFieldChange: (fieldId: string, value: string) => void,
  sectionKeys: readonly string[],
  templateImageUrls: Record<string, string> = {}
) {
  // Track previous values to detect changes (globally scoped refs)
  const prevTemplateUrlKeys = useRef('')
  const prevFormValuesImageKeys = useRef('')
  const hasInitializedFromFormValues = useRef(false)
  const isInitialMount = useRef(true)

  // Memoize the list of S3 keys from templateImageUrls to track when new URLs are loaded
  const templateUrlKeys = useMemo(
    () => Object.keys(templateImageUrls).sort().join(','),
    [templateImageUrls]
  )

  // Memoize the S3 keys from formValues to track when images load
  const formValuesImageKeys = useMemo(
    () => getImageS3KeysFromFormValues(formValues, sectionKeys),
    [formValues, sectionKeys]
  )

  // Initialize all media blocks from form values
  const [mediaBlocks, setMediaBlocks] = useState<Record<string, MediaBlockData[]>>(() => {
    const initial: Record<string, MediaBlockData[]> = {}
    sectionKeys.forEach((key) => {
      // First, check if there are existing images in the section data (formValues[key].images)
      const sectionData = formValues[key] as SectionData | undefined
      if (sectionData?.images && sectionData.images.length > 0) {
        // Convert ImageData[] to MediaBlockData[] using templateImageUrls
        initial[key] = sectionData.images.map((img) =>
          imageDataToMediaBlock(img, templateImageUrls)
        )
      } else {
        // Fallback to reading from the Media field (formValues[keyMedia])
        const mediaKey = `${key}Media`
        const saved = formValues[mediaKey] as string
        initial[key] = saved ? JSON.parse(saved) : []
      }
    })
    return initial
  })

  // Re-initialize media blocks when formValues.images loads (async scenario)
  // This handles the case when document data loads after initial render
  useEffect(() => {
    // Only re-initialize if formValues now has images and we haven't initialized from them yet
    if (
      formValuesImageKeys !== prevFormValuesImageKeys.current &&
      formValuesImageKeys.length > 0 &&
      !hasInitializedFromFormValues.current
    ) {
      prevFormValuesImageKeys.current = formValuesImageKeys
      hasInitializedFromFormValues.current = true
      setMediaBlocks(buildMediaBlocksFromFormValues(formValues, sectionKeys, templateImageUrls))
    }
  }, [formValuesImageKeys, formValues, sectionKeys, templateImageUrls])

  // Update media blocks when templateImageUrls loads (async scenario)
  // This handles the case when URLs are fetched after initial render
  useEffect(() => {
    // Only update if templateImageUrls has changed and now has URLs
    if (
      templateUrlKeys !== prevTemplateUrlKeys.current &&
      Object.keys(templateImageUrls).length > 0
    ) {
      prevTemplateUrlKeys.current = templateUrlKeys
      setMediaBlocks((prev) => applyTemplateUrlsToMediaBlocks(prev, templateImageUrls, sectionKeys))
    }
  }, [templateUrlKeys, templateImageUrls, sectionKeys])

  // Sync all media blocks to form values when they change
  useEffect(() => {
    // Skip the initial mount to avoid overwriting with empty values
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    sectionKeys.forEach((key) => {
      const mediaKey = `${key}Media`
      onFieldChange(mediaKey, JSON.stringify(mediaBlocks[key] || []))
    })
  }, [mediaBlocks, onFieldChange, sectionKeys])

  // Create handlers for a specific section
  const getHandlers = useCallback(
    (key: string) => ({
      onAdd: () =>
        setMediaBlocks((prev) => ({
          ...prev,
          [key]: [...(prev[key] || []), createMediaBlock()],
        })),
      onUpdate: (id: string, field: keyof MediaBlockData, value: string) => {
        setMediaBlocks((prev) => ({
          ...prev,
          [key]: (prev[key] || []).map((block) =>
            block.id === id ? { ...block, [field]: value } : block
          ),
        }))
      },
      onRemove: (id: string) => {
        setMediaBlocks((prev) => ({
          ...prev,
          [key]: (prev[key] || []).filter((block) => block.id !== id),
        }))
      },
    }),
    []
  )

  return { mediaBlocks, getHandlers }
}
