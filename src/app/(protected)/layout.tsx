import { Suspense } from 'react'
import { DynamicAppShell } from '@/lib/dynamic-title'
import { PageLoadingFallback } from '@/components/shared/LoadingFallbacks'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <DynamicAppShell>
      <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>
    </DynamicAppShell>
  )
}
