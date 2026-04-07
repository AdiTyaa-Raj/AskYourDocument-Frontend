'use client'

import { SidebarProvider } from '@/components/ui/sidebar'

interface SidebarProviderClientProps {
  children: React.ReactNode
}

export function SidebarProviderClient({ children }: SidebarProviderClientProps) {
  return <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
}
