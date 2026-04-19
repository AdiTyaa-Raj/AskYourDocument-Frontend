import { describe, expect, it } from 'vitest'

import { middleware } from '../../middleware'

function makeReq(pathname: string, cookieValue?: string) {
  const url = new URL(`http://localhost:3000${pathname}`)
  ;(url as unknown as { clone: () => URL }).clone = () => new URL(url.toString())

  return {
    nextUrl: url,
    cookies: {
      get: (name: string) => {
        if (name !== 'ayd_auth') return undefined
        return cookieValue === undefined ? undefined : { value: cookieValue }
      },
    },
  }
}

describe('middleware auth redirect', () => {
  it('redirects unauthenticated users to /login and disables middleware caching', () => {
    const res = middleware(makeReq('/documents') as any)

    expect(res.headers.get('location')).toContain('/login')
    expect(res.headers.get('location')).toContain('next=%2Fdocuments')
    expect(res.headers.get('x-middleware-cache')).toBe('no-cache')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('allows authenticated users through', () => {
    const res = middleware(makeReq('/documents', '1') as any)
    expect(res.headers.get('location')).toBeNull()
  })

  it('skips unprotected paths', () => {
    const res = middleware(makeReq('/login') as any)
    expect(res.headers.get('location')).toBeNull()
  })
})

