import { BaseApiService } from './base'
import {
  storeAccessToken,
  storeAuthTokens,
  storeUserInfo,
  clearAuthStorage,
} from '@/lib/authStorage'
import { decodeJwtPayload } from '@/lib/jwt'

const DEFAULT_SESSION_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

// ──────────────────────────────────────────
// Response types matching backend /login
// ──────────────────────────────────────────

export interface LoginRequest {
  identifier: string // email or username
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  role: string
  email: string
  name: string
}

export interface AuthTokensResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  user_info?: Record<string, unknown>
}

// ──────────────────────────────────────────
// Current-user response (GET /users/me)
// ──────────────────────────────────────────

export interface CurrentUserResponse {
  id: number
  email: string
  full_name: string
  is_active: boolean
  tenant_id: number | null
  tenant_name: string | null
  role: string
}

class AuthService extends BaseApiService {
  /**
   * Log in with email + password.
   * Stores the returned JWT in localStorage so axios can inject it as a Bearer token.
   *
   * Backend: POST /login
   * Body: { identifier, password }
   * Response: { access_token, token_type, role, email, name }
   */
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const data = await this.post<LoginResponse, LoginRequest>('/login', { identifier, password })

    // Persist token
    storeAccessToken(data.access_token)

    // Prefer JWT exp if available; otherwise fall back to a fixed session duration.
    const payload = decodeJwtPayload(data.access_token)
    const expMs =
      typeof payload.exp === 'number'
        ? payload.exp * 1000
        : typeof payload.exp === 'string'
          ? Number(payload.exp) * 1000
          : null
    storeAuthTokens(expMs && Number.isFinite(expMs) ? expMs : Date.now() + DEFAULT_SESSION_MS)

    // Store normalized user info for fast client-side hydration.
    // Backend response includes email/name/role; token may include id/groups/preferred_username.
    storeUserInfo({
      id: typeof payload.sub === 'string' ? payload.sub : undefined,
      email: data.email,
      name: data.name,
      role: data.role,
      preferredUsername:
        typeof payload.preferred_username === 'string' ? payload.preferred_username : undefined,
      groups: Array.isArray(payload.groups)
        ? payload.groups.filter((g): g is string => typeof g === 'string')
        : [],
    })

    return data
  }

  /**
   * Get the currently authenticated user's profile.
   * Backend: GET /users/me
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    return this.get<CurrentUserResponse>('/users/me')
  }

  /**
   * Clear stored auth tokens (logout).
   */
  logout() {
    clearAuthStorage()
  }

  // ──────────────────────────────────────────
  // Legacy OAuth helpers kept for compatibility
  // (these endpoints do not exist in this backend)
  // ──────────────────────────────────────────

  /** @deprecated Not used with direct-login backend */
  getLoginUrl(callbackUrl?: string) {
    void callbackUrl
    return '/login'
  }

  /** @deprecated Not used with direct-login backend */
  getLogoutUrl() {
    return '/login'
  }

  /** @deprecated Not used with direct-login backend */
  async exchangeAuthCode(_queryString: string): Promise<AuthTokensResponse> {
    throw new Error('OAuth auth-code exchange is not supported by this backend.')
  }

  /** @deprecated Not used with direct-login backend */
  async setPassword(password: string) {
    return this.post(`/auth/set-password`, { password })
  }
}

export const authService = new AuthService()
