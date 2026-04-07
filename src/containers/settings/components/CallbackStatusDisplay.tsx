/**
 * Callback Status Display Component
 * Pure presentational component for displaying callback status
 */

import { Loader2, CheckCircle2, XCircle, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type CallbackStatus = 'processing' | 'success' | 'error'

interface CallbackStatusDisplayProps {
  status: CallbackStatus
  errorMessage?: string
  onRetry?: () => void
}

/**
 * Status Icon Component
 */
function StatusIcon({ status }: { status: CallbackStatus }) {
  return (
    <div className="mb-6">
      {status === 'processing' && (
        <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
      )}
      {status === 'success' && (
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
          <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
        </div>
      )}
      {status === 'error' && (
        <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <XCircle className="size-8 text-red-600 dark:text-red-400" />
        </div>
      )}
    </div>
  )
}

/**
 * Status Title Component
 */
function StatusTitle({ status }: { status: CallbackStatus }) {
  const titles = {
    processing: 'Connecting Calendar...',
    success: 'Calendar Connected!',
    error: 'Connection Failed',
  }

  return <>{titles[status]}</>
}

/**
 * Status Description Component
 */
function StatusDescription({
  status,
  errorMessage,
}: {
  status: CallbackStatus
  errorMessage?: string
}) {
  const descriptions = {
    processing: 'Please wait while we complete the connection process...',
    success: 'Your calendar has been successfully connected. Redirecting you back to settings...',
    error: errorMessage || 'Something went wrong. Please try again.',
  }

  return <>{descriptions[status]}</>
}

/**
 * Status Actions Component
 */
function StatusActions({ status, onRetry }: { status: CallbackStatus; onRetry?: () => void }) {
  if (status === 'error') {
    return (
      <div className="flex gap-3">
        <Button onClick={onRetry} variant="default">
          <Calendar className="mr-2 size-4" />
          Back to Settings
        </Button>
      </div>
    )
  }

  if (status === 'processing') {
    return <div className="text-muted-foreground text-xs">This may take a few seconds...</div>
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Loader2 className="size-3 animate-spin" />
        <span>Redirecting...</span>
      </div>
    )
  }

  return null
}

export function CallbackStatusDisplay({
  status,
  errorMessage,
  onRetry,
}: CallbackStatusDisplayProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          {/* Status Icon */}
          <StatusIcon status={status} />

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold">
            <StatusTitle status={status} />
          </h1>

          {/* Description */}
          <p className="text-muted-foreground mb-6 text-sm">
            <StatusDescription status={status} errorMessage={errorMessage} />
          </p>

          {/* Action Area */}
          <StatusActions status={status} onRetry={onRetry} />
        </div>
      </Card>
    </div>
  )
}
