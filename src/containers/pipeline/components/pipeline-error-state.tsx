'use client'

import { AppErrorState } from '@/components/shared/AppFeedbackState'
import type { PipelineErrorStateProps } from '../lib/types'

export function PipelineErrorState({
  onRetry,
  message = "We couldn't load the pipeline data.",
}: PipelineErrorStateProps) {
  return <AppErrorState message={message} onRetry={onRetry} />
}
