'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ApprovalActionDialogProps } from '../lib/types'

export function ApprovalActionDialog({
  open,
  actionType,
  comment,
  onCommentChange,
  onOpenChange,
  onConfirm,
  isSubmitting,
  titleOverride,
  descriptionOverride,
  helperTextOverride,
  confirmLabelOverride,
}: ApprovalActionDialogProps) {
  const isApprove = actionType === 'approve'
  const title = titleOverride ?? (isApprove ? 'Approve Request' : 'Reject Stage Transition')
  const description =
    descriptionOverride ??
    (isApprove
      ? 'Approving this request will notify the requester and advance the workflow.'
      : 'Provide feedback for rejection of this stage transition request. Rejecting this request will return it to the requester with your comments.')
  const helperText =
    helperTextOverride ??
    (isApprove ? 'Comment (optional, max 150 chars)' : 'Comment (required, max 150 chars)')
  const confirmLabel = confirmLabelOverride ?? (isApprove ? 'Approve' : 'Reject')
  const confirmDisabled = isSubmitting || (!isApprove && comment.trim().length === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="break-words">{title}</DialogTitle>
          <DialogDescription className="break-words">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <div className="space-y-2">
            <label className="text-foreground text-sm font-medium">{helperText}</label>
            <Textarea
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              maxLength={150}
              placeholder="Add a comment..."
              className="max-h-[120px] min-h-[120px] resize-none overflow-y-auto"
              rows={5}
            />
            <p className="text-muted-foreground text-right text-xs">{comment.length}/150</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {isSubmitting ? 'Submitting...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ApprovalActionDialog
