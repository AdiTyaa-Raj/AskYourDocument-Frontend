'use client'

/**
 * Redux Store Provider
 * Wraps the app to provide Redux state
 */

import { useRef } from 'react'
import { Provider } from 'react-redux'
import { store } from './index'

interface StoreProviderProps {
  children: React.ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  const storeRef = useRef(store)

  return <Provider store={storeRef.current}>{children}</Provider>
}
