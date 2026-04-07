'use client'

import { Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CalendarSyncSettingsProps } from '@/containers/settings/lib/types'
import { CalendarSelectionDropdown } from './CalendarSelectionDropdown'

export function CalendarSyncSettings({
  isConnected,
  isLoading,
  connectedAccount,
  onConnect,
  isConnecting,
  calendarSelection,
}: CalendarSyncSettingsProps) {
  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge
          variant="secondary"
          className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          <Loader2 className="mr-1 size-3 animate-spin" />
          Checking...
        </Badge>
      )
    }

    if (isConnected) {
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          <CheckCircle className="mr-1 size-3" />
          Connected
        </Badge>
      )
    }

    return (
      <Badge
        variant="secondary"
        className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
      >
        <XCircle className="mr-1 size-3" />
        Not Connected
      </Badge>
    )
  }

  return (
    <Card className="p-6">
      {/* Heading */}
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
          <Calendar className="text-primary size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Calendar Integration Settings</h2>
          <p className="text-muted-foreground text-sm">
            Connect and manage your Outlook calendar integration
          </p>
        </div>
      </div>

      {/* Connection Status Section */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge()}
            </div>

            {isConnected && connectedAccount?.email && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{connectedAccount.email}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!isConnected && !isLoading && (
              <Button onClick={onConnect} className="gap-2" disabled={isConnecting}>
                <Calendar className="size-4" />
                {isConnecting ? 'Connecting...' : 'Connect Outlook'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Selection Dropdown - Only show when connected */}
      {isConnected && (
        <div className="mt-4">
          <CalendarSelectionDropdown {...calendarSelection} />
        </div>
      )}

      {/* Information Note */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/10">
        <p className="text-sm text-blue-900 dark:text-blue-400">
          <strong>Note:</strong> Your calendar data is securely encrypted and only used to detect
          relevant meetings for your investment research workflow. The system automatically syncs
          meetings with company tickers and relevant keywords.
        </p>
      </div>
    </Card>
  )
}
