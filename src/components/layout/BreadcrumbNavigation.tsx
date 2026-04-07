'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface BreadcrumbNavigationProps {
  title: string
}

export function BreadcrumbNavigation({ title }: BreadcrumbNavigationProps) {
  const router = useRouter()

  // Parse the title string to extract breadcrumb parts
  const breadcrumbParts = title.split(' > ').map((part) => part.trim())

  // Handle single-level titles (like "Dashboard", "Settings")
  if (breadcrumbParts.length === 1) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-foreground text-base font-semibold">
              {breadcrumbParts[0]}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  // Handle multi-level breadcrumbs
  const handleNavigation = (segment: string) => {
    // Map breadcrumb segments to their routes
    const routeMap: Record<string, string> = {
      Dashboard: '/dashboard',
      Pipeline: '/pipeline',
      Coverage: '/coverage',
      Documents: '/documents',
      'Memo Submission': '/memos',
      Tearsheet: '/tearsheet',
      Approvals: '/approvals',
      'AI Chat': '/ai-chat',
      'Research Updates': '/research-updates',
      'Research Update': '/research-updates',
      Settings: '/settings',
    }

    const route = routeMap[segment]
    if (route) {
      router.push(route)
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbParts.map((part, index) => {
          const isLast = index === breadcrumbParts.length - 1

          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-foreground text-base font-semibold">
                    {part}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => handleNavigation(part)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer text-base font-medium transition-colors"
                  >
                    {part}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
