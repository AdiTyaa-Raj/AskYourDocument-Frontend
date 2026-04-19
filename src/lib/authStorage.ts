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
const ACCESS_TOKEN_KEY = 'ayd_access_token'

type UserInfo = {
  id?: string
  email?: string
  name?: string
  role?: string
  preferredUsername?: string
  groups?: string[]
}

function hasWindow() {
  return typeof window !== 'undefined'
}

export function storeAuthTokens(expiresAt: number) {
  if (!hasWindow()) return
  window.localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString())
  setAuthCookie(expiresAt)
}

/** Store the raw JWT access token returned from POST /login */
export function storeAccessToken(token: string) {
  if (!hasWindow()) return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

/** Read the stored JWT access token */
export function readAccessToken(): string | null {
  if (!hasWindow()) return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
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
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  clearAuthCookie()
}

/**
 * Check if token is expired based on stored expiry time.
 * Falls back to checking if an access token exists when no expiry is recorded.
 */
export function isTokenExpired(): boolean {
  const token = readAccessToken()
  if (!token) return true
  const expiresAt = readTokenExpiry()
  if (!expiresAt) return false // token exists but no expiry stored – treat as valid
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
