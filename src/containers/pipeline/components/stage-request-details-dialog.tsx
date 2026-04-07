import { ArrowRight, FileText, Link2 } from 'lucide-react'

import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { FloatingSideSheetContent } from '@/components/shared/FloatingSideSheet'
import InitialsAvatar from '@/components/shared/InitialsAvatar'
import type { PipelineCard } from '../lib/types'
import { formatStageName } from '../lib/helpers'
import { formatTickerWithExchange } from '@/lib/utils'

type StageRequestDetailsDialogProps = {
  open: boolean
  card: PipelineCard | null
  onClose: () => void
  targetStageName?: string
  onCancelRequest?: (card: PipelineCard) => void
  onEarlyTerminate?: (card: PipelineCard) => void
  canEarlyTerminate?: boolean
}

const EARLY_TERMINATION_SLUG = 'EARLY_TERMINATED'

export function StageRequestDetailsDialog({
  open,
  card,
  onClose,
  targetStageName,
  onCancelRequest,
  onEarlyTerminate,
  canEarlyTerminate = false,
}: StageRequestDetailsDialogProps) {
  if (!card || !card.currentApproval) return null

  const approval = card.currentApproval
  const isEarlyTermination = approval.toStage === EARLY_TERMINATION_SLUG
  const displayTargetStage = targetStageName ?? formatStageName({ slug: approval.toStage })
  const submittedDate = approval.submittedAt
    ? new Date(approval.submittedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

  const approverNames = approval.requiredRoles?.length ? approval.requiredRoles : undefined
  const payloadDocuments = extractAttachmentList(approval.payload)
  const requestedBy =
    approval.requestedByName ?? card.analysts.primary ?? card.analysts.secondary ?? 'Unknown'
  const requestBannerClass = isEarlyTermination
    ? 'bg-red-50 border-red-500 text-red-900'
    : 'bg-amber-50 border-amber-500 text-amber-900'
  const requestBannerTitle = isEarlyTermination
    ? '⚠️ Early Termination Request Pending'
    : '📋 Next Stage Request Pending'
  const headerTitle = `${formatTickerWithExchange(card.ticker, card.exchange)}${card.company ? ` (${card.company})` : ''}`
  const headerDescription = isEarlyTermination
    ? 'Early termination request pending approval'
    : 'Stage change request pending approval'

  return (
    <Sheet open={open} onOpenChange={(state) => (!state ? onClose() : undefined)}>
      <FloatingSideSheetContent side="right" className="flex h-full flex-col overflow-hidden p-0">
        <SheetTitle className="sr-only">Stage change request</SheetTitle>
        <SheetDescription className="sr-only">{card.company}</SheetDescription>

        <div className="border-b border-gray-200 px-6 py-4">
          <p className="text-foreground text-xl font-semibold break-words">{headerTitle}</p>
          <p className="text-muted-foreground text-sm font-medium break-words">
            {headerDescription}
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1 pr-2">
          <div className="space-y-4 px-6 py-5">
            <div className={`space-y-2 rounded-md border-l-4 px-4 py-3 ${requestBannerClass}`}>
              <div className="text-sm font-medium">{requestBannerTitle}</div>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="font-semibold">Requested by:</span> {requestedBy}
                </div>
                <div>
                  <span className="font-semibold">Date:</span> {submittedDate}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Stage Transition</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                  {formatStageName({ slug: approval.fromStage ?? '' })}
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="flex-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700">
                  {displayTargetStage}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-foreground text-sm font-semibold">Rationale</p>
              <p
                className="text-muted-foreground text-sm leading-relaxed"
                style={{
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
              >
                {approval.rationale || 'No rationale provided.'}
              </p>
            </div>

            {approverNames ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Approval Roles</p>
                <div className="flex flex-wrap gap-2">
                  {approverNames.map((name) => {
                    const label = formatRoleName(name)
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700"
                        title={label}
                      >
                        <InitialsAvatar
                          name={label}
                          className="h-5 w-5 border-none bg-transparent"
                          textClassName="text-[10px] font-semibold text-white"
                        />
                        <span className="leading-none whitespace-nowrap">{label}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <Separator className="border-gray-200" />

            <div className="space-y-2 rounded-2xl border border-dashed border-gray-300 bg-white p-4 shadow-inner">
              <p className="text-foreground text-sm font-semibold">
                Relevant docs tagged by author
              </p>
              {payloadDocuments.length === 0 ? (
                <p className="text-muted-foreground text-xs">No documents were attached.</p>
              ) : (
                <div className="space-y-2">
                  {payloadDocuments.map((doc) => (
                    <div
                      key={doc.label}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="text-foreground font-medium break-words">{doc.label}</span>
                      </div>
                      <Link2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="border-t border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onCancelRequest?.(card)}
              disabled={!approval}
            >
              Cancel Request
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onEarlyTerminate?.(card)}
              disabled={!canEarlyTerminate}
            >
              Early Termination
            </Button>
          </div>
        </div>
      </FloatingSideSheetContent>
    </Sheet>
  )
}

function extractAttachmentList(payload?: Record<string, unknown> | null) {
  if (!payload) return []
  const documentsMeta = payload.documents
  if (!documentsMeta || typeof documentsMeta !== 'object') return []
  return Object.keys(documentsMeta as Record<string, unknown>).map((label) => ({ label }))
}

function formatRoleName(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}
