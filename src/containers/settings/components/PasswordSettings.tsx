'use client'

import { useMemo, useState } from 'react'
import { LockKeyhole, ShieldCheck, Info, Eye, EyeOff } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { evaluatePassword } from '@/containers/settings/lib/helpers'
import type { PasswordEvaluation } from '@/containers/settings/lib/types'

interface PasswordSettingsProps {
  password: string
  confirmPassword: string
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  onSubmit: () => void
  isSubmitting?: boolean
  errorMessage?: string | null
}

export function PasswordSettings({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: PasswordSettingsProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const passwordEvaluation: PasswordEvaluation = evaluatePassword(password)
  const { minLength, hasInput, hasMinLength, meetsPolicy, requirements, label, score } =
    passwordEvaluation

  const passwordsMatch = password === confirmPassword
  const canSubmit = useMemo(
    () => meetsPolicy && passwordsMatch && !isSubmitting,
    [meetsPolicy, passwordsMatch, isSubmitting]
  )

  const helperClass = cn(
    'text-xs font-medium',
    !password ? 'text-muted-foreground' : hasMinLength ? 'text-emerald-700' : 'text-amber-700'
  )
  const matchClass = cn(
    'text-xs font-medium',
    !confirmPassword
      ? 'text-muted-foreground'
      : passwordsMatch
        ? 'text-emerald-700'
        : 'text-amber-700'
  )

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
          <LockKeyhole className="text-primary size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Account Security</h2>
          <p className="text-muted-foreground text-sm">Set or update your account password.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Enter a strong password"
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-3 flex items-center"
              onClick={() => setShowPassword((prev) => !prev)}
              onMouseDown={(event) => event.preventDefault()}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className={helperClass}>Minimum {minLength} characters</p>
          {hasInput ? (
            <ul className="space-y-1 text-xs">
              {requirements.map((req) => (
                <li
                  key={req.label}
                  className={cn(
                    req.ok ? 'text-emerald-700' : 'text-amber-700',
                    'flex items-center gap-2'
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                  {req.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => onConfirmChange(event.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-3 flex items-center"
              onClick={() => setShowConfirm((prev) => !prev)}
              onMouseDown={(event) => event.preventDefault()}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className={matchClass}>
            {passwordsMatch ? 'Passwords match' : 'Passwords must match'}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p className="text-destructive mt-3 text-sm">{errorMessage}</p>
      ) : (
        <div className="text-muted-foreground mt-4 flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="mt-[2px] size-4 text-emerald-600" />
            <span>Use a strong unique password.</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground font-semibold tracking-wide uppercase">
              Strength:
            </span>
            {hasInput ? (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-semibold',
                  score >= 4
                    ? 'bg-emerald-100 text-emerald-800'
                    : score === 3
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-destructive/10 text-destructive'
                )}
              >
                {label}
              </span>
            ) : (
              <span className="text-muted-foreground">Start typing to see strength.</span>
            )}
            <span className="text-muted-foreground">
              Minimum 8 characters; include uppercase, lowercase, number, and symbol.
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Info className="size-3.5" />
          <span>Updating password will require re-authentication on other devices.</span>
        </div>
        <Button onClick={onSubmit} disabled={!canSubmit} className="min-w-[200px]">
          {isSubmitting ? 'Saving…' : 'Set Password'}
        </Button>
      </div>
    </Card>
  )
}

export default PasswordSettings
