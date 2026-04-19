'use client'

import { memo, useMemo } from 'react'
import { useAppSelector } from '@/store'
import { AppHeader } from './components/AppHeader'
import { type UserMenuUser } from '@/components/layout/UserMenu'

interface AppHeaderContainerProps {
  title?: string
}

// Container component that handles business logic and state management
export const AppHeaderContainer = memo(function AppHeaderContainer({
  title = 'Documents',
}: AppHeaderContainerProps) {
  const authUser = useAppSelector((state) => state.auth?.user)

  const menuUser = useMemo<UserMenuUser>(() => {
    if (authUser) {
      return {
        name: authUser.name ?? authUser.preferredUsername ?? authUser.email ?? 'User',
        email: authUser.email ?? '',
      }
    }

    return {
      name: 'Guest',
      email: '',
    }
  }, [authUser])

  return <AppHeader title={title} user={menuUser} />
})

export default AppHeaderContainer
