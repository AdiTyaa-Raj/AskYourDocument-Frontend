import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * Keeps a textarea height in sync with its content up to maxHeightPx, then scrolls.
 */
export function useAutoResizeTextarea(value: string, maxHeightPx: number) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(el.scrollHeight, maxHeightPx)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > maxHeightPx ? 'auto' : 'hidden'
  }, [maxHeightPx])

  useLayoutEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  return textareaRef
}
