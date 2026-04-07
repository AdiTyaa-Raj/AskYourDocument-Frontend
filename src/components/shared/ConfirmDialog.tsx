'use client'

import { useCallback } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { ReactNode } from 'react'

export type ConfirmDialogVariant = 'default' | 'destructive' | 'secondary' | 'outline' | 'ghost'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  confirmLoadingLabel?: string
  cancelLabel?: string
  confirmVariant?: ConfirmDialogVariant
  isConfirming?: boolean
  onConfirm: () => void
  onCancel?: () => void
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmLoadingLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  isConfirming = false,
  onConfirm,
  onCancel,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !isConfirming) {
        onCancel?.()
      }
      onOpenChange?.(nextOpen)
    },
    [isConfirming, onCancel, onOpenChange]
  )

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {typeof description === 'string' ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : (
            description
          )}
        </AlertDialogHeader>
        {children ? <div className="text-muted-foreground text-sm">{children}</div> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConfirming}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!isConfirming) {
                onConfirm()
              }
            }}
            disabled={isConfirming}
            className={cn(
              buttonVariants({ variant: confirmVariant }),
              isConfirming && 'pointer-events-none opacity-80'
            )}
          >
            {isConfirming ? (confirmLoadingLabel ?? `${confirmLabel}…`) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ConfirmDialog
