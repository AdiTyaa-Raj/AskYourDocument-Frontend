import { LazyMemoTemplate } from '@/lib/lazy-container'

interface MemoTemplatePageProps {
  params: Promise<{ templateId: string }>
}

export default async function MemoTemplatePage({ params }: MemoTemplatePageProps) {
  const { templateId } = await params
  return <LazyMemoTemplate templateId={templateId} />
}
