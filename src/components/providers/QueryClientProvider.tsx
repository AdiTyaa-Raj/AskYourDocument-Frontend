'use client'

import { useState } from 'react'
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export interface AppQueryClientProviderProps {
  children: React.ReactNode
}

export function AppQueryClientProvider({ children }: AppQueryClientProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 15,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </TanstackQueryClientProvider>
  )
}

export default AppQueryClientProvider
