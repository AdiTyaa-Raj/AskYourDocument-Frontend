'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  BarChart2,
  PieChart,
  FolderOpen,
  FileEdit,
  CheckCircle,
  Sparkles,
  Settings,
  Bell,
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

type NavigationItem = {
  name: string
  href: string
  icon: LucideIcon
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Pipeline', href: '/pipeline', icon: BarChart2 },
  { name: 'CRM', href: '/coverage', icon: PieChart },
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'Research Update', href: '/research-updates', icon: FileEdit },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle },
  { name: 'Reminders', href: '/reminders', icon: Bell },
  { name: 'AI Chat', href: '/ai-chat', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export const AppSidebar = memo(function AppSidebar() {
  const pathname = usePathname()
  const { open, setOpen } = useSidebar()

  return (
    <aside className="app-sidebar">
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-sidebar-border border-b px-4 py-4">
          {open ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-foreground text-background flex size-8 items-center justify-center rounded-lg text-sm font-bold">
                  A
                </div>
                <span className="text-base font-semibold">Arnie</span>
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
              {NAVIGATION_ITEMS.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </aside>
  )
})

export default AppSidebar
