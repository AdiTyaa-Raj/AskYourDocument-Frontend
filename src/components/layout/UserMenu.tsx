'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppDispatch } from '@/store'
import { clear } from '@/store/slices/authSlice'
import { authService } from '@/services/api/auth.service'
import { clearAuthStorage } from '@/lib/authStorage'

export interface UserMenuUser {
  name: string
  email: string
}

function getInitials(name: string) {
  const trimmed = name?.trim()
  if (!trimmed) return '??'
  return trimmed
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

interface UserMenuProps {
  user: UserMenuUser
}

export const UserMenu = memo(function UserMenu({ user }: UserMenuProps) {
  const dispatch = useAppDispatch()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = useCallback(() => {
    clearAuthStorage()
    dispatch(clear())

    // Redirect to backend logout URL
    window.location.href = authService.getLogoutUrl()
  }, [dispatch])

  const displayName = mounted ? user.name : 'Loading…'
  const displayEmail = mounted ? user.email || '—' : 'Loading…'
  const initials = mounted ? getInitials(user.name) : '??'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-accent/40 focus-visible:bg-accent/40 bg-muted/60 relative h-10 w-10 rounded-full"
          aria-label="Open user menu"
        >
          <Avatar className="border-border h-10 w-10 border bg-transparent">
            <AvatarFallback className="bg-foreground text-background text-sm font-semibold uppercase">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="border-border bg-popover min-w-60 overflow-hidden rounded-lg border p-0 shadow-lg"
      >
        <DropdownMenuLabel className="border-border flex flex-col gap-1 border-b px-3.5 py-3">
          <span className="text-foreground text-sm font-semibold">{displayName}</span>
          <span className="text-muted-foreground text-xs">{displayEmail}</span>
        </DropdownMenuLabel>
        <div className="px-1 pt-0 pb-1">
          <DropdownMenuItem
            variant="destructive"
            className="text-sm font-medium"
            onSelect={() => {
              void handleLogout()
            }}
          >
            Logout
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
