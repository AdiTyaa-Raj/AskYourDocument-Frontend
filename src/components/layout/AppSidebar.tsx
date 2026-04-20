'use client'

import { memo, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FolderOpen,
  Sparkles,
  Users,
  Shield,
  Building2,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { readAccessToken } from '@/lib/authStorage'
import { decodeJwtPayload } from '@/lib/jwt'

type NavigationItem = {
  name: string
  href: string
  icon: LucideIcon
  requiresSuperAdmin?: boolean
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'AI Chat', href: '/ai-chat', icon: Sparkles },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Roles', href: '/roles', icon: Shield },
  { name: 'Tenants', href: '/tenants', icon: Building2, requiresSuperAdmin: true },
]

export const AppSidebar = memo(function AppSidebar() {
  const pathname = usePathname()
  const { open, setOpen } = useSidebar()

  // Keep initial server + client HTML in sync; compute auth-dependent UI after mount.
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    const token = readAccessToken()
    if (!token) return
    const payload = decodeJwtPayload(token)
    setIsSuperAdmin(payload.is_super_admin === true)
  }, [])

  return (
    <aside className="app-sidebar">
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-sidebar-border border-b px-4 py-4">
          {open ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-foreground text-background flex size-8 items-center justify-center rounded-lg text-sm font-bold">
                  AYD
                </div>
                <span className="text-base font-semibold">AskYourDocument</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="bg-muted hover:bg-muted/80 size-8 rounded-lg"
                onClick={() => setOpen(false)}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="bg-muted hover:bg-muted/80 size-8 rounded-lg"
                onClick={() => setOpen(true)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {NAVIGATION_ITEMS.filter((item) => !item.requiresSuperAdmin || isSuperAdmin).map(
                (item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.name}
                      isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    >
                      <Link href={item.href} prefetch>
                        <item.icon className="size-5" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </aside>
  )
})

export default AppSidebar
