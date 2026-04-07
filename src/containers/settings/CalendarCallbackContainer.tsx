/**
 * Calendar Callback Container
 * Orchestrates OAuth callback processing and status display
 */

'use client'

import { useCalendarCallbackProcess } from '@/containers/settings/lib/useCalendarCallback'
import { CallbackStatusDisplay } from '@/containers/settings/components/CallbackStatusDisplay'

export function CalendarCallbackContainer() {
  const { status, errorMessage, handleRetry } = useCalendarCallbackProcess()

  return <CallbackStatusDisplay status={status} errorMessage={errorMessage} onRetry={handleRetry} />
}
