'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type RefObject,
  type UIEvent,
} from 'react'
import { Loader2 } from 'lucide-react'

import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type {
  TemplateUserMultiSelectProps,
  UserMentionDomCursor,
  UserMentionTextChunk,
} from '@/containers/memos/lib/types'
import {
  parseUserMultiFormValue,
  serializeUserMultiFormValue,
  subscribeResolvedUserMultiLabels,
  type UserMultiSegment,
} from '@/containers/memos/lib/user-multi-field'

const PILL_STYLE =
  'border-radius:6px;padding:1px 6px 2px;margin:0 2px;font-size:12px;font-weight:600;' +
  'background-color:#dbeafe;color:#0369a1;display:inline;vertical-align:baseline;'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function segmentsToHtml(segments: UserMultiSegment[]): string {
  const parts: string[] = []
  for (const seg of segments) {
    if (seg.type === 'text') {
      parts.push(escapeHtml(seg.text).replace(/\n/g, '<br />'))
    } else {
      const dn = escapeHtml(seg.displayName)
      parts.push(
        `<span data-mention="1" data-uid="${seg.userId}" contenteditable="false" style="${PILL_STYLE}">${escapeHtml('@')}${dn}</span>`
      )
    }
  }
  if (parts.length === 0) parts.push('&#8203;')
  return parts.join('')
}

function mergeLastText(segments: UserMultiSegment[], chunk: string): void {
  const clean = chunk.replace(/\u200b/g, '')
  if (!clean) return
  const last = segments[segments.length - 1]
  if (last?.type === 'text') {
    last.text += clean
  } else {
    segments.push({ type: 'text', text: clean })
  }
}

function parseEditorToSegments(root: HTMLElement): UserMultiSegment[] {
  const out: UserMultiSegment[] = []

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      mergeLastText(out, node.textContent || '')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    if (el.dataset.mention != null && el.dataset.uid != null) {
      const id = parseInt(el.dataset.uid, 10)
      const raw = (el.textContent || '').replace(/^@/, '').trim()
      if (Number.isFinite(id)) {
        out.push({ type: 'mention', userId: id, displayName: raw || `User ${id}` })
      }
      return
    }
    if (el.tagName === 'BR') {
      mergeLastText(out, '\n')
      return
    }
    for (const c of el.childNodes) walk(c)
  }

  for (const c of root.childNodes) walk(c)

  if (out.length === 0) return [{ type: 'text', text: '' }]
  const last = out[out.length - 1]
  if (last.type === 'mention') out.push({ type: 'text', text: '' })
  return out
}

function isNodeInsideMention(node: Node | null, boundary: HTMLElement): boolean {
  let n: Node | null = node
  while (n && n !== boundary) {
    if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).dataset?.mention != null) {
      return true
    }
    n = n.parentNode
  }
  return false
}

function getEditableTextBeforeCaret(editor: HTMLElement, sel: Selection): string {
  if (!sel.rangeCount || !sel.anchorNode || !editor.contains(sel.anchorNode)) return ''
  if (isNodeInsideMention(sel.anchorNode, editor)) return ''

  const range = document.createRange()
  range.selectNodeContents(editor)
  range.setEnd(sel.anchorNode, sel.anchorOffset)
  const frag = range.cloneContents()
  frag.querySelectorAll('[data-mention]').forEach((el) => el.remove())
  const holder = document.createElement('div')
  holder.appendChild(frag)
  return holder.textContent || ''
}

function collectTextChunks(editor: HTMLElement): UserMentionTextChunk[] {
  const chunks: UserMentionTextChunk[] = []
  let g = 0

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (isNodeInsideMention(node, editor)) return
      const tn = node as Text
      if (!tn.length) return
      chunks.push({ node: tn, start: g, len: tn.length })
      g += tn.length
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as HTMLElement
    if (el.dataset.mention != null) return
    for (const c of el.childNodes) walk(c)
  }

  for (const c of editor.childNodes) walk(c)
  return chunks
}

function mapTextIndexToDom(
  chunks: UserMentionTextChunk[],
  idx: number
): UserMentionDomCursor | null {
  for (const ch of chunks) {
    if (idx >= ch.start && idx <= ch.start + ch.len) {
      return { node: ch.node, offset: Math.min(idx - ch.start, ch.len) }
    }
  }
  return null
}

function getActiveMention(flat: string, caret: number): { start: number; query: string } | null {
  const before = flat.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at < 0) return null
  if (at > 0 && /[A-Za-z0-9]/.test(before[at - 1]!)) return null
  const raw = before.slice(at + 1)
  if (raw.length > 0 && /^\s+$/.test(raw)) return null
  const query = raw.trimEnd()
  if (raw.endsWith(' ') && query.length > 0) return null
  return { start: at, query }
}

function getActiveMentionFromEditor(editor: HTMLElement, sel: Selection) {
  const before = getEditableTextBeforeCaret(editor, sel)
  return { m: getActiveMention(before, before.length), before }
}

function renderMentionPickerListContent(options: {
  isLoading: boolean
  isError: boolean
  isFetchingNextPage: boolean
  usersFlatLength: number
  filteredUsers: ReadonlyArray<{ id: number; displayName: string }>
  filterQueryLower: string
  onPickUser: (userId: number, displayName: string) => void
  sentinelRef: RefObject<HTMLDivElement | null>
}) {
  const {
    isLoading,
    isError,
    isFetchingNextPage,
    usersFlatLength,
    filteredUsers,
    filterQueryLower,
    onPickUser,
    sentinelRef,
  } = options

  return (
    <>
      {isLoading && usersFlatLength === 0 ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-xs">
          <Loader2 className="size-3.5 animate-spin" />
          Loading people…
        </div>
      ) : null}
      {isError ? (
        <p className="text-destructive px-2 py-3 text-center text-xs">
          Could not load users. Try again.
        </p>
      ) : null}
      {!isLoading && !isError && filteredUsers.length === 0 ? (
        <p className="text-muted-foreground px-2 py-3 text-center text-xs">
          {filterQueryLower
            ? 'No matches in loaded list. Scroll to load more.'
            : 'No users loaded.'}
        </p>
      ) : null}
      {filteredUsers.map((u) => (
        <button
          key={u.id}
          type="button"
          className="hover:bg-accent flex w-full rounded-sm px-2 py-2 text-left text-xs"
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={() => onPickUser(u.id, u.displayName)}
        >
          <span className="font-medium">{u.displayName}</span>
        </button>
      ))}
      <div ref={sentinelRef} className="h-1 w-full shrink-0" aria-hidden />
      {isFetchingNextPage ? (
        <div className="text-muted-foreground flex justify-center py-2 text-[10px]">
          <Loader2 className="size-3 animate-spin" />
        </div>
      ) : null}
    </>
  )
}

export function TemplateUserMultiSelect({
  value,
  onChange,
  disabled = false,
  placeholder = 'Jot a note… use @ to mention someone',
  helperText,
  className,
  fetchUsersByIds,
  mentionPicker,
}: TemplateUserMultiSelectProps) {
  const parsed = useMemo(() => parseUserMultiFormValue(value), [value])
  const segments = useMemo((): UserMultiSegment[] => {
    return parsed.segments ?? [{ type: 'text' as const, text: '' }]
  }, [parsed.segments])

  const editorRef = useRef<HTMLDivElement>(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [filterQ, setFilterQ] = useState('')
  const isFocusedRef = useRef(false)
  const skipNotifyRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const prevValueRef = useRef(value)
  const didInitHtmlRef = useRef(false)

  useLayoutEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    if (!didInitHtmlRef.current) {
      didInitHtmlRef.current = true
      skipNotifyRef.current = true
      ed.innerHTML = segmentsToHtml(segments)
      skipNotifyRef.current = false
      prevValueRef.current = value
      return
    }
    if (isFocusedRef.current) return
    if (prevValueRef.current === value) return
    prevValueRef.current = value
    skipNotifyRef.current = true
    ed.innerHTML = segmentsToHtml(segments)
    skipNotifyRef.current = false
  }, [value, segments])

  const onChangeRef = useRef(onChange)
  const fetchUsersByIdsRef = useRef(fetchUsersByIds)
  onChangeRef.current = onChange
  fetchUsersByIdsRef.current = fetchUsersByIds

  useEffect(() => {
    return subscribeResolvedUserMultiLabels(value, fetchUsersByIdsRef.current, (next) => {
      onChangeRef.current(next)
    })
  }, [value])

  const {
    users: usersFlat,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = mentionPicker

  const fq = filterQ.trim().toLowerCase()
  const filteredUsers = useMemo(() => {
    if (!fq) return usersFlat
    return usersFlat.filter((u) => u.displayName.toLowerCase().includes(fq))
  }, [usersFlat, fq])

  useEffect(() => {
    if (!mentionOpen || disabled || isLoading || isError) return
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        if (visible && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { root, rootMargin: '48px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    mentionOpen,
    disabled,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    isError,
    usersFlat.length,
  ])

  const handleListScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 72
      if (nearBottom && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  const emitFromEditor = useCallback(() => {
    const ed = editorRef.current
    if (!ed || skipNotifyRef.current) return
    const nextSegs = parseEditorToSegments(ed)
    onChange(serializeUserMultiFormValue({ userIds: [], labels: {}, segments: nextSegs }))
  }, [onChange])

  const syncMentionUi = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    const sel = window.getSelection()
    if (!sel) return
    const { m } = getActiveMentionFromEditor(ed, sel)
    if (m) {
      setFilterQ(m.query)
      setMentionOpen(true)
    } else {
      setMentionOpen(false)
      setFilterQ('')
    }
  }, [])

  const handleInput = useCallback(() => {
    emitFromEditor()
    syncMentionUi()
  }, [emitFromEditor, syncMentionUi])

  const pickUser = useCallback(
    (userId: number, displayName: string) => {
      const ed = editorRef.current
      if (!ed) return
      const sel = window.getSelection()
      if (!sel) return
      const before = getEditableTextBeforeCaret(ed, sel)
      const m = getActiveMention(before, before.length)
      if (!m) {
        setMentionOpen(false)
        return
      }

      const chunks = collectTextChunks(ed)
      const startDom = mapTextIndexToDom(chunks, m.start)
      const endDom = mapTextIndexToDom(chunks, before.length)
      if (!startDom || !endDom) {
        setMentionOpen(false)
        return
      }

      const range = document.createRange()
      range.setStart(startDom.node, startDom.offset)
      range.setEnd(endDom.node, endDom.offset)
      range.deleteContents()

      const span = document.createElement('span')
      span.dataset.mention = '1'
      span.dataset.uid = String(userId)
      span.contentEditable = 'false'
      span.setAttribute('style', PILL_STYLE)
      span.textContent = `@${displayName}`
      range.collapse(true)
      range.insertNode(span)

      const nr = document.createRange()
      nr.setStartAfter(span)
      nr.collapse(true)
      sel.removeAllRanges()
      sel.addRange(nr)

      // Programmatic DOM insertion does not fire onInput reliably; emit explicitly.
      emitFromEditor()
      setMentionOpen(false)
      setFilterQ('')
    },
    [emitFromEditor]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && mentionOpen) {
        e.preventDefault()
        setMentionOpen(false)
        return
      }
      if (e.key === 'Enter' && mentionOpen && filteredUsers.length > 0) {
        const first = filteredUsers[0]
        if (first) {
          e.preventDefault()
          pickUser(first.id, first.displayName)
        }
      }
    },
    [mentionOpen, filteredUsers, pickUser]
  )

  const handlePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  if (disabled) {
    const segs = parsed.segments?.length ? parsed.segments : migrateSegmentsForView(parsed)
    const has = segs.some(
      (s) => s.type === 'mention' || (s.type === 'text' && s.text.replace(/\u200b/g, '').trim())
    )
    if (!has) {
      return (
        <div className={cn('space-y-1.5', className)}>
          <span className="text-muted-foreground text-sm italic">Not provided</span>
        </div>
      )
    }
    return (
      <div
        className={cn(
          'text-foreground bg-muted/30 min-h-9 rounded-md border border-transparent px-2 py-1.5 text-xs leading-relaxed',
          className
        )}
      >
        {segs.map((s, i) =>
          s.type === 'mention' ? (
            <span
              key={i}
              className="mx-0.5 inline rounded-md bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
            >
              @{s.displayName}
            </span>
          ) : (
            <span key={i} className="whitespace-pre-wrap">
              {s.text}
            </span>
          )
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
        <PopoverAnchor asChild>
          <div className="relative w-full">
            <div
              ref={editorRef}
              role="textbox"
              aria-multiline="false"
              aria-haspopup="listbox"
              contentEditable={!disabled}
              suppressContentEditableWarning
              data-placeholder={placeholder}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onKeyUp={syncMentionUi}
              onClick={syncMentionUi}
              onFocus={() => {
                isFocusedRef.current = true
              }}
              onBlur={() => {
                isFocusedRef.current = false
              }}
              onPaste={handlePaste}
              className={cn(
                'border-input min-h-9 w-full rounded-md border bg-transparent px-2 py-1.5 text-xs leading-relaxed outline-none',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
                '[&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]'
              )}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="max-w-[min(100vw-2rem,320px)] min-w-[240px] p-0 sm:min-w-[280px]"
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(ev) => ev.preventDefault()}
        >
          <div ref={scrollRef} className="max-h-56 overflow-y-auto p-1" onScroll={handleListScroll}>
            {renderMentionPickerListContent({
              isLoading,
              isError,
              isFetchingNextPage,
              usersFlatLength: usersFlat.length,
              filteredUsers,
              filterQueryLower: fq,
              onPickUser: pickUser,
              sentinelRef,
            })}
          </div>
        </PopoverContent>
      </Popover>

      {helperText ? <p className="text-muted-foreground text-[11px]">{helperText}</p> : null}
    </div>
  )
}

function migrateSegmentsForView(
  parsed: ReturnType<typeof parseUserMultiFormValue>
): UserMultiSegment[] {
  const { userIds, labels, legacyText } = parsed
  const out: UserMultiSegment[] = []
  for (const id of userIds) {
    out.push({
      type: 'mention',
      userId: id,
      displayName: labels[String(id)]?.trim() || `User ${id}`,
    })
  }
  if (legacyText?.trim()) mergeLastText(out, legacyText)
  if (out.length === 0) return [{ type: 'text', text: '' }]
  return out
}
