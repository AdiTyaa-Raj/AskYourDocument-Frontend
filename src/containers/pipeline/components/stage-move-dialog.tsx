'use client'

import { useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { formatStageName, openTemplateInNewTab } from '../lib/helpers'
import { useAttachmentCreatedFromOpener } from '../lib/useAttachmentCreatedListener'
import { AttachmentMultiSelect } from '@/components/shared/AttachmentMultiSelect'
import type { StageMoveDialogProps } from '../lib/types'
import { cn, formatTickerWithExchange } from '@/lib/utils'
import {
  getCombinedRequirementTokens,
  getMissingRequiredAttachmentTokens,
  type StageAttachment,
} from '@/lib/attachments'
import { FloatingSideSheetContent } from '@/components/shared/FloatingSideSheet'
import { useUploadDocument } from '@/containers/documents/lib/queries'
import type { ApiDocument } from '@/containers/documents/lib/types'
import notify from '@/lib/notifications'
import InitialsAvatar from '@/components/shared/InitialsAvatar'
import { ArrowRight, Plus, Upload } from 'lucide-react'

const EARLY_TERMINATION_SLUG = 'EARLY_TERMINATED'

export function StageMoveDialog({
  open,
  onClose,
  onSubmit,
  onEarlyTerminate,
  rationale,
  rationaleTouched,
  onRationaleChange,
  onRationaleTouch,
  card,
  companyId,
  fromStage,
  targetStageSlug,
  targetStageName,
  requirements,
  isSubmitting = false,
  errorMessage = null,
  canEarlyTerminate = false,
  attachmentOptions,
  noteAttachments,
  onNoteAttachmentSelect,
  onNoteAttachmentRemove,
  requiredAttachmentSearch,
  onRequiredAttachmentSearchChange,
  optionalAttachmentSearch,
  onOptionalAttachmentSearchChange,
  attachmentQueryInfo,
  selectedDocuments,
  selectedMemos,
  onDocumentSelect,
  onDocumentRemove,
  onMemoSelect,
  onMemoRemove,
  documentOptions,
  memoOptions,
  documentsQueryInfo,
  memosQueryInfo,
  requiredAttachmentOptions = [],
  onAttachmentsRefetch,
}: StageMoveDialogProps) {
  const minRationale = Math.max(requirements?.minRationaleLength ?? 1, 10)
  const rationaleMaxLength = 150
  const trimmedRationaleLength = rationale.trim().length
  const isRationaleValid =
    trimmedRationaleLength >= minRationale && trimmedRationaleLength <= rationaleMaxLength
  const showRationaleError = rationaleTouched && !isRationaleValid
  const rationaleErrorId = showRationaleError ? 'stage-move-rationale-error' : undefined
  const rationaleHelperId = 'stage-move-rationale-helper'
  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const missingTokens = getMissingRequiredAttachmentTokens(
    [...selectedDocuments, ...selectedMemos],
    requirements?.requiredAttachments
  )
  const canSubmit =
    isRationaleValid && !!targetStageSlug && missingTokens.length === 0 && !isSubmitting
  const isEarlyTermination = targetStageSlug === EARLY_TERMINATION_SLUG
  const showEarlyTermination = canEarlyTerminate
  const terminateDisabled =
    rationale.trim().length < minRationale || !canEarlyTerminate || isSubmitting
  const submitLabel = isEarlyTermination ? 'Submit Termination Request' : 'Next Stage'
  const dialogCompanyName =
    card?.company ||
    (card?.meta as { company?: string; company_name?: string } | null | undefined)?.company ||
    (card?.meta as { company?: string; company_name?: string } | null | undefined)?.company_name ||
    ''
  const dialogTitle = `Request Stage Move: ${formatTickerWithExchange(card?.ticker, card?.exchange)}${
    dialogCompanyName ? ` (${dialogCompanyName})` : ''
  }`
  const dialogDescription = 'Submit a request to move this company to the next pipeline stage.'
  const rationalePlaceholder = isEarlyTermination
    ? 'Explain why this company should be removed from the pipeline...'
    : 'Explain why this company is ready to progress…'
  const requiredAttachmentTokens = useMemo(
    () => getCombinedRequirementTokens(requirements?.requiredAttachments),
    [requirements?.requiredAttachments]
  )
  const hasRequiredAttachments = requiredAttachmentTokens.length > 0
  const requiredHelperText = hasRequiredAttachments
    ? `Required: ${requiredAttachmentTokens.join(', ')}`
    : undefined
  const uploadDocumentMutation = useUploadDocument()
  const transitionTargetName = targetStageSlug
    ? (targetStageName ?? formatStageName({ slug: targetStageSlug }))
    : 'No next stage available'
  const mapApiDocumentToAttachment = (doc: ApiDocument) => {
    const companyIds: Array<string | number> = []
    if (doc.primary_company_id) companyIds.push(doc.primary_company_id)
    doc.company_ids_details?.forEach((c) => {
      if (c?.id) companyIds.push(c.id)
    })
    const ticker =
      doc.primary_company_id_details?.ticker ||
      doc.ticker ||
      (doc.company_ids_details && doc.company_ids_details[0]?.ticker) ||
      null
    return {
      id: doc.id,
      label: doc.title || doc.filename || `Document ${doc.id}`,
      subLabel: doc.category || ticker || 'Document',
      type: 'document' as const,
      documentType: doc.category || undefined,
      ticker,
      companyIds: companyIds.length ? companyIds : undefined,
    }
  }

  const handleUpload = async (category: string, mode: 'required' | 'optional') => {
    if (!companyId) {
      notify.error({
        title: 'Company missing',
        description: 'Unable to upload because company information is missing.',
      })
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept =
      'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return
      const toastId = notify.loading({
        title: 'Uploading document...',
        description: file.name,
      })
      try {
        const response = await uploadDocumentMutation.mutateAsync({
          file,
          metadata: {
            title: file.name,
            uploaded_by: 'current-user',
            description: `Uploaded ${file.name}`,
            primary_company_id: Number(companyId),
            company_ids: [],
            actionable: 'NO_ACTION',
            category,
            publish: true,
          },
        })
        const uploaded = mapApiDocumentToAttachment(response.data)
        if (mode === 'required') {
          onDocumentSelect(uploaded)
        } else {
          onNoteAttachmentSelect(uploaded)
        }
        notify.success({
          title: 'Document uploaded',
          description: `${file.name} is ready to attach.`,
        })
        if (onAttachmentsRefetch) {
          await onAttachmentsRefetch()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed'
        notify.error({ title: 'Upload failed', description: message })
      } finally {
        notify.dismiss(toastId)
      }
    }
    input.click()
  }

  const requiredSelected = useMemo(
    () => [...selectedDocuments, ...selectedMemos],
    [selectedDocuments, selectedMemos]
  )
  const baseRequiredOptions = useMemo(() => {
    if (requiredAttachmentTokens.length) {
      return requiredAttachmentOptions
    }
    return [...documentOptions, ...memoOptions]
  }, [documentOptions, memoOptions, requiredAttachmentOptions, requiredAttachmentTokens])

  const handleRequiredAttachmentSelect = useCallback(
    (item: StageAttachment) => {
      if (item.type === 'memo') {
        onMemoSelect(item)
      } else {
        onDocumentSelect(item)
      }
    },
    [onDocumentSelect, onMemoSelect]
  )

  const handleRequiredAttachmentRemove = useCallback(
    (item: StageAttachment) => {
      if (item.type === 'memo') {
        onMemoRemove(item.id)
      } else {
        onDocumentRemove(item.id)
      }
    },
    [onDocumentRemove, onMemoRemove]
  )

  const requiredOptions = useAttachmentCreatedFromOpener({
    baseList: baseRequiredOptions,
    onSelect: handleRequiredAttachmentSelect,
    onRefetch: onAttachmentsRefetch,
    expectedTicker: card?.ticker ?? null,
    expectedCompanyId: companyId ?? card?.id ?? null,
  })

  const handleCreateTemplate = useCallback(() => {
    const token = requiredAttachmentTokens[0]
    openTemplateInNewTab(token, 'stage-move-dialog')
  }, [requiredAttachmentTokens])

  const handleEarlyTerminateClick = useCallback(() => {
    if (!terminateDisabled) {
      onEarlyTerminate()
    }
  }, [onEarlyTerminate, terminateDisabled])

  const approvers = useMemo(() => {
    const roles = requirements?.requiredRoles ?? []

    const buildInitials = (value: string, fallback: string) =>
      value
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || fallback

    const formatLabel = (value: string) =>
      value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')

    return roles.map((role) => {
      const lower = role.toLowerCase()

      if (lower.includes('lead-investor')) {
        return { label: 'Any Lead Investor', initials: 'LI' }
      }

      if (lower.includes('primary-analyst')) {
        const name = card?.analysts?.primary || 'Primary Analyst'
        return { label: name, initials: buildInitials(name, 'PA') }
      }

      if (lower.includes('secondary-analyst')) {
        const name = card?.analysts?.secondary || 'Secondary Analyst'
        return { label: name, initials: buildInitials(name, 'SA') }
      }

      const label = formatLabel(role)
      return { label, initials: buildInitials(label, 'AP') }
    })
  }, [card?.analysts?.primary, card?.analysts?.secondary, requirements?.requiredRoles])
  const isResubmit = card?.currentApproval?.status === 'rejected'
  const rejectionReason = card?.currentApproval?.decisionMeta?.comment
  const rejectionApprover = card?.currentApproval?.decisionMeta?.decidedByName ?? 'Approver'

  const requiredQueryInfo = useMemo(
    () => ({
      isLoading:
        attachmentQueryInfo.isLoading || documentsQueryInfo.isLoading || memosQueryInfo.isLoading,
      isFetchingNextPage: attachmentQueryInfo.isFetchingNextPage,
      hasNextPage: attachmentQueryInfo.hasNextPage,
      fetchNextPage: attachmentQueryInfo.fetchNextPage,
      errorMessage:
        attachmentQueryInfo.errorMessage ??
        documentsQueryInfo.errorMessage ??
        memosQueryInfo.errorMessage,
    }),
    [attachmentQueryInfo, documentsQueryInfo, memosQueryInfo]
  )
  const handleSheetOpenChange = async (openState: boolean) => {
    if (openState && onAttachmentsRefetch) {
      await onAttachmentsRefetch()
    }

    if (!openState) {
      handleClose()
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <FloatingSideSheetContent
        side="right"
        className="flex h-full min-h-0 flex-col overflow-hidden p-0"
      >
        <SheetTitle className="sr-only">{dialogTitle}</SheetTitle>
        <SheetDescription className="sr-only">{dialogDescription}</SheetDescription>

        <div className="border-b border-gray-200 px-6 py-4">
          <p className="text-base font-semibold text-gray-900">{dialogTitle}</p>
          <p className="text-sm text-gray-600">{dialogDescription}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {isEarlyTermination ? (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs">
              <p className="font-semibold">
                This will remove {card?.company ?? 'this company'} from the active pipeline and move
                it to the Early Terminated list. This action requires approval.
              </p>
            </div>
          ) : null}
          {isResubmit && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold">Previous request was rejected by {rejectionApprover}</p>
              {rejectionReason ? <p className="mt-1 italic">Reason: “{rejectionReason}”</p> : null}
              <p className="mt-1 font-semibold">A note for you</p>
              <p className="mt-1">
                You must provide an UPDATED rationale addressing the rejection feedback.
              </p>
            </div>
          )}
          {card?.currentApproval ? (
            <div className="bg-muted/40 text-muted-foreground rounded-md px-3 py-2 text-xs">
              <p className="text-foreground font-medium">
                Current request ({card.currentApproval.status})
              </p>
              {card.currentApproval.toStage ? (
                <p>Target Stage: {formatStageName({ slug: card.currentApproval.toStage })}</p>
              ) : null}
              {card.currentApproval.rationale ? (
                <p className="line-clamp-2 italic">Rationale: “{card.currentApproval.rationale}”</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Stage Transition</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900">
                {fromStage}
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="flex-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700">
                {transitionTargetName}
              </div>
            </div>
          </div>
          {approvers.length ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-gray-900">Approvers</p>
              <div className="flex flex-wrap gap-2">
                {approvers.map((approver) => {
                  const displayLabel =
                    approver.label.length > 16 ? `${approver.label.slice(0, 13)}…` : approver.label
                  return (
                    <span
                      key={`${approver.label}-${approver.initials}`}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700"
                      title={approver.label}
                    >
                      <InitialsAvatar
                        name={approver.label}
                        className="h-6 w-6 border-none bg-transparent"
                        textClassName="text-[10px] font-semibold text-white"
                      />
                      <span className="leading-none">{displayLabel}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="text-foreground flex items-center justify-between text-sm font-medium">
              <span>
                Rationale <span className="text-destructive">*</span>
                <span className="text-muted-foreground text-xs font-normal">
                  {' '}
                  {minRationale > 1
                    ? `(minimum ${minRationale} characters, max ${rationaleMaxLength})`
                    : `(max ${rationaleMaxLength})`}
                </span>
              </span>
              <span
                className={cn(
                  'text-xs',
                  showRationaleError ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {rationale.length}
              </span>
            </div>
            <Textarea
              value={rationale}
              onChange={(event) => {
                if (!rationaleTouched) {
                  onRationaleTouch()
                }
                onRationaleChange(event.target.value)
              }}
              placeholder={rationalePlaceholder}
              className="min-h-28 resize-none break-words"
              disabled={isSubmitting}
              maxLength={rationaleMaxLength}
              aria-describedby={rationaleHelperId}
            />
            {showRationaleError ? (
              <p
                id={rationaleErrorId}
                className="text-destructive text-xs"
              >{`Rationale must be at least ${minRationale} characters.`}</p>
            ) : (
              <p id={rationaleHelperId} className="text-muted-foreground text-xs">
                Keep it concise. {rationale.length}/{rationaleMaxLength} characters.
              </p>
            )}
          </div>
          {hasRequiredAttachments ? (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
              <AttachmentMultiSelect
                label="Required Attachments"
                placeholder="Search required attachments"
                items={requiredOptions}
                selectedItems={requiredSelected}
                onSelectItem={handleRequiredAttachmentSelect}
                onRemoveItem={handleRequiredAttachmentRemove}
                searchTerm={requiredAttachmentSearch}
                onSearchTermChange={onRequiredAttachmentSearchChange}
                isLoading={requiredQueryInfo.isLoading}
                isFetchingNextPage={requiredQueryInfo.isFetchingNextPage}
                hasNextPage={requiredQueryInfo.hasNextPage}
                fetchNextPage={requiredQueryInfo.fetchNextPage}
                errorMessage={requiredQueryInfo.errorMessage}
                helperText={requiredHelperText}
                required
              />
              <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase">
                <div className="h-px flex-1 bg-gray-200" />
                <span>or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCreateTemplate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={uploadDocumentMutation.isPending}
                  onClick={() => handleUpload(requiredAttachmentTokens[0] ?? 'SCREEN', 'required')}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
          ) : null}

          <AttachmentMultiSelect
            label="Documents & Notes (optional)"
            placeholder="Search documents or memos"
            items={attachmentOptions}
            selectedItems={noteAttachments}
            onSelectItem={onNoteAttachmentSelect}
            onRemoveItem={onNoteAttachmentRemove}
            searchTerm={optionalAttachmentSearch}
            onSearchTermChange={onOptionalAttachmentSearchChange}
            isLoading={attachmentQueryInfo.isLoading}
            isFetchingNextPage={attachmentQueryInfo.isFetchingNextPage}
            hasNextPage={attachmentQueryInfo.hasNextPage}
            fetchNextPage={attachmentQueryInfo.fetchNextPage}
            errorMessage={attachmentQueryInfo.errorMessage}
            helperText="Optional supporting documents or pipeline notes."
          />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            disabled={uploadDocumentMutation.isPending}
            onClick={() => handleUpload('MISCELLANEOUS', 'optional')}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>

          {requiredAttachmentTokens.length ? (
            <div className="grid gap-1 text-sm">
              <span className="text-foreground font-medium">Required Attachments</span>
              <span className="text-muted-foreground">{requiredAttachmentTokens.join(', ')}</span>
            </div>
          ) : null}
          {errorMessage ? (
            <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
              {errorMessage}
            </div>
          ) : null}
        </div>
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {showEarlyTermination && !isEarlyTermination ? (
              <Button
                variant="destructive"
                onClick={handleEarlyTerminateClick}
                disabled={terminateDisabled}
                className="w-full"
              >
                Early Termination
              </Button>
            ) : null}
            <Button
              onClick={onSubmit}
              disabled={!canSubmit}
              className={cn(
                'w-full min-w-[136px]',
                isEarlyTermination &&
                  'h-auto py-2 text-center leading-snug whitespace-normal sm:col-span-2'
              )}
            >
              {isSubmitting ? 'Submitting…' : submitLabel}
            </Button>
          </div>
        </div>
      </FloatingSideSheetContent>
    </Sheet>
  )
}
