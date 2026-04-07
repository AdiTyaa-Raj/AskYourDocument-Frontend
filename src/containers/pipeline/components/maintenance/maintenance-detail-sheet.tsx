'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Calendar, Check } from 'lucide-react'

import { FloatingSideSheetContent } from '@/components/shared/FloatingSideSheet'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RotateCcw, Trash } from 'lucide-react'

import {
  formatDueDate,
  formatMaintenanceStatusLabel,
  getMaintenanceStatusClass,
  normaliseMaintenanceStatus,
} from '@/containers/pipeline/lib/maintenance-helpers'
import type {
  MaintenanceStatus,
  MaintenanceTask,
} from '@/containers/pipeline/lib/maintenance-types'
import { cn } from '@/lib/utils'

interface MaintenanceDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: MaintenanceTask | null
  contextTab?: 'active' | 'completed' | 'deleted'
  onUpdate: (
    id: MaintenanceTask['id'],
    payload: {
      title?: string
      action?: string
      due_date?: string | null
      important?: boolean
      status?: MaintenanceStatus
      company_id?: string | number
    },
    options?: { silent?: boolean }
  ) => Promise<void> | void
  onStatusChange: (
    id: MaintenanceTask['id'],
    status: MaintenanceStatus,
    showToast?: boolean
  ) => Promise<void> | void
  isWatchable?: boolean
  isWatching?: boolean
  onToggleWatch?: (id: MaintenanceTask['id'], next: boolean) => void
  onDelete?: (id: MaintenanceTask['id']) => void
  onRestore?: (id: MaintenanceTask['id']) => void
}

const toInputDate = (value?: string | null) => {
  if (!value) return ''
  if (!value.includes('T')) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().split('T')[0]
}

export function MaintenanceDetailSheet({
  open,
  onOpenChange,
  task,
  onUpdate,
  onStatusChange,
  isWatchable = false,
  isWatching,
  onToggleWatch,
  onDelete,
  contextTab = 'active',
  onRestore,
}: MaintenanceDetailSheetProps) {
  const [draftTitle, setDraftTitle] = useState('')
  const [draftAction, setDraftAction] = useState('')
  const [draftDueDate, setDraftDueDate] = useState('')
  const [draftStatus, setDraftStatus] = useState<MaintenanceStatus>('TODO')
  const [draftImportant, setDraftImportant] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [isWatchingState, setIsWatchingState] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [closeReason, setCloseReason] = useState<'save' | 'cancel' | null>(null)
  const [watchChanged, setWatchChanged] = useState(false)
  const initialWatchRef = useRef(false)

  useEffect(() => {
    if (!task) return
    setDraftTitle(task.title ?? '')
    setDraftAction(task.action ?? '')
    setDraftDueDate(toInputDate(task.due_date))
    setDraftStatus(normaliseMaintenanceStatus(task.status))
    setDraftImportant(Boolean(task.important))
    setEditingDueDate(false)
    setHasChanges(false)
    setIsWatchingState(Boolean(isWatching))
    setWatchChanged(false)
    setCloseReason(null)
    initialWatchRef.current = Boolean(task.watching)
  }, [isWatching, task])

  const createdAtLabel = useMemo(() => {
    if (!task?.created_at) return '—'
    const parsed = new Date(task.created_at)
    if (Number.isNaN(parsed.getTime())) return task.created_at
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [task?.created_at])

  if (!task) return null

  const isCompletedView = contextTab === 'completed'
  const isDeletedView = contextTab === 'deleted'
  const isReadOnly = isCompletedView || isDeletedView
  const today = new Date().toISOString().split('T')[0]

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      const reason = closeReason ?? 'cancel'
      if (reason !== 'save' && watchChanged && onToggleWatch) {
        const targetWatchState = initialWatchRef.current
        if (targetWatchState !== isWatchingState) {
          setIsWatchingState(targetWatchState)
          onToggleWatch(task.id, targetWatchState)
        }
      }
      setCloseReason(null)
    }
    onOpenChange(nextOpen)
  }

  const renderStatusOptions = () =>
    (['TODO', 'INPROGRESS', 'DONE'] as MaintenanceStatus[]).map((status) => (
      <SelectItem key={status} value={status} className="text-xs">
        {formatMaintenanceStatusLabel(status)}
      </SelectItem>
    ))

  const handleDraftStatusChange = (value: MaintenanceStatus) => {
    if (isReadOnly) return
    setDraftStatus(value)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (isReadOnly) return
    if (!hasChanges) return
    await onUpdate(task.id, {
      title: draftTitle.trim() || undefined,
      action: draftAction.trim() || undefined,
      due_date: draftDueDate || null,
      important: draftImportant,
      company_id: task.company_id,
      status: draftStatus,
    })
    setHasChanges(false)
    setCloseReason('save')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <FloatingSideSheetContent side="right" className="flex w-[500px] flex-col p-0">
        <SheetTitle className="sr-only">Maintenance task details</SheetTitle>
        <SheetDescription className="sr-only">
          View and edit maintenance task details for {task.ticker}.
        </SheetDescription>

        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">{task.ticker} &gt; Maintenance</p>
            <div className="flex items-center gap-2">
              {task.stageLabel ? (
                <Badge variant="secondary" className="bg-gray-100 text-[10px] text-gray-800">
                  {task.stageLabel}
                </Badge>
              ) : null}
            </div>
          </div>

          {isWatchable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'gap-1.5 text-xs text-gray-600 hover:bg-transparent hover:text-gray-900',
                isWatchingState && 'text-blue-700'
              )}
              onClick={() => {
                const next = !isWatchingState
                setIsWatchingState(next)
                setWatchChanged(next !== initialWatchRef.current)
                if (onToggleWatch) onToggleWatch(task.id, next)
              }}
            >
              <Bell className={cn('h-4 w-4', isWatchingState && 'text-blue-700')} />
              {isWatchingState ? 'Watching' : 'Watch'}
            </Button>
          ) : null}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">
              Title <span className="text-red-600">*</span>
            </Label>
            <Input
              disabled={isReadOnly}
              value={draftTitle}
              onChange={(event) => {
                setDraftTitle(event.target.value)
                setHasChanges(true)
              }}
              maxLength={1000}
              className="h-11 border-gray-200 text-base font-medium text-gray-900 focus-visible:ring-1 focus-visible:ring-gray-300"
              placeholder="Add a title"
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
              <span className="text-gray-500">Assignees</span>
              <div className="flex flex-col gap-2">
                {task.assignees.map((assignee, index) => {
                  const displayName = assignee.name || assignee.email || '-'
                  return (
                    <div
                      key={assignee.id ?? `${displayName}-${index}`}
                      className="flex items-center gap-2"
                      title={displayName}
                    >
                      <InitialsAvatar
                        name={displayName}
                        className="h-6 w-6"
                        textClassName="text-[10px] text-white"
                      />
                      <span className="text-gray-900">{displayName}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
              <span className="text-gray-500">
                Due date <span className="text-red-600">*</span>
              </span>
              {isReadOnly ? (
                <div className="flex h-9 items-center gap-2 text-xs text-gray-900">
                  <Calendar className="h-3 w-3 text-gray-500" />
                  <span>{draftDueDate ? formatDueDate(draftDueDate) : 'No due date'}</span>
                </div>
              ) : (
                <div className="relative">
                  {editingDueDate ? (
                    <>
                      <Calendar className="text-muted-foreground absolute top-1/2 left-3 h-3 w-3 -translate-y-1/2" />
                      <Input
                        type="date"
                        autoFocus
                        value={draftDueDate}
                        min={today}
                        onChange={(event) => {
                          setDraftDueDate(event.target.value)
                          setHasChanges(true)
                        }}
                        onBlur={() => setEditingDueDate(false)}
                        className="h-9 pl-9 text-xs"
                      />
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingDueDate(true)}
                      className="flex h-9 items-center gap-2 text-xs text-gray-900 transition hover:text-gray-700"
                    >
                      <Calendar className="h-3 w-3 text-gray-500" />
                      <span>{draftDueDate ? formatDueDate(draftDueDate) : 'Add due date'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
              <span className="text-gray-500">
                Status <span className="text-red-600">*</span>
              </span>
              <Select
                disabled={isReadOnly}
                value={draftStatus}
                onValueChange={(value: MaintenanceStatus) => handleDraftStatusChange(value)}
              >
                <SelectTrigger
                  className={cn('h-9 w-[180px] text-xs', getMaintenanceStatusClass(draftStatus))}
                >
                  <SelectValue placeholder={formatMaintenanceStatusLabel(draftStatus)} />
                </SelectTrigger>
                <SelectContent>{renderStatusOptions()}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
              <span className="text-gray-500">
                Company <span className="text-red-600">*</span>
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <Badge variant="secondary" className="bg-gray-100 text-[10px] text-gray-800">
                  {task.ticker}
                </Badge>
                <span>{task.company_name ?? task.company ?? task.ticker}</span>
              </div>
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
              <span className="text-gray-500">High priority</span>
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  setDraftImportant((prev) => !prev)
                  setHasChanges(true)
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition',
                  draftImportant ? 'bg-red-50 text-red-700' : 'bg-transparent text-gray-900'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border',
                    draftImportant ? 'border-red-500 bg-red-500 text-white' : 'border-gray-300'
                  )}
                >
                  {draftImportant ? <Check className="h-3 w-3" /> : null}
                </span>
                <span>Mark as high priority</span>
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-600">
                Action item <span className="text-red-600">*</span>
              </Label>
              <Textarea
                disabled={isReadOnly}
                value={draftAction}
                onChange={(event) => {
                  setDraftAction(event.target.value)
                  setHasChanges(true)
                }}
                rows={4}
                className="text-xs"
                placeholder="Add action item details..."
              />
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-3 text-xs text-gray-600">
          Created by {task.created_by || '—'} • {createdAtLabel}
        </div>

        <div className="border-border flex items-center justify-end gap-3 border-t px-6 py-4">
          {contextTab === 'active' ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={isReadOnly || !hasChanges}
                onClick={handleSave}
              >
                Save Changes
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
                disabled={draftStatus === 'DONE' || isReadOnly}
                onClick={() => {
                  if (draftStatus === 'DONE' || isReadOnly) return
                  setDraftStatus('DONE')
                  setHasChanges(false)
                  onStatusChange(task.id, 'DONE')
                }}
              >
                Mark as Completed
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={() => {
                  if (onDelete) onDelete(task.id)
                  onOpenChange(false)
                }}
              >
                Delete
              </Button>
            </>
          ) : contextTab === 'completed' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                if (onDelete) onDelete(task.id)
                onOpenChange(false)
              }}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : onRestore ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => {
                onRestore(task.id)
                onOpenChange(false)
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </Button>
          ) : null}
        </div>
      </FloatingSideSheetContent>
    </Sheet>
  )
}

export default MaintenanceDetailSheet
