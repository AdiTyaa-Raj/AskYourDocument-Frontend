'use client'

import { Calendar as CalendarIcon, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { CalendarSelectionDropdownProps } from '@/containers/settings/lib/types'

export function CalendarSelectionDropdown({
  isConnected,
  availableCalendars,
  selectedIds,
  isLoading,
  error,
  syncingCalendarId,
  isSaving,
  onToggleCalendar,
  onSaveSelection,
  onSyncCalendar,
}: CalendarSelectionDropdownProps) {
  // Don't render if not connected
  if (!isConnected) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="mt-4 p-4">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading calendars...</span>
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="mt-4 p-4">
        <div className="text-sm text-red-600 dark:text-red-400">
          Failed to load calendars. Please try reconnecting.
        </div>
      </Card>
    )
  }

  // Show message if no calendars available
  if (availableCalendars.length === 0) {
    return (
      <Card className="mt-4 p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Calendar Selection</h3>
            <p className="text-muted-foreground text-xs">
              Choose which calendars to sync with your account
            </p>
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            No calendars found. Make sure your Outlook account has calendars set up.
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="mt-4 p-4">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold">Calendar Selection</h3>
          <p className="text-muted-foreground text-xs">
            Choose which calendars to sync with your account
          </p>
        </div>

        {/* All Calendars List */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs font-medium">Available Calendars</div>
          <div className="space-y-2">
            {availableCalendars.map((calendar) => {
              const isSelected = selectedIds.has(calendar.id)
              const isDefault = !calendar.isRemovable
              const isSyncing = syncingCalendarId === calendar.id

              return (
                <div
                  key={calendar.id}
                  className={`hover:border-primary/50 flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50'
                  }`}
                  onClick={() => onToggleCalendar(calendar.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleCalendar(calendar.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <CalendarIcon className="text-muted-foreground size-4" />
                  <span className="flex-1 text-sm font-medium">{calendar.name}</span>

                  {isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}

                  {/* Individual Sync Button - Only show for selected calendars */}
                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSyncCalendar(calendar.id, calendar.name)
                      }}
                      disabled={isSyncing}
                      className="h-7 px-2 text-xs"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="mr-1 size-3 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1 size-3" />
                          Sync
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-muted-foreground text-xs">
            {selectedIds.size} of {availableCalendars.length} calendars selected
          </div>
          <Button onClick={onSaveSelection} disabled={isSaving || selectedIds.size === 0} size="sm">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Selection'
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
