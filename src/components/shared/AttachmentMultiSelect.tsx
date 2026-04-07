'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StageAttachment } from '@/lib/attachments'

export type AttachmentMultiSelectProps = {
  label: string
  placeholder: string
  items: StageAttachment[]
  selectedItems: StageAttachment[]
  onSelectItem: (item: StageAttachment) => void
  onRemoveItem: (item: StageAttachment) => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage?: boolean
  fetchNextPage: () => void
  errorMessage?: string
  helperText?: React.ReactNode
  required?: boolean
}

export function AttachmentMultiSelect({
  label,
  placeholder,
  items,
  selectedItems,
  onSelectItem,
  onRemoveItem,
  searchTerm,
  onSearchTermChange,
  isLoading,
  isFetchingNextPage,
  hasNextPage = false,
  fetchNextPage,
  errorMessage,
  helperText,
  required = false,
}: AttachmentMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const selectedIds = useMemo(() => new Set(selectedItems.map((item) => item.id)), [selectedItems])
  const filteredItems = useMemo(() => {
    if (!normalizedSearch) return items
    return items.filter((item) => {
      const labelMatch = item.label.toLowerCase().includes(normalizedSearch)
      const subLabelMatch = item.subLabel?.toLowerCase().includes(normalizedSearch) ?? false
      return labelMatch || subLabelMatch
    })
  }, [items, normalizedSearch])

  const handleSelect = (item: StageAttachment) => {
    if (selectedIds.has(item.id)) {
      onRemoveItem(item)
    } else {
      onSelectItem(item)
    }
  }

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    if (!hasNextPage || isFetchingNextPage) return
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 24) {
      fetchNextPage()
    }
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    // Prevent wheel event from bubbling to parent modal
    event.stopPropagation()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1 text-sm font-medium">
        <span className="text-foreground">
          {label}
          {required ? <span className="text-destructive ml-1">*</span> : null}
        </span>
        {helperText ? (
          <div className="text-muted-foreground text-xs leading-snug">{helperText}</div>
        ) : null}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span
              className={cn(
                'truncate text-left',
                selectedItems.length ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {selectedItems.length ? `${selectedItems.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-[100] w-[520px] max-w-[calc(100vw-48px)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={searchTerm}
              onValueChange={onSearchTermChange}
              placeholder={`Search ${label.toLowerCase()}...`}
            />
            <CommandList
              className="max-h-60 overflow-y-auto"
              onScroll={handleScroll}
              onWheel={handleWheel}
            >
              {isLoading && !filteredItems.length ? (
                <div className="text-muted-foreground py-6 text-center text-sm">Loading…</div>
              ) : null}
              {!isLoading && filteredItems.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  {errorMessage || 'No results found.'}
                </div>
              ) : (
                <CommandGroup>
                  {filteredItems.map((item) => {
                    const active = selectedIds.has(item.id)
                    return (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        value={`${item.type}-${item.id}`}
                        onSelect={() => handleSelect(item)}
                      >
                        <div className="flex w-full items-center gap-3">
                          <div className="flex flex-1 flex-col gap-0.5">
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.subLabel ? (
                              <span className="text-muted-foreground text-xs">{item.subLabel}</span>
                            ) : null}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-muted-foreground text-[10px] uppercase"
                          >
                            {item.type === 'memo' ? 'Memo' : 'Document'}
                          </Badge>
                          {active ? <Check className="text-primary h-4 w-4" /> : null}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
              {isFetchingNextPage ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading more…
                </div>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedItems.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <Badge
              key={`${item.type}-${item.id}`}
              variant="secondary"
              className="flex max-w-full min-w-0 items-center gap-1"
              title={item.label}
            >
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.label}</span>
              <button
                type="button"
                aria-label={`Remove ${item.label}`}
                className="text-muted-foreground hover:text-foreground shrink-0 rounded-full p-0.5 transition-colors"
                onClick={(event) => {
                  event.stopPropagation()
                  onRemoveItem(item)
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">No {label.toLowerCase()} selected.</p>
      )}
    </div>
  )
}
