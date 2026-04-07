'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import type { MaintenanceTaskFormProps } from '@/containers/documents/lib/types'
import { MAINTENANCE_TASK_STATUS_OPTIONS } from '@/containers/memos/lib/constants'
import notify from '@/lib/notifications'

export function MaintenanceTaskForm({
  companyTicker,
  maintenanceTask,
  analysts,
  onTaskChange,
  onCancel,
  onSubmit,
  isSubmitting = false,
  isViewOnly = false,
  showCard = true,
  showButtons = true,
  showCompanyInfo = true,
}: MaintenanceTaskFormProps) {
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const assigneeAnchorRef = useRef<HTMLDivElement>(null)

  // Filter assignees based on search
  const filteredAssignees = useMemo(() => {
    if (!assigneeSearch.trim()) return analysts
    const query = assigneeSearch.toLowerCase()
    return analysts.filter((assignee) => assignee.name.toLowerCase().includes(query))
  }, [assigneeSearch, analysts])

  // Toggle assignee selection
  const handleToggleAssignee = useCallback(
    (assigneeId: string) => {
      if (isViewOnly) return
      const current = maintenanceTask.assignees
      const isSelected = current.includes(assigneeId)

      if (isSelected) {
        onTaskChange(
          'assignees',
          current.filter((id) => id !== assigneeId)
        )
      } else {
        if (current.length >= 2) {
          notify.warning({
            title: 'Maximum Assignees Reached',
            description: 'Maintenance tasks require exactly 2 assignees (Rule of Two).',
          })
          return
        }
        onTaskChange('assignees', [...current, assigneeId])
      }
    },
    [maintenanceTask.assignees, onTaskChange, isViewOnly]
  )

  const selectedAssigneeNames = useMemo(() => {
    return maintenanceTask.assignees
      .map((id) => analysts.find((a) => a.id === id)?.name)
      .filter(Boolean)
  }, [maintenanceTask.assignees, analysts])

  // Validate form
  const isFormValid = useMemo(() => {
    return maintenanceTask.dueDate.trim() !== '' && maintenanceTask.assignees.length === 2
  }, [maintenanceTask.dueDate, maintenanceTask.assignees.length])

  const formFields = (
    <div className="space-y-3">
      {/* Linked Company */}
      {showCompanyInfo && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Linked to:{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {companyTicker || '[Select Company]'}
          </span>
        </div>
      )}

      {/* Due Date Field */}
      <div>
        <Label className="mb-1 block text-xs text-gray-700 dark:text-gray-300">
          Due Date <span className="text-red-500">*</span>
        </Label>
        <Input
          type="date"
          value={maintenanceTask.dueDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => onTaskChange('dueDate', e.target.value)}
          className="h-9 text-xs"
          disabled={isViewOnly}
          placeholder="dd/mm/yyyy"
        />
      </div>

      {/* Title Field */}
      <div>
        <Label className="mb-1 block text-xs text-gray-700 dark:text-gray-300">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          value={maintenanceTask.title}
          onChange={(e) => onTaskChange('title', e.target.value)}
          placeholder="Enter task title..."
          className="h-9 text-xs placeholder:text-gray-400"
          disabled={isViewOnly}
        />
      </div>

      {/* Action Field */}
      <div>
        <Label className="mb-1 block text-xs text-gray-700 dark:text-gray-300">
          Action <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          value={maintenanceTask.action}
          onChange={(e) => onTaskChange('action', e.target.value)}
          placeholder="Enter action required..."
          className="h-9 text-xs placeholder:text-gray-400"
          disabled={isViewOnly}
        />
      </div>

      {/* Assignees Field */}
      <div>
        <Label className="mb-1 block text-xs text-gray-700 dark:text-gray-300">
          Assignees (Required: 2) <span className="text-red-500">*</span>{' '}
          {maintenanceTask.assignees.length < 2 && (
            <span className="text-xs text-red-500">
              {maintenanceTask.assignees.length}/2 selected
            </span>
          )}
        </Label>

        {/* Selected Assignees */}
        {maintenanceTask.assignees.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedAssigneeNames.map((name, index) => (
              <Badge
                key={maintenanceTask.assignees[index]}
                variant="secondary"
                className="gap-1 py-1 text-xs"
              >
                {name}
                {!isViewOnly && (
                  <button
                    type="button"
                    className="ring-offset-background focus-visible:ring-ring ml-0.5 inline-flex cursor-pointer rounded p-0 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-1"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleAssignee(maintenanceTask.assignees[index])
                    }}
                    aria-label={`Remove ${name}`}
                  >
                    <X className="pointer-events-none size-3" aria-hidden />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Assignee Search/Select */}
        {!isViewOnly && (
          <Popover open={showAssigneeDropdown} onOpenChange={setShowAssigneeDropdown}>
            <PopoverAnchor asChild>
              <div ref={assigneeAnchorRef} className="relative">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  onFocus={() => setShowAssigneeDropdown(true)}
                  placeholder="Search assignees..."
                  className="h-9 pl-8 text-xs placeholder:text-gray-400"
                />
              </div>
            </PopoverAnchor>
            <PopoverContent
              className="w-[300px] p-0"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="max-h-[200px] overflow-y-auto">
                {filteredAssignees.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">No assignees found</div>
                ) : (
                  filteredAssignees.map((assignee) => {
                    const isSelected = maintenanceTask.assignees.includes(assignee.id)
                    return (
                      <div
                        key={assignee.id}
                        className={`cursor-pointer border-b px-3 py-2 text-xs transition-colors last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => handleToggleAssignee(assignee.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{assignee.name}</span>
                          {isSelected && <Checkbox checked={true} className="size-4" />}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Status Dropdown */}
      <div>
        <Label className="mb-1 block text-xs text-gray-700 dark:text-gray-300">Status</Label>
        <Select
          value={maintenanceTask.status}
          onValueChange={(value) => onTaskChange('status', value)}
          disabled={isViewOnly}
        >
          <SelectTrigger className="h-9 w-full bg-gray-50 text-xs dark:bg-gray-800">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {MAINTENANCE_TASK_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value} className="text-xs">
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* High Importance Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="high-importance"
          checked={maintenanceTask.important}
          onCheckedChange={(checked) => onTaskChange('important', checked === true)}
          disabled={isViewOnly}
          className="size-4"
        />
        <Label
          htmlFor="high-importance"
          className="cursor-pointer text-xs text-gray-700 dark:text-gray-300"
        >
          High Importance
        </Label>
      </div>
    </div>
  )

  const content = (
    <>
      {showCard && (
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Create Maintenance Task
          </h3>
        </div>
      )}
      {formFields}
      {showButtons && onCancel && onSubmit && (
        <div className="flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!isFormValid || isSubmitting}
            className="flex-1 bg-black text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      )}
    </>
  )

  if (showCard) {
    return (
      <Card className="border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <CardContent className="space-y-4 p-4">{content}</CardContent>
      </Card>
    )
  }

  return <div>{content}</div>
}
