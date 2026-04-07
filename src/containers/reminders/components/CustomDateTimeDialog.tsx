import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getTodayDateString, getCurrentTimeString, isDateTimeInPast } from '../lib/helper'

interface CustomDateTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  date: string
  time: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function CustomDateTimeDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  date,
  time,
  onDateChange,
  onTimeChange,
  onSubmit,
  onCancel,
}: CustomDateTimeDialogProps) {
  const isInPast = isDateTimeInPast(date, time)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="custom-datetime-date" className="w-10 shrink-0 text-right text-sm">
              Date
            </Label>
            <Input
              id="custom-datetime-date"
              type="date"
              className="flex-1"
              min={getTodayDateString()}
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="custom-datetime-time" className="w-10 shrink-0 text-right text-sm">
              Time
            </Label>
            <Input
              id="custom-datetime-time"
              type="time"
              className="flex-1"
              min={date === getTodayDateString() ? getCurrentTimeString() : undefined}
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
            />
          </div>
          <p className={`text-xs ${isInPast ? 'text-destructive' : 'invisible'}`}>
            Notification date must be in the future.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={!date || !time || isInPast} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
