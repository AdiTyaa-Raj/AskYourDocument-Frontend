/**
 * Legacy Calendar Callback Page
 * Redirects to new Microsoft OAuth callback route
 * This route is kept for backwards compatibility
 */

'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LegacyCalendarCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Redirect to new Microsoft OAuth callback page with all query params
    const queryString = searchParams.toString()
    router.replace(`/oauth/microsoft/callback?${queryString}`)
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  )
}
