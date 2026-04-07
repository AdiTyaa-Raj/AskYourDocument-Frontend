'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/store'
import { hydrate, type AuthUser } from '@/store/slices/authSlice'
import {
  readTokenExpiry,
  readStoredUserInfo,
  setAuthCookie,
  isTokenExpired,
} from '@/lib/authStorage'

export function AuthInitializer() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const expiresAt = readTokenExpiry()
    const storedUserInfo = readStoredUserInfo()

    if (!expiresAt || !storedUserInfo || isTokenExpired()) {
      return
    }

    setAuthCookie(expiresAt)

    const hydratedUser: AuthUser | null = storedUserInfo?.id
      ? {
          id: storedUserInfo.id,
          email: storedUserInfo.email,
          name: storedUserInfo.name,
          preferredUsername: storedUserInfo.preferredUsername,
          groups: storedUserInfo.groups ?? [],
        }
      : null

    dispatch(
      hydrate({
        user: hydratedUser ?? null,
        expiresAt,
      })
    )
  }, [dispatch])

  return null
}

export default AuthInitializer
