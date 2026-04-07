'use client'

import { useState, useCallback } from 'react'
import { AlertCircle, Filter, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounced } from '@/lib/hooks/useDebounce'
import { ReminderItem } from './components/ReminderItem'
import { EmptyState } from './components/EmptyState'
import { CustomDateTimeDialog } from './components/CustomDateTimeDialog'
import {
  useRemindersQuery,
  useCompleteReminderMutation,
  useDismissReminderMutation,
  useSnoozeReminderMutation,
  useCustomSnoozeReminderMutation,
} from './lib/queries'
import type { ReminderTab, ReminderEntityType, SnoozePreset } from './lib/types'
import { TABS, tabBadgeClass, REMINDER_ENTITY_TYPE_OPTIONS, DEFAULT_PAGE_SIZE } from './lib/helper'
import { useRouter } from 'next/navigation'

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function ReminderSkeleton() {
  return (
    <div className="animate-pulse rounded-sm border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 flex-shrink-0 rounded bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 rounded bg-gray-100" />
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-1/4 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  )
}

// ─── Main container ────────────────────────────────────────────────────────────

export function RemindersContainer() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<ReminderTab>('in_progress')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState<ReminderEntityType>('all')

  // Custom snooze dialog state
  const [showCustomSnoozeDialog, setShowCustomSnoozeDialog] = useState(false)
  const [snoozeTargetId, setSnoozeTargetId] = useState<number | null>(null)
  const [customSnoozeDate, setCustomSnoozeDate] = useState('')
  const [customSnoozeTime, setCustomSnoozeTime] = useState('')

  // Debounce search input (300 ms)
  const debouncedSetSearch = useDebounced((q: string) => setDebouncedSearch(q), 300)

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
      debouncedSetSearch(e.target.value)
    },
    [debouncedSetSearch]
  )

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useRemindersQuery({
    tab: activeTab,
    search: debouncedSearch || undefined,
    entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
    skip: 0,
    limit: DEFAULT_PAGE_SIZE,
  })

  const items = data?.items ?? []
  const counts = data?.counts

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const complete = useCompleteReminderMutation()
  const dismiss = useDismissReminderMutation()
  const snooze = useSnoozeReminderMutation()
  const customSnooze = useCustomSnoozeReminderMutation()

  const isMutating =
    complete.isPending || dismiss.isPending || snooze.isPending || customSnooze.isPending

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleComplete = (id: number) => complete.mutate(id)
  const handleDismiss = (id: number) => dismiss.mutate(id)

  const handleSnooze = (id: number, preset: SnoozePreset) => snooze.mutate({ id, preset })

  const handleCustomSnoozeOpen = (id: number) => {
    setSnoozeTargetId(id)
    setShowCustomSnoozeDialog(true)
  }

  const handleCustomSnoozeSubmit = () => {
    if (snoozeTargetId !== null && customSnoozeDate && customSnoozeTime) {
      customSnooze.mutate({ id: snoozeTargetId, date: customSnoozeDate, time: customSnoozeTime })
    }
    setShowCustomSnoozeDialog(false)
    setCustomSnoozeDate('')
    setCustomSnoozeTime('')
    setSnoozeTargetId(null)
  }

  const handleNavigate = (actionUrl: string) => {
    router.push(actionUrl)
  }

  // ─── Tab change resets search ───────────────────────────────────────────────

  const handleTabChange = (tab: ReminderTab) => {
    setActiveTab(tab)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="mb-1 text-lg text-gray-900">Reminders</h2>
        <p className="text-xs text-gray-600">Manage your reminders and follow-up tasks</p>
      </div>

      {/* Tabs & Controls */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-200">
        {/* Tab buttons */}
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label }) => {
            const isActive = activeTab === id
            const count = counts?.[id] ?? 0

            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`relative px-4 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-2 h-4 px-1.5 text-[10px] ${tabBadgeClass(id, isActive)}`}
                  >
                    {count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-2 pb-1">
          <div className="relative">
            <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="h-8 w-64 pl-8 text-xs"
            />
          </div>

          <Select
            value={entityTypeFilter}
            onValueChange={(v) => setEntityTypeFilter(v as ReminderEntityType)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <Filter className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_ENTITY_TYPE_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <ReminderSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-sm border border-gray-200 bg-white py-12 text-center">
          <AlertCircle className="mx-auto mb-2 h-10 w-10 text-red-300" />
          <div className="mb-0.5 text-sm text-gray-900">Failed to load reminders</div>
          <div className="text-xs text-gray-500">Please try refreshing the page</div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="space-y-2">
          {items.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              isCompleted={activeTab === 'completed'}
              onComplete={handleComplete}
              onDismiss={handleDismiss}
              onSnooze={handleSnooze}
              onCustomSnooze={handleCustomSnoozeOpen}
              onNavigate={handleNavigate}
              isLoading={isMutating}
            />
          ))}
        </div>
      )}

      {/* Custom Snooze Dialog */}
      <CustomDateTimeDialog
        open={showCustomSnoozeDialog}
        onOpenChange={setShowCustomSnoozeDialog}
        title="Set Custom Snooze Time"
        description="Choose when you'd like to be reminded again."
        submitLabel="Set Snooze"
        date={customSnoozeDate}
        time={customSnoozeTime}
        onDateChange={setCustomSnoozeDate}
        onTimeChange={setCustomSnoozeTime}
        onSubmit={handleCustomSnoozeSubmit}
        onCancel={() => setShowCustomSnoozeDialog(false)}
      />
    </div>
  )
}
