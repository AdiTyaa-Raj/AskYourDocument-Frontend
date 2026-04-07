/**
 * Authentication Callback Utilities
 * Handles OAuth callback processing and token management for user login
 */

import { storeAuthTokens, storeUserInfo, clearAuthStorage } from '@/lib/authStorage'
import { setCredentials, parseTokenPayload } from '@/store/slices/authSlice'
import notify from '@/lib/notifications'
import type { AppDispatch } from '@/store'
import { authService } from '@/services/api/auth.service'

interface AuthCallbackParams {
  code: string
  queryString: string
}

/**
 * Calculates token expiry timestamp
 */
function calculateTokenExpiry(expiresIn?: number): number {
  const expiresInMs = typeof expiresIn === 'number' ? expiresIn * 1000 : 30 * 60 * 1000
  return Date.now() + expiresInMs
}

/**
 * Stores authentication tokens in localStorage and Redux
 */
function storeTokens(dispatch: AppDispatch, accessToken: string, expiresAt: number) {
  // Store expiry sentinel for UX; tokens live in HttpOnly cookies
  storeAuthTokens(expiresAt)
  dispatch(setCredentials({ accessToken }))
}

/**
 * Parses and stores user information
 */
function storeUserInformation(accessToken: string, backendUserInfo?: Record<string, unknown>) {
  // Parse JWT and store user info
  const { user } = parseTokenPayload(accessToken)

  if (user) {
    storeUserInfo({
      id: user.id,
      email: user.email,
      name: user.name,
      preferredUsername: user.preferredUsername,
      groups: user.groups,
    })
  }

  // Store any additional fields from backend payload
  if (backendUserInfo) {
    storeUserInfo({
      ...(user || {}),
      ...backendUserInfo,
    })
  }

  return user
}

/**
 * Shows success notification after authentication
 */
function showSuccessNotification(userName?: string) {
  notify.success({
    title: 'Welcome back!',
    description: userName || 'Signed in successfully',
  })
}

/**
 * Handles authentication errors
 */
function handleAuthError(error: unknown) {
  console.error('Authentication callback failed', error)
  clearAuthStorage()
  notify.error({ title: 'Sign in failed', description: 'Please try again' })
}

/**
 * Main function to complete authentication flow
 * Fetches tokens, stores them, and updates Redux state
 */
export async function completeAuthentication(
  params: AuthCallbackParams,
  dispatch: AppDispatch
): Promise<void> {
  try {
    // Fetch tokens from backend
    const payload = await authService.exchangeAuthCode(params.queryString)

    // Calculate token expiry
    const expiresAt = calculateTokenExpiry(payload.expires_in)

    // Store tokens
    storeTokens(dispatch, payload.access_token, expiresAt)

    // Store user information
    const user = storeUserInformation(payload.access_token, payload.user_info)

    // Show success notification
    showSuccessNotification(user?.name)
  } catch (error) {
    handleAuthError(error)
    throw error
  }
}

/**
 * Returns the login URL for retry
 */
export function getLoginUrl(): string {
  return authService.getLoginUrl()
}
