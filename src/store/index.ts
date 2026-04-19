/**
 * Redux Store Configuration
 * Uses Redux Toolkit for simplified state management
 */

import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

// Import reducers
import appReducer from './slices/appSlice'
import { authReducer } from './slices/authSlice'
// import dashboardReducer from './slices/dashboardSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    // dashboard: dashboardReducer,
    // pipeline: pipelineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for non-serializable values
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export typed hooks for use throughout the app
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
