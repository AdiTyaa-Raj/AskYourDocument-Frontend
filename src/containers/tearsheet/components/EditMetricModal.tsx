'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { EditMetricModalProps } from '../lib/type'
import { getFieldTitle, VALIDATION_CONSTANTS } from '../lib/constants'

export function EditMetricModal({
  showModal,
  onClose,
  editField,
  editValue,
  editReason,
  onValueChange,
  onReasonChange,
  onSave,
}: EditMetricModalProps) {
  const hasDollarPrefix = editField === 'iv' || editField === 'downside' || editField === 'target'
  const hasPercentSuffix = editField === 'irr'
  const hasMultiplierSuffix = editField === 'moc' || editField === 'riskReward'

  return (
    <Dialog open={showModal} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit {getFieldTitle(editField)}</DialogTitle>
          <DialogDescription>
            Update the metric and provide a reason for the change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">New Value</label>
            <div className="relative">
              {hasDollarPrefix && (
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">$</span>
              )}
              <Input
                type="number"
                step="0.01"
                className={hasDollarPrefix ? 'pl-7' : ''}
                value={editValue}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder="0.00"
              />
              {hasPercentSuffix && (
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">%</span>
              )}
              {hasMultiplierSuffix && (
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">x</span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Reason <span className="text-red-600">*</span>
            </label>
            <Textarea
              value={editReason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={`Explain the reason for this change (minimum ${VALIDATION_CONSTANTS.MIN_REASON_LENGTH} characters)...`}
              className="min-h-24"
            />
            <p className="text-xs text-gray-500">
              {editReason.length}/{VALIDATION_CONSTANTS.MIN_REASON_LENGTH} chars
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={editReason.length < VALIDATION_CONSTANTS.MIN_REASON_LENGTH}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
