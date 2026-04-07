/**
 * Environment Configuration
 * Type-safe access to environment variables
 */

export const env = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',

  // App Configuration
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Feature Flags
  enableChat: process.env.NEXT_PUBLIC_ENABLE_CHAT === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  clarityId: process.env.NEXT_PUBLIC_CLARITY_ID || '',

  // Development
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const

// Validate required environment variables
export function validateEnv() {
  const required = ['NEXT_PUBLIC_API_URL']

  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`Warning: Missing required environment variable: ${key}`)
    }
  }
}
