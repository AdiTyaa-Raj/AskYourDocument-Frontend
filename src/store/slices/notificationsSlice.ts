/**
 * Notifications Slice - Manages notification state
 * Stores unread notification count
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface NotificationsState {
  unreadCount: number
}

const initialState: NotificationsState = {
  unreadCount: 0,
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1
    },
    decrementUnreadCount: (state) => {
      state.unreadCount = Math.max(0, state.unreadCount - 1)
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0
    },
  },
})

export const { setUnreadCount, incrementUnreadCount, decrementUnreadCount, resetUnreadCount } =
  notificationsSlice.actions
export default notificationsSlice.reducer
