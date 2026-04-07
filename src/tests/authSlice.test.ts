import { describe, expect, it } from 'vitest'
import {
  authReducer,
  clear,
  hydrate,
  parseTokenPayload,
  setCredentials,
} from '@/store/slices/authSlice'

function createJwt(payload: Record<string, unknown>) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encode = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  // Signature can be anything because we never verify it during decode
  return `${encode(header)}.${encode(payload)}.signature`
}

describe('authSlice', () => {
  const basePayload = {
    iss: 'rms-backend',
    sub: '42',
    aud: 'rms-api',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    preferred_username: 'ada',
    groups: ['LEAD_INVESTOR'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  }

  it('parses JWT payloads into AuthUser data', () => {
    const token = createJwt(basePayload)
    const { user, expiresAt } = parseTokenPayload(token)

    expect(user).toMatchObject({
      id: '42',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      preferredUsername: 'ada',
      groups: ['LEAD_INVESTOR'],
    })
    expect(expiresAt).toBe(basePayload.exp * 1000)
  })

  it('setCredentials populates auth state from token payload', () => {
    const token = createJwt(basePayload)
    const initialState = authReducer(undefined, { type: '@@INIT' })

    const nextState = authReducer(initialState, setCredentials({ accessToken: token }))

    expect(nextState.user?.id).toBe('42')
    expect(nextState.expiresAt).toBe(basePayload.exp * 1000)
  })

  it('hydrate action replaces the current auth state', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' })
    const hydrated = authReducer(
      initialState,
      hydrate({
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          preferredUsername: 'test',
          groups: [],
        },
        expiresAt: 1234567890,
      })
    )

    expect(hydrated).toMatchObject({
      expiresAt: 1234567890,
    })
    expect(hydrated.user?.id).toBe('123')
  })

  it('clear action resets auth state', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' })
    const populated = authReducer(
      initialState,
      hydrate({
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'User',
          preferredUsername: 'user',
          groups: [],
        },
        expiresAt: 123,
      })
    )

    const cleared = authReducer(populated, clear())

    expect(cleared.user).toBeNull()
    expect(cleared.expiresAt).toBeNull()
  })
})
