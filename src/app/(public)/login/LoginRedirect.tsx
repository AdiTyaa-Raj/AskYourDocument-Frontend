'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { readAccessToken, isTokenExpired } from '@/lib/authStorage'
import { authService } from '@/services/api/auth.service'
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAppDispatch } from '@/store'
import { setCredentials } from '@/store/slices/authSlice'

function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) return null
  // Only allow internal paths to avoid open redirects.
  if (!nextPath.startsWith('/')) return null
  if (nextPath.startsWith('//')) return null
  return nextPath
}

export function LoginRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // If already authenticated, redirect to the main app
  useEffect(() => {
    const token = readAccessToken()
    if (token && !isTokenExpired()) {
      router.replace('/documents')
    } else {
      setCheckingAuth(false)
    }
  }, [router])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const loginResponse = await authService.login(identifier.trim(), password)
      dispatch(setCredentials({ accessToken: loginResponse.access_token }))

      const nextPath = getSafeNextPath(searchParams.get('next'))
      router.replace(nextPath ?? '/documents')
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          ? (err as { response: { data: { detail: string } } }).response.data.detail
          : err instanceof Error
            ? err.message
            : 'Login failed. Please check your credentials.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Branding */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5]">
            <Sparkles className="size-7 text-white" />
          </div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your credentials to access AskYourDoc
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Email / Username */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-foreground block text-sm font-medium">
              Email
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username email"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-foreground block text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !identifier.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginRedirect
