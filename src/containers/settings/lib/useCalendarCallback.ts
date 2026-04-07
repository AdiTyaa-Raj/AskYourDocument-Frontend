/**
 * Calendar Callback Hook
 * Handles OAuth callback processing logic
 */

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCalendarCallback } from '@/containers/settings/lib/queries'
import { useCalendarConnection } from '@/containers/settings/lib/hooks'
import {
  extractOAuthParams,
  validateOAuthCallback,
  handleOAuthError,
  notifyOAuthSuccess,
  redirectAfterDelay,
  type OAuthCallbackStatus,
} from '@/lib/oauth/shared'

type CallbackStatus = OAuthCallbackStatus

interface UseCalendarCallbackReturn {
  status: CallbackStatus
  errorMessage: string
  handleRetry: () => void
}

export function useCalendarCallbackProcess(): UseCalendarCallbackReturn {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackMutation = useCalendarCallback()
  const { updateConnection } = useCalendarConnection()

  const [status, setStatus] = useState<CallbackStatus>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [hasProcessed, setHasProcessed] = useState(false)

  useEffect(() => {
    // Prevent duplicate processing
    if (hasProcessed) return

    const params = extractOAuthParams(searchParams)
    const validation = validateOAuthCallback(params)

    // Handle validation errors
    if (!validation.valid) {
      handleValidationError(validation.error || 'Invalid callback parameters')
      return
    }

    // Mark as processed to prevent duplicate calls
    setHasProcessed(true)

    // Process the callback
    processOAuthCallback(params.code!, params.state, params.clientInfo)
  }, [])

  /**
   * Handle validation errors (OAuth errors or missing code)
   */
  function handleValidationError(error: string) {
    setStatus('error')
    setErrorMessage(error)
    setHasProcessed(true)

    handleOAuthError('Calendar OAuth validation failed', error, 'Calendar Connection Failed')
  }

  /**
   * Process OAuth callback with backend
   */
  async function processOAuthCallback(
    code: string,
    state?: string | null,
    clientInfo?: string | null
  ) {
    try {
      const response = await callbackMutation.mutateAsync({
        code,
        state: state || undefined,
        clientInfo: clientInfo || undefined,
      })

      // Update connection status
      updateConnection({
        is_connected: true,
        status: response.status as 'connected' | 'disconnected' | 'error' | 'syncing',
        last_sync_time: new Date().toISOString(),
      })

      setStatus('success')
      notifyOAuthSuccess(
        'Calendar Connected Successfully',
        'Your calendar has been connected successfully'
      )

      // Redirect after success
      redirectAfterDelay(router, '/settings')
    } catch (err) {
      handleProcessingError(err)
    }
  }

  /**
   * Handle processing errors
   */
  function handleProcessingError(err: unknown) {
    setStatus('error')
    const errorMsg = handleOAuthError(
      'Calendar callback processing failed',
      err,
      'Calendar Connection Failed'
    )
    setErrorMessage(errorMsg)
  }

  /**
   * Handle retry button click
   */
  function handleRetry() {
    router.push('/settings')
  }

  return {
    status,
    errorMessage,
    handleRetry,
  }
}
