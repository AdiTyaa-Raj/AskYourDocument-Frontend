'use client'

import { Button } from '@/components/ui/button'
import type { BulkActionBarProps } from '../lib/types'

export function BulkActionBar({ count, onApproveAll, onRejectAll, disabled }: BulkActionBarProps) {
  if (count === 0) return null

  return (
    <div className="bg-foreground text-background fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-lg px-6 py-3 shadow-lg">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {count} item{count > 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-background text-foreground"
            disabled={disabled}
            onClick={onApproveAll}
          >
            Approve All
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-background text-foreground"
            disabled={disabled}
            onClick={onRejectAll}
          >
            Reject All
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BulkActionBar
