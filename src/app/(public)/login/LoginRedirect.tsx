'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { readTokenExpiry, isTokenExpired } from '@/lib/authStorage'
import { authService } from '@/services/api/auth.service'

export function LoginRedirect() {
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    // Check if user is already logged in with valid token
    const expiresAt = readTokenExpiry()
    if (expiresAt && !isTokenExpired()) {
      // User is authenticated, redirect to dashboard
      router.replace('/dashboard')
      return
    }

    // User is not authenticated, redirect to login
    const callbackUrl = `${window.location.origin}/auth/callback`
    const url = authService.getLoginUrl(callbackUrl)
    setRedirecting(true)
    window.location.href = url
  }, [router])

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold">Redirecting to Authentik…</h1>
        <p className="text-muted-foreground text-sm">
          Follow the prompt in the Authentik window to sign in to RMS.
        </p>
      </div>
      {!redirecting && (
        <button
          type="button"
          className="text-primary text-sm underline"
          onClick={() => {
            window.location.href = authService.getLoginUrl()
          }}
        >
          Continue to Authentik
        </button>
      )}
    </div>
  )
}

export default LoginRedirect
