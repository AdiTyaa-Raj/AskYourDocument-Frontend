/**
 * Axios Configuration
 * Centralized HTTP client with interceptors for API calls
 */

import axios, { AxiosError, AxiosResponse } from 'axios'
import { clearAuthStorage, readAccessToken } from '@/lib/authStorage'
import notify from '@/lib/notifications'
import { env } from '@/config/env'

// Base API URL - sourced from env config
const API_BASE_URL = env.apiUrl

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for auth
})

// Request interceptor – attach Bearer token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = readAccessToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers['Authorization'] = `Bearer ${token}`
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data)
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// Response interceptor - Handle errors, logging, etc.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.url}`, response.data)
    }

    return response
  },
  async (error: AxiosError) => {
    function isLoginRequest(err: AxiosError): boolean {
      const url = err.config?.url ?? ''
      // BaseApiService calls use relative URLs like `/login`.
      return url === '/login' || url.endsWith('/login')
    }

    function isOnLoginPage(): boolean {
      if (typeof window === 'undefined') return false
      return window.location?.pathname === '/login'
    }

    // Handle specific error codes
    if (error.response) {
      const status = error.response.status

      switch (status) {
        case 401:
          // Don't redirect when the user is actively trying to log in (or already on /login),
          // otherwise the page refresh hides the real error message.
          if (isLoginRequest(error) || isOnLoginPage()) break

          // Unauthorized - redirect to login
          console.error('[API] Unauthorized')
          console.error('[API] Unauthorized - redirecting to login')
          clearAuthStorage()
          notify.error({ title: 'Session expired', description: 'Please sign in again' })
          redirectToLogin()
          break

        case 403:
          // Forbidden
          console.error('[API] Forbidden - insufficient permissions')
          notify.error({ title: 'Access denied', description: 'Insufficient permissions' })
          break

        case 404:
          console.error('[API] Resource not found')
          notify.error({ title: 'Not found', description: 'Resource not found' })
          break

        case 429:
          // Rate limit exceeded
          console.error('[API] Rate limit exceeded')
          const retryMessage = 'Please try again after 1 minute'
          notify.error({
            title: 'Rate limit exceeded',
            description: `Too many requests. ${retryMessage}`,
          })
          break

        case 500:
          console.error('[API] Server error')
          notify.error({ title: 'Server error', description: 'Please try again later' })
          break

        default:
          console.error(`[API] Error ${status}:`, error.response.data)
      }
    } else if (error.request) {
      // Request made but no response
      console.error('[API] No response received:', error.message)
    } else {
      // Something else happened
      console.error('[API] Request setup error:', error.message)
    }

    return Promise.reject(error)
  }
)

function isTestLikeEnvironment() {
  if (typeof window === 'undefined') return false
  return Boolean(window.navigator?.userAgent?.toLowerCase().includes('jsdom'))
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  if (isTestLikeEnvironment()) {
    console.warn('[API] Redirect suppressed in test environment')
    return
  }
  window.location.href = '/login'
}

export default apiClient
