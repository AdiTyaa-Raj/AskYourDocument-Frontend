'use client'

import { useEffect, useRef } from 'react'
import Clarity from '@microsoft/clarity'

import { env } from '@/config/env'

export function MicrosoftClarityProvider() {
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (hasInitializedRef.current) return
    if (!env.enableAnalytics) return
    if (!env.clarityId) return

    Clarity.init(env.clarityId)
    hasInitializedRef.current = true
  }, [])

  return null
}
