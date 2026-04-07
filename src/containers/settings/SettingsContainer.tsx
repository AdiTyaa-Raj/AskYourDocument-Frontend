'use client'

import { useEffect, useState } from 'react'
import {
  useAvailableCalendars,
  useLinkedCalendars,
  useSelectCalendars,
  useSyncCalendarEvents,
  useConnectCalendar,
  useSetPassword,
} from '@/containers/settings/lib/queries'
import {
  buildSelectCalendarsPayload,
  getInitialSelectedIds,
  getDefaultCalendarIds,
} from '@/containers/settings/lib/helpers'
import { CalendarSyncSettings, PasswordSettings } from '@/containers/settings/components'
import notify from '@/lib/notifications'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShieldCheck, PlugZap } from 'lucide-react'

export function SettingsContainer() {
  // Calendar selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hasInitialized, setHasInitialized] = useState(false)
  const [syncingCalendarId, setSyncingCalendarId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'integrations' | 'security'>('integrations')

  // Connect calendar mutation
  const connectMutation = useConnectCalendar()

  // Fetch linked calendars to determine connection status
  const { data: linkedData, isLoading: isLoadingLinked } = useLinkedCalendars(1, 25)

  // Determine connection status from API response
  const isConnected =
    linkedData?.items && linkedData.items.length > 0 && linkedData.items[0]?.is_active
  const connectedAccount = isConnected ? linkedData.items[0] : null
  const lastSyncTime = connectedAccount?.token_expiry

  // Only fetch available calendars if calendar is connected
  // Don't fetch if there are just items but no active connection to avoid "resource not found" errors
  const shouldFetchAvailable = isConnected ?? false

  // Fetch available calendars (only when connected)
  const {
    data: availableData,
    isLoading: isLoadingAvailable,
    error: availableError,
  } = useAvailableCalendars(shouldFetchAvailable)

  // Fetch linked calendars (already synced) - for calendar selection
  const {
    data: linkedDataForSelection,
    isLoading: isLoadingLinkedForSelection,
    error: linkedError,
  } = useLinkedCalendars(1, 25)

  // Select calendars mutation
  const selectMutation = useSelectCalendars()

  // Sync individual calendar events mutation
  const syncEventsMutation = useSyncCalendarEvents()
  const setPasswordMutation = useSetPassword()

  // Initialize selected calendars from linked calendars OR default calendars
  useEffect(() => {
    if (hasInitialized) return

    // Priority 1: Initialize from linked calendars (user's previous selection)
    if (linkedDataForSelection?.items && linkedDataForSelection.items.length > 0) {
      const initialSelected = getInitialSelectedIds(linkedDataForSelection.items)
      setSelectedIds(initialSelected)
      setHasInitialized(true)
      return
    }

    // Priority 2: Initialize with default calendars (auto-select non-removable ones)
    if (availableData?.calendars && availableData.calendars.length > 0) {
      const defaultIds = getDefaultCalendarIds(availableData.calendars)
      setSelectedIds(defaultIds)
      setHasInitialized(true)
    }
  }, [linkedDataForSelection, availableData, hasInitialized])

  // Handle calendar connection
  const handleConnect = async () => {
    try {
      await connectMutation.mutateAsync()
      // The mutation will redirect to Microsoft OAuth
    } catch (error) {
      console.error('Failed to initiate connection:', error)
      notify.error({
        title: 'Connection Failed',
        description: 'Failed to initiate calendar connection. Please try again.',
      })
    }
  }

  // Handle calendar selection toggle
  const handleToggleCalendar = (calendarId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId)
      } else {
        newSet.add(calendarId)
      }
      return newSet
    })
  }

  // Handle save selection
  const handleSaveSelection = async () => {
    if (!availableData?.calendars) {
      notify.error({
        title: 'Error',
        description: 'No calendars available to select',
      })
      return
    }

    try {
      const payload = buildSelectCalendarsPayload(availableData.calendars, selectedIds)
      await selectMutation.mutateAsync(payload)
    } catch (error) {
      console.error('Failed to save calendar selection:', error)
    }
  }

  // Handle individual calendar sync
  const handleSyncCalendar = async (calendarId: string, calendarName: string) => {
    setSyncingCalendarId(calendarId)
    try {
      const result = await syncEventsMutation.mutateAsync(calendarId)
      notify.success({
        title: 'Calendar Synced',
        description: `${calendarName}: ${result.new_or_updated} events synced, ${result.skipped_public} skipped`,
      })
    } catch (error) {
      console.error('Failed to sync calendar:', error)
      notify.error({
        title: 'Sync Failed',
        description: `Failed to sync ${calendarName}. Please try again.`,
      })
    } finally {
      setSyncingCalendarId(null)
    }
  }

  const handleSetPassword = () => {
    const trimmed = password.trim()
    if (trimmed.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (trimmed !== confirmPassword.trim()) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordError(null)
    setPasswordMutation.mutate(trimmed, {
      onSuccess: () => {
        notify.success({
          title: 'Password updated',
          description: 'Your password has been changed.',
        })
        setPassword('')
        setConfirmPassword('')
        setPasswordError(null)
      },
      onError: (error) => {
        const description =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Unable to set password. Please try again.'
        notify.error({ title: 'Update failed', description })
      },
    })
  }

  return (
    <div className="border-border/50 bg-card/50 space-y-8 rounded-xl border p-6 shadow-sm">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account settings and integrations.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="integrations" className="gap-2">
            <PlugZap className="size-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck className="size-4" />
            Account Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-4 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Integrations</h2>
            <p className="text-muted-foreground text-sm">
              Connect and manage your third-party integrations.
            </p>
          </div>

          <CalendarSyncSettings
            isConnected={isConnected ?? false}
            isLoading={isLoadingLinked}
            connectedAccount={connectedAccount}
            lastSyncTime={lastSyncTime}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
            calendarSelection={{
              isConnected: isConnected ?? false,
              availableCalendars: availableData?.calendars || [],
              selectedIds,
              isLoading: isLoadingAvailable || isLoadingLinkedForSelection,
              error: availableError || linkedError || null,
              syncingCalendarId,
              isSaving: selectMutation.isPending,
              onToggleCalendar: handleToggleCalendar,
              onSaveSelection: handleSaveSelection,
              onSyncCalendar: handleSyncCalendar,
            }}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Account Security</h2>
            <p className="text-muted-foreground text-sm">
              Set or update your password to protect your account.
            </p>
          </div>
          <PasswordSettings
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirmPassword}
            onSubmit={handleSetPassword}
            isSubmitting={setPasswordMutation.isPending}
            errorMessage={passwordError}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
