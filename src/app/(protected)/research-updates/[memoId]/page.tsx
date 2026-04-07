import { LazyMemoView } from '@/lib/lazy-container'

interface MemoViewPageProps {
  params: Promise<{ memoId: string }>
  searchParams: Promise<{ mode?: 'edit' | 'view' }>
}

export default async function MemoViewPage({ params, searchParams }: MemoViewPageProps) {
  const { memoId } = await params
  const { mode } = await searchParams
  return <LazyMemoView memoId={memoId} mode={mode || 'view'} />
}
