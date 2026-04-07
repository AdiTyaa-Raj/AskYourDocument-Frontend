import { BaseApiService } from './base'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://dev-webserver.arnie.shyftops.io/api/v1'

export interface AuthTokensResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  user_info?: Record<string, unknown>
}

class AuthService extends BaseApiService {
  getLoginUrl(callbackUrl?: string) {
    const params = new URLSearchParams()
    if (callbackUrl) {
      params.set('callback_url', callbackUrl)
    }
    const query = params.toString()
    return query ? `${API_BASE_URL}/auth/login?${query}` : `${API_BASE_URL}/auth/login`
  }

  getLogoutUrl() {
    return `${API_BASE_URL}/auth/logout`
  }

  async exchangeAuthCode(queryString: string): Promise<AuthTokensResponse> {
    const endpoint = `${API_BASE_URL}/auth/callback?${queryString}`
    const response = await fetch(endpoint, { credentials: 'include' })
    if (!response.ok) {
      throw new Error(`Callback failed with status ${response.status}`)
    }
    return response.json()
  }

  async setPassword(password: string) {
    return this.post(`/auth/set-password`, { password })
  }
}

export const authService = new AuthService()
