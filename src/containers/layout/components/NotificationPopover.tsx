'use client'

import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Notifications are not integrated with this backend yet.
 * Keep the component so layout imports can be re-enabled later without churn.
 */
export function NotificationPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Notifications</div>
          <div className="text-muted-foreground text-xs">Not available in this backend.</div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationPopover
