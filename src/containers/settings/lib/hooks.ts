/**
 * Settings Hooks
 * Custom React hooks for settings management
 */

import { useState, useEffect } from 'react'
import type { CalendarConnectionStatus } from './types'

/**
 * Hook to manage calendar connection status from localStorage
 * Provides state and handlers for calendar connection
 */
export function useCalendarConnection() {
  const [connection, setConnection] = useState<CalendarConnectionStatus>({
    is_connected: false,
    status: 'disconnected',
  })

  useEffect(() => {
    // Load connection status from localStorage on mount
    const storedConnection = localStorage.getItem('calendar_connection')
    if (storedConnection) {
      try {
        const parsed = JSON.parse(storedConnection)
        setConnection(parsed)
      } catch (error) {
        console.error('Failed to parse stored connection:', error)
      }
    }
  }, [])

  const updateConnection = (newConnection: CalendarConnectionStatus) => {
    setConnection(newConnection)
    localStorage.setItem('calendar_connection', JSON.stringify(newConnection))
  }

  const clearConnection = () => {
    const disconnectedState: CalendarConnectionStatus = {
      is_connected: false,
      status: 'disconnected',
    }
    setConnection(disconnectedState)
    localStorage.removeItem('calendar_connection')
  }

  return {
    connection,
    updateConnection,
    clearConnection,
  }
}
