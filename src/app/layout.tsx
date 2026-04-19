import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { StoreProvider } from '@/store/StoreProvider'
import { AuthInitializer } from '@/components/providers/AuthInitializer'
import { MicrosoftClarityProvider } from '@/components/providers/MicrosoftClarityProvider'
import { AppQueryClientProvider } from '@/components/providers/QueryClientProvider'
import './globals.css'
import '@/styles/layout.scss'
import { Toaster } from 'sonner'

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ask Your Document',
  description: 'Ask Your Document — document Q&A and research workflows.',
  creator: 'askyourdocument',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans`}>
        <StoreProvider>
          <AppQueryClientProvider>
            <ThemeProvider
              attribute="class"
              forcedTheme="light"
              enableSystem={false}
              disableTransitionOnChange
              storageKey="ayd-theme"
            >
              <MicrosoftClarityProvider />
              <AuthInitializer />
              {children}
              <Toaster
                position="top-right"
                expand={false}
                richColors
                closeButton
                toastOptions={{
                  classNames: {
                    toast: 'rounded-xl shadow-lg border',
                    title: 'text-sm font-semibold',
                    description: 'text-xs',
                    actionButton: 'bg-primary text-primary-foreground',
                    cancelButton: 'bg-muted text-muted-foreground',
                    closeButton: 'bg-white border-gray-200 text-gray-900 hover:bg-gray-100',
                  },
                }}
              />
            </ThemeProvider>
          </AppQueryClientProvider>
        </StoreProvider>
      </body>
    </html>
  )
}
