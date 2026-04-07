'use client'

import { ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'

type FeedbackVariant = 'error' | 'not-found' | 'empty'

const VARIANT_ICON: Record<FeedbackVariant, ReactNode> = {
  error: <AlertTriangle className="h-6 w-6" />,
  'not-found': <SearchX className="h-6 w-6" />,
  empty: <SearchX className="h-6 w-6" />,
}

interface FeedbackStateProps {
  variant: FeedbackVariant
  title: string
  description: string
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  children?: ReactNode
}

export function AppFeedbackState({
  variant,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: FeedbackStateProps) {
  return (
    <div className="bg-background text-foreground border-border/60 flex min-h-[320px] w-full flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
      <div className="bg-primary/10 text-primary mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full">
        {VARIANT_ICON[variant]}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {primaryAction ? (
          <Button onClick={primaryAction.onClick} className="flex items-center gap-2">
            {primaryAction.icon}
            {primaryAction.label}
          </Button>
        ) : null}
        {secondaryAction ? (
          <Button
            variant="outline"
            onClick={secondaryAction.onClick}
            className="flex items-center gap-2"
          >
            {secondaryAction.icon}
            {secondaryAction.label}
          </Button>
        ) : null}
      </div>
      {children ? <div className="mt-8 w-full max-w-lg text-left text-sm">{children}</div> : null}
    </div>
  )
}

export function AppErrorState({
  message = 'We ran into an unexpected issue.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <AppFeedbackState
      variant="error"
      title="Something went wrong"
      description={message}
      primaryAction={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
              icon: <RefreshCw className="h-4 w-4" />,
            }
          : undefined
      }
      secondaryAction={{
        label: 'Go home',
        onClick: () => {
          window.location.href = '/'
        },
        icon: <Home className="h-4 w-4" />,
      }}
    />
  )
}

export function AppNotFoundState({
  message = 'The page you are looking for could not be found or may have been moved.',
  onNavigateHome,
}: {
  message?: string
  onNavigateHome?: () => void
}) {
  return (
    <AppFeedbackState
      variant="not-found"
      title="Page not found"
      description={message}
      primaryAction={{
        label: 'Go home',
        onClick: onNavigateHome ?? (() => (window.location.href = '/')),
        icon: <Home className="h-4 w-4" />,
      }}
    />
  )
}
