import { LazyTearsheet } from '@/lib/lazy-container'
import { AppErrorState } from '@/components/shared/AppFeedbackState'

interface TearsheetPageProps {
  params: Promise<{ companyId: string }>
}

export default async function TearsheetPage({ params }: TearsheetPageProps) {
  // Await the params
  const { companyId } = await params

  // Parse companyId from route parameter
  const parsedCompanyId = parseInt(companyId)

  // Validate companyId
  if (isNaN(parsedCompanyId) || parsedCompanyId <= 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AppErrorState message="Please provide a valid company ID in the URL (e.g., /tearsheet/1)" />
      </div>
    )
  }

  return <LazyTearsheet companyId={parsedCompanyId} />
}
