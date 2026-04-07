'use client'

/**
 * Auth Storage Utilities
 *
 * Uses localStorage for persistent auth across browser sessions.
 * Tokens are validated based on expiry time, not browser close.
 */

const EXPIRES_AT_KEY = 'rms_token_expires_at'
const USER_INFO_KEY = 'rms_user_info'
const AUTH_COOKIE_NAME = 'ayd_auth'

type UserInfo = {
  id?: string
  email?: string
  name?: string
  preferredUsername?: string
  groups?: string[]
}

function hasWindow() {
  return typeof window !== 'undefined'
}

export function storeAuthTokens(expiresAt: number) {
  // Tokens are now stored in HttpOnly cookies by the backend; only persist expiry for UX.
  if (!hasWindow()) return
  window.localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString())
  setAuthCookie(expiresAt)
}

export function storeUserInfo(info: UserInfo) {
  if (!hasWindow()) return
  window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
}

export function readTokenExpiry(): number | null {
  if (!hasWindow()) return null
  const value = window.localStorage.getItem(EXPIRES_AT_KEY)
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function readStoredUserInfo(): UserInfo | null {
  if (!hasWindow()) return null
  const value = window.localStorage.getItem(USER_INFO_KEY)
  if (!value) return null

  try {
    return JSON.parse(value) as UserInfo
  } catch {
    return null
  }
}

export function clearAuthStorage() {
  if (!hasWindow()) return
  window.localStorage.removeItem(EXPIRES_AT_KEY)
  window.localStorage.removeItem(USER_INFO_KEY)
  clearAuthCookie()
}

/**
 * Check if token is expired based on stored expiry time
 * Returns true if expired or no expiry time found
 */
export function isTokenExpired(): boolean {
  const expiresAt = readTokenExpiry()
  if (!expiresAt) return true
  return Date.now() >= expiresAt
}

export function setAuthCookie(expiresAt?: number) {
  if (!hasWindow()) return
  const expiry = expiresAt && Number.isFinite(expiresAt) ? new Date(expiresAt) : undefined
  const parts = [`${AUTH_COOKIE_NAME}=1`, 'path=/', 'SameSite=Lax']
  if (expiry) {
    parts.push(`expires=${expiry.toUTCString()}`)
  }
  document.cookie = parts.join('; ')
}

export function clearAuthCookie() {
  if (!hasWindow()) return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}
