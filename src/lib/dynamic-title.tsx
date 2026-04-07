'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import AppShell from '@/components/layout/AppShell'

interface DynamicAppShellProps {
  children: ReactNode
}

// Route title mapping configuration
const ROUTE_TITLES: Record<string, string | ((pathname: string) => string)> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/pipeline': 'Pipeline > Investment Pipeline',
  '/coverage': 'Coverage > Holdings, Watch List & Universe',
  '/documents': (pathname) =>
    pathname === '/documents' ? 'Documents' : 'Documents > Document Details',
  '/memos': 'Memo Submission > Create New Note',
  '/tearsheet': (pathname) => (pathname === '/tearsheet' ? 'Tearsheet' : 'Tearsheet'),
  '/approvals': 'Approvals',
  '/reminders': 'Reminders',
  '/notifications': 'Notifications',
  '/ai-chat': 'AI Chat',
  '/all-chats': 'All Chats',
  '/research-updates': (pathname) => {
    // Main page: show breadcrumb "Research Update > Create New Note"
    if (pathname === '/research-updates') {
      return 'Research Update > Create New Note'
    }
    // Template pages: show breadcrumb "Research Update > Create New Note"
    if (pathname.startsWith('/research-updates/template/')) {
      return 'Research Update > Create New Note'
    }
    // Other sub-routes (like /research-updates/[memoId]): just show "Research Updates"
    return 'Research Updates'
  },
  '/portfolio': 'Portfolio',
  '/settings': 'Settings',
  '/login': 'Authentication',
  '/signup': 'Authentication',
}

// Hook to get dynamic title based on current route
export function useDynamicTitle(): string {
  const pathname = usePathname()

  return useMemo(() => {
    // Check for exact match first
    if (ROUTE_TITLES[pathname]) {
      const title = ROUTE_TITLES[pathname]
      return typeof title === 'function' ? title(pathname) : title
    }

    // Check for prefix match - sort routes by length (longest first) to match most specific routes first
    const sortedRoutes = Object.entries(ROUTE_TITLES).sort(([a], [b]) => b.length - a.length)

    for (const [route, title] of sortedRoutes) {
      if (pathname.startsWith(route) && route !== '/') {
        return typeof title === 'function' ? title(pathname) : title
      }
    }

    // Default fallback
    return 'Dashboard'
  }, [pathname])
}

// Dynamic AppShell wrapper that automatically sets title based on route
export function DynamicAppShell({ children }: DynamicAppShellProps) {
  const title = useDynamicTitle()

  return <AppShell title={title}>{children}</AppShell>
}
