import { LazyDocumentDetail } from '@/lib/lazy-container'

interface DocumentPageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params
  return <LazyDocumentDetail documentId={id} />
}
