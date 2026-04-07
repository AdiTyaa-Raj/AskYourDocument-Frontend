import { User, Clock, MoreVertical, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import type { Priority, NotificationItemProps } from '../lib/types'
import {
  getIconComponent,
  getIconBackgroundColor,
  getPriorityBadgeVariant,
  getPriorityBadgeClasses,
} from '../lib/types'
import { getNotificationDropdownItems } from '../lib/utils'
import { computeSnoozeUTC } from '@/services/api/reminders.services'

const getPriorityLabel = (priority: Priority) => {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

export default function NotificationItem({
  notification,
  isSelected,
  isSelectionMode,
  onSelect,
  onClick,
  onMarkAsRead,
  onMarkAsUnread,
  onRemindMe,
  onCustomRemind,
}: NotificationItemProps) {
  const IconComponent = getIconComponent(notification.icon)
  const iconBgColor = getIconBackgroundColor(notification.icon)
  const dropdownItems = getNotificationDropdownItems(notification, {
    onMarkAsRead,
    onMarkAsUnread,
  })

  const handleClick = () => {
    onClick?.(notification)
  }

  return (
    <div
      onClick={handleClick}
      className={`group hover:bg-muted/20 'bg-blue-50/30' flex cursor-pointer items-start gap-3 px-6 py-3 transition-colors ${isSelectionMode && isSelected ? 'bg-blue-50' : ''}`}
    >
      {/* Checkbox - Only visible in selection mode */}
      {isSelectionMode && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-in fade-in slide-in-from-left-2 pt-0.5 duration-200"
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(notification.id)}
            className="border-border/60 size-4 rounded-[4px]"
          />
        </div>
      )}

      {/* Icon */}
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${iconBgColor}`}
      >
        <IconComponent className="size-3.5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm leading-tight font-medium">{notification.title}</h3>
            {!notification.isRead && <div className="size-1.5 shrink-0 rounded-full bg-blue-500" />}
          </div>
        </div>

        <p className="text-muted-foreground text-sm leading-snug">{notification.description}</p>

        {/* Meta information */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          {notification.user && (
            <div className="flex items-center gap-1.5">
              <User className="size-3" />
              <span className="flex items-center gap-1">{notification.user}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Clock className="size-3" />
            <span>{notification.timestamp}</span>
          </div>

          <Badge
            variant={getPriorityBadgeVariant(notification.priority)}
            className={`h-4 px-1.5 text-[11px] font-medium ${getPriorityBadgeClasses(notification.priority)}`}
          >
            {getPriorityLabel(notification.priority)}
          </Badge>
        </div>
      </div>

      {/* Actions Dropdown - Only visible when NOT in selection mode */}
      {!isSelectionMode && (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground size-8 shrink-0"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {dropdownItems.map((item) => {
                const Icon = item.icon
                return (
                  <DropdownMenuItem key={item.id} className={item.className} onClick={item.onClick}>
                    <Icon className="mr-2 size-4" />
                    <span>{item.name}</span>
                  </DropdownMenuItem>
                )
              })}
              {onRemindMe && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">
                      <Bell className="mr-2 size-3.5" />
                      Remind Me
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => onRemindMe(notification.id, computeSnoozeUTC('30_min'))}
                      >
                        <Clock className="mr-2 size-3.5" />
                        In 30 Minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => onRemindMe(notification.id, computeSnoozeUTC('1_hour'))}
                      >
                        <Clock className="mr-2 size-3.5" />
                        In 1 Hour
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() =>
                          onRemindMe(notification.id, computeSnoozeUTC('tomorrow_9am'))
                        }
                      >
                        <Clock className="mr-2 size-3.5" />
                        Tomorrow at 9 AM
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() =>
                          onRemindMe(notification.id, computeSnoozeUTC('next_week_9am'))
                        }
                      >
                        <Clock className="mr-2 size-3.5" />
                        Next Week at 9 AM
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => onCustomRemind?.(notification.id)}
                      >
                        <Clock className="mr-2 size-3.5" />
                        Custom…
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
