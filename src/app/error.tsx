'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="border-border/60 bg-card max-w-md space-y-4 rounded-xl border p-8 shadow-lg">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm font-semibold">Something went wrong</p>
          <h1 className="text-2xl font-bold">The page failed to load</h1>
          <p className="text-muted-foreground text-sm">
            {error?.message ?? 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
        {process.env.NODE_ENV !== 'production' && error?.digest ? (
          <p className="text-muted-foreground text-xs">Error reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  )
}
