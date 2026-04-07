/**
 * Lazy Container Wrapper
 *
 * Automatically lazy loads heavy containers with consistent loading UI
 * Usage: Just import from this file instead of using dynamic() everywhere
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

const DEFAULT_LOADING = (
  <div className="flex h-96 items-center justify-center">
    <div className="text-muted-foreground text-sm">Loading...</div>
  </div>
)

/**
 * Create a lazy-loaded container with custom loading message
 */
export function createLazyContainer<P = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  loadingMessage?: string
) {
  return dynamic(
    () =>
      importFn().then((mod) => {
        // Handle both { default: Component } and Component exports
        if ('default' in mod) {
          return { default: mod.default }
        }
        return { default: mod as ComponentType<P> }
      }),
    {
      loading: () =>
        loadingMessage ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-muted-foreground text-sm">{loadingMessage}</div>
          </div>
        ) : (
          DEFAULT_LOADING
        ),
    }
  )
}

/**
 * Pre-configured lazy containers for common routes
 * Import these directly in your page.tsx files
 */

export const LazyPipeline = createLazyContainer(
  () => import('@/containers/pipeline/PipelineContainer').then((m) => m.PipelineContainer),
  'Loading pipeline...'
)

export const LazyDocuments = createLazyContainer(
  () => import('@/containers/documents/DocumentsContainer').then((m) => m.DocumentsContainer),
  'Loading documents...'
)

export const LazyDocumentDetail = createLazyContainer(
  () =>
    import('@/containers/documents/DocumentDetailContainer').then((m) => m.DocumentDetailContainer),
  'Loading document...'
)

export const LazyTearsheet = createLazyContainer(
  () => import('@/containers/tearsheet/TearsheetContainer').then((m) => m.TearsheetContainer),
  'Loading tearsheet...'
)

export const LazyMemos = createLazyContainer(
  () =>
    import('@/containers/memos/NewMemoSubmissionContainer').then(
      (m) => m.NewMemoSubmissionContainer
    ),
  'Loading memo editor...'
)

// Re-use the same lazy container for template and view pages (same component)
export const LazyMemoTemplate = LazyMemos
export const LazyMemoView = LazyMemos

export const LazyCoverage = createLazyContainer(
  () => import('@/containers/coverage/CoverageContainer').then((m) => m.CoverageContainer),
  'Loading coverage...'
)

export const LazyAIChat = createLazyContainer(
  () => import('@/containers/ai-chat/AIChatContainer').then((m) => m.AIChatContainer),
  'Loading AI chat...'
)

export const LazyNotifications = createLazyContainer(
  () =>
    import('@/containers/notifications/NotificationsContainer').then(
      (m) => m.NotificationsContainer
    ),
  'Loading notifications...'
)

export const LazyApprovals = createLazyContainer(
  () => import('@/containers/approvals/ApprovalsContainer'),
  'Loading approvals...'
)

export const LazyReminders = createLazyContainer(
  () => import('@/containers/reminders/RemindersContainer').then((m) => m.RemindersContainer),
  'Loading reminders...'
)

/**
 * HOW TO USE:
 *
 * Before (manual dynamic import in each page):
 * ```tsx
 * const PipelineContainer = dynamic(() => import('...'), { loading: ... })
 * export default function Page() {
 *   return <PipelineContainer />
 * }
 * ```
 *
 * After (just import from this file):
 * ```tsx
 * import { LazyPipeline } from '@/lib/lazy-container'
 *
 * export default function Page() {
 *   return <LazyPipeline />
 * }
 * ```
 *
 * For new containers:
 * ```tsx
 * import { createLazyContainer } from '@/lib/lazy-container'
 *
 * const LazyNewFeature = createLazyContainer(
 *   () => import('@/containers/new-feature/Container'),
 *   'Loading feature...'
 * )
 * ```
 */
