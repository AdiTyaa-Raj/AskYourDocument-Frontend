'use client'

function base64UrlDecode(input: string): string {
  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=')

  if (typeof atob === 'function') {
    return atob(padded)
  }

  // Vitest / Node fallback
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf-8')
  }

  throw new Error('No base64 decoder available in this environment.')
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return {}

    const payloadJson = base64UrlDecode(parts[1] ?? '')
    return JSON.parse(payloadJson) as Record<string, unknown>
  } catch (error) {
    console.warn('Failed to decode JWT payload', error)
    return {}
  }
}
