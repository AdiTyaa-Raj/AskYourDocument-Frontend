'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import notify from '@/lib/notifications'
import { formatTickerWithExchange } from '@/lib/utils'
import type { ApprovalDecisionResponse } from './lib/types'
import { summarizeApprovalDecisionResponse } from './lib/helpers'
import { ApprovalsSkeleton } from '@/components/shared/ApprovalsSkeleton'
import { PendingApprovalsList } from './components/PendingApprovalsList'
import { ApprovalDetail } from './components/ApprovalDetail'
import { ApprovalActionDialog } from './components/ApprovalActionDialog'
import { BulkActionBar } from './components/BulkActionBar'
import { DocumentDetailContainer } from '@/containers/documents/DocumentDetailContainer'
import type {
  ApprovalFilter,
  ApprovalActionType,
  DecisionMutationInput,
  AnyApprovalRequest,
  ApprovalDocument,
} from './lib/types'
import { useApprovalDecisionMutation, useApprovalsQuery } from './lib/queries'
import { getApprovalsUrlState, resolveSelectedApprovalId } from './lib/helpers'

export function ApprovalsContainer() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filter, setFilter] = useState<ApprovalFilter>('my')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<ApprovalActionType>('approve')
  const [comment, setComment] = useState('')
  const [dialogContext, setDialogContext] = useState<'single' | 'bulk'>('single')
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const [missingApprovalId, setMissingApprovalId] = useState<string | null>(null)
  const [suppressAutoSelect, setSuppressAutoSelect] = useState(false)

  const mineOnly = filter === 'my'
  const approvalsQuery = useApprovalsQuery({ mineOnly })

  const initialApprovalIdRef = useRef<string | null>(null)
  const initialFilterRef = useRef<ApprovalFilter | null>(null)

  useEffect(() => {
    if (initialApprovalIdRef.current) return
    const direct = searchParams.get('id') ?? searchParams.get('approvalId')
    if (direct?.trim().length) {
      initialApprovalIdRef.current = direct.trim()
    }
  }, [searchParams])

  useEffect(() => {
    if (initialFilterRef.current) return
    const raw = searchParams.get('filter')
    const parsed: ApprovalFilter = raw === 'all' ? 'all' : 'my'
    initialFilterRef.current = parsed
    if (parsed !== filter) {
      setFilter(parsed)
    }
  }, [filter, searchParams])

  useEffect(() => {
    if (approvalsQuery.isError) {
      notify.error({
        title: 'Failed to load approvals',
        description: 'Please try again.',
      })
    }
  }, [approvalsQuery.isError])

  const pendingApprovals = useMemo<AnyApprovalRequest[]>(() => {
    if (approvalsQuery.data) return approvalsQuery.data
    return []
  }, [approvalsQuery.data])

  useEffect(() => {
    if (!approvalsQuery.data) return
    const initialId = initialApprovalIdRef.current
    if (initialId && !pendingApprovals.some((item) => item.id === initialId)) {
      if (!missingApprovalId) {
        setMissingApprovalId(initialId)
        initialApprovalIdRef.current = null
        setSelectedApprovalId(null)
        setSuppressAutoSelect(true)
      }
      return
    }
    if (suppressAutoSelect) return

    const nextId = resolveSelectedApprovalId({
      items: pendingApprovals,
      currentId: selectedApprovalId,
      initialId: initialApprovalIdRef.current,
      isLoading: approvalsQuery.isLoading,
    })

    if (nextId !== undefined && nextId !== selectedApprovalId) {
      setSelectedApprovalId(nextId)
    }
  }, [
    approvalsQuery.data,
    approvalsQuery.isLoading,
    missingApprovalId,
    pendingApprovals,
    selectedApprovalId,
    suppressAutoSelect,
  ])

  useEffect(() => {
    if (!approvalsQuery.data) return

    const { nextUrl, currentUrl } = getApprovalsUrlState({
      pathname,
      searchParams,
      filter,
      selectedApprovalId,
    })

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false })
    }
  }, [approvalsQuery.data, filter, pathname, router, searchParams, selectedApprovalId])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => pendingApprovals.some((item) => item.id === id)))
  }, [pendingApprovals])

  useEffect(() => {
    setPreviewDocumentId(null)
  }, [selectedApprovalId])

  const selectedApproval = useMemo<AnyApprovalRequest | null>(
    () => pendingApprovals.find((item) => item.id === selectedApprovalId) ?? null,
    [pendingApprovals, selectedApprovalId]
  )

  const decisionMutation = useApprovalDecisionMutation()

  const handleOpenDocument = useCallback((doc: ApprovalDocument) => {
    const idValue = typeof doc.id === 'number' || typeof doc.id === 'string' ? String(doc.id) : null
    if (!idValue) return
    setPreviewDocumentId(idValue)
  }, [])

  const handleClosePreview = useCallback(() => {
    setPreviewDocumentId(null)
  }, [])

  const handleDecisionSuccess = useCallback(
    (response: ApprovalDecisionResponse, variables: DecisionMutationInput) => {
      const summary = summarizeApprovalDecisionResponse(response)
      if (summary.errors.length) {
        notify.error({
          title: 'Action failed',
          description: summary.errors[0],
        })
        return
      }
      if (summary.notes.length) {
        notify.warning({
          title: 'Action not completed',
          description: summary.notes[0],
        })
        return
      }

      const { requestIds, successMessage, ticker } = variables
      const description =
        successMessage?.description ??
        `${requestIds.length} request${requestIds.length > 1 ? 's' : ''} updated.`

      notify.success({
        title: successMessage?.title ?? 'Approval updated',
        description,
      })

      setComment('')
      setDialogOpen(false)
      setDialogContext('single')
      const clearedIds = new Set(requestIds.map((value) => String(value)))
      setSelectedIds((prev) => prev.filter((id) => !clearedIds.has(id)))
      setSelectedApprovalId(null)

      void queryClient.invalidateQueries({ queryKey: ['approvals', 'list'] })
      if (ticker) {
        void queryClient.invalidateQueries({ queryKey: ['approvals', 'history', ticker] })
      }
    },
    [queryClient]
  )
  const handleDecisionError = useCallback((error: unknown) => {
    const data = (error as { response?: { data?: { detail?: string; message?: string } } })
      ?.response?.data
    const message =
      (typeof data?.detail === 'string' && data.detail) ||
      (typeof data?.message === 'string' && data.message) ||
      'Unable to update approval. Please try again.'

    notify.error({
      title: 'Action failed',
      description: message,
    })
  }, [])
  const submitDecision = useCallback(
    (input: DecisionMutationInput) => {
      decisionMutation.mutate(input, {
        onSuccess: (response, variables) => {
          handleDecisionSuccess(response, variables)
        },
        onError: handleDecisionError,
      })
    },
    [decisionMutation, handleDecisionError, handleDecisionSuccess]
  )

  const approvalsLoaded = Boolean(approvalsQuery.data)
  const canTakeAction = approvalsLoaded

  const handleSelectApproval = (approval: AnyApprovalRequest) => {
    setMissingApprovalId(null)
    setSuppressAutoSelect(false)
    setSelectedApprovalId(approval.id)
  }

  const handleToggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id]
      }
      return prev.filter((existingId) => existingId !== id)
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds([])
      return
    }
    const actionableIds = pendingApprovals
      .filter((a) => a.canApprove && !a.alreadyApproved && !a.cannotApprove)
      .map((a) => a.id)
    setSelectedIds(actionableIds)
  }

  const openActionDialog = (type: ApprovalActionType) => {
    if (!canTakeAction) {
      notify.warning({
        title: 'Actions unavailable',
        description: 'Approvals have not finished loading.',
      })
      return
    }
    setComment('')
    setDialogContext('single')
    setActionType(type)
    setDialogOpen(true)
  }

  const openBulkRejectDialog = () => {
    if (!canTakeAction || selectedIds.length === 0) {
      return
    }
    setComment('')
    setDialogContext('bulk')
    setActionType('reject')
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setComment('')
    setDialogContext('single')
  }

  const handleConfirmAction = () => {
    if (!canTakeAction) {
      closeDialog()
      return
    }

    const trimmed = comment.trim()
    if (actionType === 'reject' && trimmed.length === 0) {
      notify.error({
        title: 'Comment required',
        description: 'Add a short rejection comment before submitting.',
      })
      return
    }

    if (dialogContext === 'bulk') {
      const numericIds = selectedIds
        .map((id) => Number(id))
        .filter((value): value is number => Number.isFinite(value))

      if (!numericIds.length) {
        notify.error({ title: 'Invalid selection', description: 'Please refresh the page' })
        closeDialog()
        return
      }

      submitDecision({
        requestIds: numericIds,
        decision: 'rejected',
        rationale: trimmed,
        successMessage: {
          title: 'Rejected',
          description: `${numericIds.length} request${numericIds.length > 1 ? 's' : ''} rejected`,
        },
      })
      return
    }

    if (!selectedApproval) {
      closeDialog()
      return
    }

    const requestIdNumber = Number(selectedApproval.id)
    if (!Number.isFinite(requestIdNumber)) {
      notify.error({ title: 'Invalid approval ID', description: 'Please refresh the page' })
      closeDialog()
      return
    }

    const successLabel =
      selectedApproval.kind === 'stage'
        ? (() => {
            const s = selectedApproval
            const label = formatTickerWithExchange(s.ticker, s.overview.exchange)
            return s.company && s.company !== s.ticker ? `${label} — ${s.company}` : label
          })()
        : selectedApproval.title
    const historyTicker = selectedApproval.kind === 'stage' ? selectedApproval.ticker : undefined

    submitDecision({
      requestIds: [requestIdNumber],
      decision: actionType === 'approve' ? 'approved' : 'rejected',
      rationale: trimmed.length > 0 ? trimmed : undefined,
      ticker: historyTicker,
      successMessage: {
        title: actionType === 'approve' ? 'Approval recorded' : 'Request rejected',
        description: successLabel,
      },
    })
  }

  const handleApproveAll = () => {
    if (!canTakeAction || selectedIds.length === 0) return

    const numericIds = selectedIds
      .map((id) => Number(id))
      .filter((value): value is number => Number.isFinite(value))

    if (!numericIds.length) {
      notify.error({ title: 'Invalid selection', description: 'Please refresh the page' })
      return
    }

    submitDecision({
      requestIds: numericIds,
      decision: 'approved',
      successMessage: {
        title: 'Approved',
        description: `${numericIds.length} request${numericIds.length > 1 ? 's' : ''} approved`,
      },
    })
  }

  const handleViewMemo = (memoId: number) => {
    router.push(`/research-updates?viewMemo=${memoId}`)
  }

  if (approvalsQuery.isLoading && !approvalsQuery.data) {
    return <ApprovalsSkeleton />
  }

  const isBulkRejectDialog = dialogContext === 'bulk' && actionType === 'reject'
  const sidebarLoading = approvalsQuery.isFetching
  const detailLoading = approvalsQuery.isFetching && !selectedApproval

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-hidden md:grid-cols-3">
        <div className="flex min-h-0 flex-col overflow-hidden md:col-span-1">
          <PendingApprovalsList
            approvals={pendingApprovals}
            selectedApprovalId={selectedApprovalId}
            selectedIds={selectedIds}
            filter={filter}
            onFilterChange={setFilter}
            onSelectApproval={handleSelectApproval}
            onToggleSelection={handleToggleSelection}
            onSelectAll={handleSelectAll}
            isLoading={sidebarLoading}
          />
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden md:col-span-2">
          <ApprovalDetail
            approval={selectedApproval}
            isLoading={detailLoading}
            onApprove={() => openActionDialog('approve')}
            onReject={() => openActionDialog('reject')}
            onViewMemo={handleViewMemo}
            onOpenDocument={handleOpenDocument}
          />
        </div>

        <ApprovalActionDialog
          open={dialogOpen}
          actionType={actionType}
          comment={comment}
          onCommentChange={setComment}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog()
            } else {
              setDialogOpen(true)
            }
          }}
          onConfirm={handleConfirmAction}
          isSubmitting={decisionMutation.isPending}
          titleOverride={isBulkRejectDialog ? 'Reject selected requests' : undefined}
          descriptionOverride={
            isBulkRejectDialog
              ? 'Provide one rejection comment that will be shared with all selected requesters.'
              : undefined
          }
          confirmLabelOverride={isBulkRejectDialog ? 'Reject selected' : undefined}
        />

        <BulkActionBar
          count={selectedIds.length}
          onApproveAll={handleApproveAll}
          onRejectAll={openBulkRejectDialog}
          disabled={decisionMutation.isPending || !canTakeAction}
        />

        {previewDocumentId ? (
          <div className="fixed inset-0 z-50 bg-black/30">
            <div className="absolute inset-y-6 left-1/2 w-[calc(100vw-80px)] max-w-[1280px] -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
              <DocumentDetailContainer
                documentId={previewDocumentId}
                onClose={handleClosePreview}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ApprovalsContainer
