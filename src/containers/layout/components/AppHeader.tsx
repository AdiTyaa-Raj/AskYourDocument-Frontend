'use client'

import { memo } from 'react'
import { UserMenu } from '@/components/layout/UserMenu'
import { BreadcrumbNavigation } from '@/components/layout/BreadcrumbNavigation'

interface AppHeaderProps {
  title?: string
  user: {
    name: string
    email: string
  }
}

// Pure presentation component for the app header
export const AppHeader = memo(function AppHeader({ title = 'Documents', user }: AppHeaderProps) {
  return (
    <header className="app-header">
      {/* Page Title */}
      <div className="flex-shrink-0">
        <BreadcrumbNavigation title={title} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - User */}
      <div className="flex flex-shrink-0 items-center gap-4">
        <UserMenu user={user} />
      </div>
    </header>
  )
})

export default AppHeader
