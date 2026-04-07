import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import { SidebarProviderClient } from './SidebarProviderClient'

interface AppShellProps {
  children: React.ReactNode
  title?: string
}

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <SidebarProviderClient>
      <div className="app-root">
        <AppSidebar />
        <div className="app-main">
          <AppHeader title={title} />
          <main className="app-content">{children}</main>
        </div>
      </div>
    </SidebarProviderClient>
  )
}
