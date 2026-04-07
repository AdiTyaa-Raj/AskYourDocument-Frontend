'use client'

import { AlertCircle, CheckCircle, Clock, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getReminderIcon, getReminderIconClasses, formatReminderDate } from '../lib/helper'
import type { ReminderItem, ReminderItemProps } from '../lib/types'

export function ReminderItem({
  reminder,
  isCompleted,
  onComplete,
  onDismiss,
  onSnooze,
  onCustomSnooze,
  onNavigate,
  isLoading,
}: ReminderItemProps) {
  const Icon = getReminderIcon(reminder.entityType)
  const iconClasses = getReminderIconClasses(reminder.entityType, isCompleted)
  const overdue = reminder.isOverdue && !isCompleted

  const handleTitleClick = () => {
    if (!isCompleted && reminder.actionUrl && onNavigate) {
      onNavigate(reminder.actionUrl)
    }
  }

  return (
    <div
      className={[
        'rounded-sm border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300',
        overdue ? 'border-l-4 border-l-red-500' : '',
        isCompleted ? 'opacity-70' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded ${iconClasses}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {/* Left: title + message + badge */}
            <div className="min-w-0 flex-1">
              <div
                className={`text-xs font-medium text-gray-900 ${
                  !isCompleted && reminder.actionUrl ? 'cursor-pointer hover:text-blue-600' : ''
                } ${isCompleted ? 'line-through' : ''}`}
                onClick={handleTitleClick}
              >
                {reminder.title}
              </div>
              <div className="mt-0.5 line-clamp-2 text-xs text-gray-600">{reminder.message}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="h-4 text-[10px] capitalize">
                  {reminder.entityType}
                </Badge>
              </div>
            </div>

            {/* Right: time info + actions */}
            <div className="flex flex-shrink-0 flex-col items-end gap-2">
              {/* Time display */}
              <div className="text-right text-xs">
                {isCompleted ? (
                  <span className="text-gray-500">{formatReminderDate(reminder.completedAt)}</span>
                ) : (
                  <>
                    <div className="mb-0.5 text-gray-900">
                      {formatReminderDate(reminder.effectiveDueAt)}
                    </div>
                    <div
                      className={`flex items-center gap-1 ${
                        overdue ? 'font-medium text-red-600' : 'text-blue-600'
                      }`}
                    >
                      {overdue ? (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          <span>{reminder.timeDisplay}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>{reminder.timeDisplay}</span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              {isCompleted ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={isLoading}
                  onClick={() => onDismiss(reminder.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              ) : overdue ? (
                /* In-Progress (overdue): show inline Complete + Snooze + Cancel */
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={isLoading}
                    onClick={() => onComplete(reminder.id)}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Complete
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        disabled={isLoading}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Snooze
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => onSnooze(reminder.id, '30_min')}
                      >
                        30 Minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => onSnooze(reminder.id, '1_hour')}
                      >
                        1 Hour
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => onSnooze(reminder.id, 'tomorrow_9am')}
                      >
                        Tomorrow 9 AM
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => onSnooze(reminder.id, 'next_week_9am')}
                      >
                        Next Week 9 AM
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => onCustomSnooze(reminder.id)}
                      >
                        Custom...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={isLoading}
                    onClick={() => onDismiss(reminder.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                /* Upcoming: collapsed actions menu */
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isLoading}>
                      <span className="sr-only">Actions</span>
                      <span className="text-xs leading-none">•••</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem className="text-xs" onClick={() => onComplete(reminder.id)}>
                      <CheckCircle className="mr-2 h-3 w-3" />
                      Complete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-xs">
                        <Clock className="mr-2 h-3 w-3" />
                        Snooze
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-44">
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onSnooze(reminder.id, '30_min')}
                        >
                          30 Minutes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onSnooze(reminder.id, '1_hour')}
                        >
                          1 Hour
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onSnooze(reminder.id, 'tomorrow_9am')}
                        >
                          Tomorrow 9 AM
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onSnooze(reminder.id, 'next_week_9am')}
                        >
                          Next Week 9 AM
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onCustomSnooze(reminder.id)}
                        >
                          Custom...
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs text-red-600 focus:text-red-600"
                      onClick={() => onDismiss(reminder.id)}
                    >
                      <X className="mr-2 h-3 w-3" />
                      Cancel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
