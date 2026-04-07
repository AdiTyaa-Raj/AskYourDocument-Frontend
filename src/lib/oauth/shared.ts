/**
 * Shared OAuth Utilities
 * Common functions used across all OAuth callback flows
 */

import notify from '@/lib/notifications'

/**
 * OAuth Callback Parameters
 */
export interface OAuthCallbackParams {
  code: string | null
  state?: string | null
  error?: string | null
  errorDescription?: string | null
  clientInfo?: string | null
}

/**
 * OAuth Callback Status
 */
export type OAuthCallbackStatus = 'processing' | 'success' | 'error'

/**
 * Extract OAuth callback parameters from URL search params
 */
export function extractOAuthParams(searchParams: URLSearchParams): OAuthCallbackParams {
  return {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
    error: searchParams.get('error'),
    errorDescription: searchParams.get('error_description'),
    clientInfo: searchParams.get('client_info'),
  }
}

/**
 * Validate OAuth callback parameters
 * Returns validation result with error message if invalid
 */
export function validateOAuthCallback(params: OAuthCallbackParams): {
  valid: boolean
  error?: string
} {
  // Check for OAuth provider error
  if (params.error) {
    return {
      valid: false,
      error: params.errorDescription || 'Authorization failed. Please try again.',
    }
  }

  // Check for missing authorization code
  if (!params.code) {
    return {
      valid: false,
      error: 'No authorization code received. Please try again.',
    }
  }

  return { valid: true }
}

/**
 * Show OAuth error notification
 */
export function notifyOAuthError(title: string, description?: string) {
  notify.error({
    title,
    description: description || 'Authorization failed. Please try again.',
  })
}

/**
 * Show OAuth success notification
 */
export function notifyOAuthSuccess(title: string, description?: string) {
  notify.success({
    title,
    description: description || 'Connected successfully',
  })
}

/**
 * Handle OAuth callback error
 * Logs error and shows notification
 */
export function handleOAuthError(
  context: string,
  error: unknown,
  title: string = 'Connection Failed'
): string {
  console.error(`❌ ${context}:`, error)

  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'

  notifyOAuthError(title, errorMessage)

  return errorMessage
}

/**
 * Redirect with delay (for success states)
 */
export function redirectAfterDelay(
  router: { push: (path: string) => void },
  path: string,
  delayMs: number = 2000
) {
  setTimeout(() => {
    router.push(path)
  }, delayMs)
}
