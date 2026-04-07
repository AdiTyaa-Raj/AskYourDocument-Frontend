'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface AnalystReassignmentWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  warnings: string[]
  isConfirming?: boolean
}

export function AnalystReassignmentWarningModal({
  isOpen,
  onClose,
  onConfirm,
  warnings,
  isConfirming = false,
}: AnalystReassignmentWarningModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isConfirming) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!isConfirming}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0 text-amber-500" aria-hidden />
            Confirm Analyst Reassignment
          </DialogTitle>
          <DialogDescription>
            Please review the following before confirming the reassignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
              <p className="leading-relaxed">{warning}</p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {isConfirming ? 'Confirming...' : 'Confirm Reassignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
