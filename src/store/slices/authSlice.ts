'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type AuthUser = {
  id: string
  email?: string
  name?: string
  preferredUsername?: string
  groups: string[]
}

export interface AuthState {
  expiresAt: number | null
  user: AuthUser | null
}

const initialState: AuthState = {
  expiresAt: null,
  user: null,
}

function decodeJwt(token: string) {
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload))
    return decoded as Record<string, unknown>
  } catch (error) {
    console.warn('Failed to decode JWT', error)
    return {}
  }
}

export function parseTokenPayload(token: string): {
  user: AuthUser | null
  expiresAt: number | null
} {
  const payload = decodeJwt(token)
  const id = typeof payload.sub === 'string' ? payload.sub : undefined
  if (!id) {
    return { user: null, expiresAt: null }
  }

  const groups = Array.isArray(payload.groups)
    ? (payload.groups.filter((item): item is string => typeof item === 'string') as string[])
    : []

  const expires =
    typeof payload.exp === 'number'
      ? payload.exp * 1000
      : typeof payload.exp === 'string'
        ? Number(payload.exp) * 1000
        : null

  return {
    user: {
      id,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      preferredUsername:
        typeof payload.preferred_username === 'string' ? payload.preferred_username : undefined,
      groups,
    },
    expiresAt: expires,
  }
}

type CredentialsPayload = {
  accessToken: string
}

type HydratePayload = {
  expiresAt: number | null
  user: AuthUser | null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<CredentialsPayload>) {
      const { accessToken } = action.payload
      const { user, expiresAt } = parseTokenPayload(accessToken)
      state.user = user
      state.expiresAt = expiresAt
    },
    hydrate(state, action: PayloadAction<HydratePayload>) {
      state.expiresAt = action.payload.expiresAt
      state.user = action.payload.user
    },
    clear(state) {
      state.expiresAt = null
      state.user = null
    },
  },
})

export const { setCredentials, hydrate, clear } = authSlice.actions
export const authReducer = authSlice.reducer
