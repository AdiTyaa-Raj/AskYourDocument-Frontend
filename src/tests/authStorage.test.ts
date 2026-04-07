import { describe, expect, it, beforeEach } from 'vitest'
import {
  storeAuthTokens,
  readTokenExpiry,
  clearAuthStorage,
  storeUserInfo,
  readStoredUserInfo,
} from '@/lib/authStorage'

// Ensure localStorage has all Storage methods (jsdom can have incomplete impl)
function ensureLocalStorage() {
  const storage: Record<string, string> = {}
  const mock = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
    clear: () => {
      Object.keys(storage).forEach((k) => delete storage[k])
    },
    get length() {
      return Object.keys(storage).length
    },
    key: (i: number) => Object.keys(storage)[i] ?? null,
  }
  Object.defineProperty(window, 'localStorage', { value: mock, writable: true })
}

describe('authStorage helpers', () => {
  const expiresAt = Date.now() + 1000

  beforeEach(() => {
    ensureLocalStorage()
    clearAuthStorage()
    window.localStorage.clear()
  })

  it('stores and reads token expiry correctly', () => {
    storeAuthTokens(expiresAt)

    expect(readTokenExpiry()).toBe(expiresAt)
  })

  it('stores and reads user profile information', () => {
    storeUserInfo({
      id: '99',
      email: 'user@example.com',
      name: 'User Example',
      preferredUsername: 'user',
      groups: ['GROUP'],
    })

    expect(readStoredUserInfo()).toMatchObject({
      id: '99',
      email: 'user@example.com',
      name: 'User Example',
      preferredUsername: 'user',
      groups: ['GROUP'],
    })
  })

  it('clearAuthStorage removes persisted values', () => {
    storeAuthTokens(expiresAt)
    storeUserInfo({ id: '1', groups: [] })

    clearAuthStorage()

    expect(readTokenExpiry()).toBeNull()
    expect(readStoredUserInfo()).toBeNull()
  })
})
