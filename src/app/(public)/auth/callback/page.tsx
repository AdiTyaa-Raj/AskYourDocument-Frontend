'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppDispatch } from '@/store'
import { completeAuthentication, getLoginUrl } from '@/lib/authCallback'
import {
  extractOAuthParams,
  validateOAuthCallback,
  type OAuthCallbackStatus,
} from '@/lib/oauth/shared'

export default function AuthCallbackPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<OAuthCallbackStatus>('processing')
  const [message, setMessage] = useState('Completing authentication…')

  const queryString = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    const params = extractOAuthParams(searchParams)
    const validation = validateOAuthCallback(params)

    // Handle validation errors
    if (!validation.valid) {
      setStatus('error')
      setMessage(validation.error || 'Invalid authorization. Please try signing in again.')
      return
    }

    // Complete login authentication
    void handleLoginAuthentication(params.code!)
  }, [dispatch, queryString, router, searchParams])

  /**
   * Handles the login authentication flow
   */
  async function handleLoginAuthentication(code: string) {
    try {
      await completeAuthentication({ code, queryString }, dispatch)

      // Navigate to dashboard on success
      router.replace('/dashboard')
    } catch {
      setStatus('error')
      setMessage('We could not complete authentication. Please try signing in again.')
    }
  }

  if (status === 'error') {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-foreground text-2xl font-semibold">Authentication Error</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <button
          type="button"
          className="text-primary text-sm underline"
          onClick={() => {
            window.location.href = getLoginUrl()
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-foreground text-2xl font-semibold">Signing you in…</h1>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
