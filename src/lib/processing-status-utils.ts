/**
 * Processing Status Utilities
 * Shared utilities for handling processing statuses across documents and memos
 */

/**
 * Processing status type - shared across documents and memos
 */
export type ProcessingStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

/**
 * Determines if reprocess should be shown based on processing statuses
 * Show reprocess if any of the statuses are not COMPLETED
 *
 * @param statuses - Object containing processing status fields
 * @returns true if reprocess should be shown, false otherwise
 */
export function shouldShowReprocess(statuses: {
  chunking_status?: ProcessingStatus | string
  embedding_status?: ProcessingStatus | string
  analysis_status?: ProcessingStatus | string
}): boolean {
  const chunkingStatus = statuses.chunking_status?.toUpperCase()
  const embeddingStatus = statuses.embedding_status?.toUpperCase()
  const analysisStatus = statuses.analysis_status?.toUpperCase()

  // If all are completed, don't show reprocess
  if (
    chunkingStatus === 'COMPLETED' &&
    embeddingStatus === 'COMPLETED' &&
    analysisStatus === 'COMPLETED'
  ) {
    return false
  }

  // Show reprocess if any status is PENDING, IN_PROGRESS, or FAILED
  return (
    chunkingStatus === 'PENDING' ||
    chunkingStatus === 'IN_PROGRESS' ||
    chunkingStatus === 'FAILED' ||
    embeddingStatus === 'PENDING' ||
    embeddingStatus === 'IN_PROGRESS' ||
    embeddingStatus === 'FAILED' ||
    analysisStatus === 'PENDING' ||
    analysisStatus === 'IN_PROGRESS' ||
    analysisStatus === 'FAILED'
  )
}

/**
 * Aggregate multiple processing statuses into a single overall status
 * Used for displaying status icons in tables
 *
 * @param statuses - Array of processing statuses
 * @returns Aggregated status: 'completed' | 'pending' | 'in-progress' | 'failed'
 */
export function aggregateProcessingStatuses(
  statuses: (ProcessingStatus | string | undefined)[]
): 'completed' | 'pending' | 'in-progress' | 'failed' {
  // Filter out undefined values
  const validStatuses = statuses.filter(Boolean) as string[]

  // If any status is FAILED, overall is failed
  if (validStatuses.some((status) => status.toUpperCase() === 'FAILED')) {
    return 'failed'
  }

  // If all statuses are COMPLETED, overall is completed
  if (validStatuses.every((status) => status.toUpperCase() === 'COMPLETED')) {
    return 'completed'
  }

  // If all statuses are PENDING, overall is pending
  if (validStatuses.every((status) => status.toUpperCase() === 'PENDING')) {
    return 'pending'
  }

  // Otherwise, overall is in-progress
  return 'in-progress'
}
