/**
 * App Slice - Global app state
 * Placeholder slice until feature-specific slices are added
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  initialized: boolean
  sidebarOpen: boolean
}

const initialState: AppState = {
  initialized: true,
  sidebarOpen: true,
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
  },
})

export const { toggleSidebar, setSidebarOpen } = appSlice.actions
export default appSlice.reducer
