'use client'

import { Building2, Home, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { AppFeedbackState } from './AppFeedbackState'

interface CompanyNotFoundProps {
  companyId?: string
  onRetry?: () => void
  customMessage?: string
  showSearchButton?: boolean
}

export function CompanyNotFound({
  companyId,
  onRetry,
  customMessage,
  showSearchButton: _showSearchButton = false,
}: CompanyNotFoundProps) {
  const router = useRouter()

  const handleNavigateHome = () => {
    router.push('/documents')
  }

  const title = companyId ? `Company "${companyId}" Not Found` : 'Company Not Found'
  const description =
    customMessage ||
    'The company you are looking for does not exist in our system or the data is currently unavailable. This could be due to the company not being in our coverage universe or a temporary data issue.'

  return (
    <AppFeedbackState
      variant="not-found"
      title={title}
      description={description}
      primaryAction={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
              icon: <RefreshCw className="h-4 w-4" />,
            }
          : {
              label: 'Go to Documents',
              onClick: handleNavigateHome,
              icon: <Home className="h-4 w-4" />,
            }
      }
      secondaryAction={
        onRetry
          ? {
              label: 'Go to Documents',
              onClick: handleNavigateHome,
              icon: <Home className="h-4 w-4" />,
            }
          : undefined
      }
    >
      {companyId && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4" />
            Company ID: <span className="text-foreground font-mono">{companyId}</span>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            If you believe this company should be available, please contact your system
            administrator or try refreshing the page.
          </p>
        </div>
      )}
    </AppFeedbackState>
  )
}
