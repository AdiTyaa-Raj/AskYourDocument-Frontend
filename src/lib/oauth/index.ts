/**
 * OAuth Library Barrel Export
 * Centralized OAuth utilities and types
 */

export {
  extractOAuthParams,
  validateOAuthCallback,
  handleOAuthError,
  notifyOAuthError,
  notifyOAuthSuccess,
  redirectAfterDelay,
  type OAuthCallbackParams,
  type OAuthCallbackStatus,
} from './shared'
