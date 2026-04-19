import { AppHeaderContainer } from '@/containers/layout/AppHeaderContainer'

interface AppHeaderProps {
  title?: string
}

// Wrapper component that delegates to the container
export const AppHeader = ({ title = 'Documents' }: AppHeaderProps) => {
  return <AppHeaderContainer title={title} />
}

export default AppHeader
