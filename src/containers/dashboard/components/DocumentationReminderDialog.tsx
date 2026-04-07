import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Copy } from 'lucide-react'
import type { DocumentationAlert } from '../lib/types'

type DocumentationReminderDialogProps = {
  alert: DocumentationAlert | null
  message: string
  copied: boolean
  onCopy: () => Promise<void>
  onClose: () => void
}

export function DocumentationReminderDialog({
  alert,
  message,
  copied,
  onCopy,
  onClose,
}: DocumentationReminderDialogProps) {
  const open = Boolean(alert)

  return (
    <Dialog open={open} onOpenChange={(state) => !state && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Documentation Reminder</DialogTitle>
          <DialogDescription className="text-xs">
            Copy this template into Slack, email, or SMS.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="border-border/70 bg-muted/30 rounded border border-dashed p-3">
            <pre className="text-foreground font-sans text-xs leading-relaxed whitespace-pre-wrap">
              {message}
            </pre>
          </div>
          <Button
            onClick={() => {
              void onCopy()
            }}
            className="w-full"
            variant={copied ? 'outline' : 'default'}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Message
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
