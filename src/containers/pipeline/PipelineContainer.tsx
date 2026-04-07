'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

import { PipelineToolbar } from './components/pipeline-toolbar'
import { PipelineBoard } from './components/pipeline-board'
import { PipelineTimeline } from './components/pipeline-timeline'
import { StageMoveDialog } from './components/stage-move-dialog'
import { PipelineErrorState } from './components/pipeline-error-state'
import { StageRequestDetailsDialog } from './components/stage-request-details-dialog'
import { MaintenanceTab } from './MaintenanceTab'
import {
  PipelineBoardData,
  PipelineCard,
  PipelineStageInfo,
  PipelineView,
  StageCompaniesState,
  StageMoveRequirements,
} from './lib/types'
import { formatStageName } from './lib/helpers'
import { usePipelineOriginationAnalystOptions } from './lib/maintenance-queries'
import {
  mapCompanyRecordToCard,
  usePipelineBoardQuery,
  usePipelineTimelineQuery,
} from './lib/queries'
import { PipelineBoardSkeleton } from './components/PipelineBoardSkeleton'
import notify from '@/lib/notifications'
import { summarizeApprovalDecisionResponse } from '@/containers/approvals/lib/helpers'
import { approvalsService, coverageService, pipelineService, usersService } from '@/services/api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type {
  AttachmentCollectionsPayload,
  MoveCompanyRequest,
} from '@/containers/coverage/lib/types'
import {
  attachmentMatchesCompany,
  attachmentMatchesRequirements,
  attachmentsToRecord,
  filterAttachmentsByRequirements,
  getMissingRequiredAttachmentTokens,
  getCombinedRequirementTokens,
  filterAttachmentsByTokens,
  normaliseAttachmentRequirements,
  type StageAttachment,
  useAllLinkedDocsMemoQuery,
} from '@/lib/attachments'
import { CompanyMoveModal } from '@/containers/coverage/components/CompanyMoveModal'
import { useAnalysts } from '@/containers/coverage/lib/queries'
import { getStageRequiredAttachments } from '@/lib/pipelineStageUtils'
import { useAppSelector } from '@/store'
import { cn, formatTickerWithExchange } from '@/lib/utils'

const EARLY_TERMINATION_SLUG = 'EARLY_TERMINATED'
const REACTIVATION_TARGET_SLUG = 'WATCHLIST'
const STAGE_PAGE_SIZE = 10
type PipelineTab = 'pipeline' | 'maintenance'
const createStageState = (): StageCompaniesState => ({
  items: [],
  offset: 0,
  total: 0,
  hasMore: true,
  isLoading: false,
  error: null,
})
const mergeAttachmentLists = (...lists: StageAttachment[][]) => {
  const map = new Map<string, StageAttachment>()
  lists.forEach((list) => {
    list.forEach((item) => {
      const key = `${item.type}-${item.id}`
      if (!map.has(key)) {
        map.set(key, item)
      }
    })
  })
  return Array.from(map.values())
}
type StageMoveMutationInput = {
  ticker: string
  exchange: string
  companyId: string
  newStageSlug: string
  rationale: string
  attachments?: {
    documents?: AttachmentCollectionsPayload
  }
}

export function PipelineContainer() {
  const TIMELINE_ENABLED = false
  const authUser = useAppSelector((state) => state.auth.user)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initialTab = (searchParams.get('tab') as PipelineTab | null) ?? 'pipeline'
  const initialView = TIMELINE_ENABLED
    ? ((searchParams.get('view') as PipelineView | null) ?? 'kanban')
    : 'kanban'

  const [activeTab, setActiveTab] = useState<PipelineTab>(initialTab)
  const [view, setView] = useState<PipelineView>(initialView)
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [analyst, setAnalyst] = useState<string>('all')
  const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null)
  const [selectedStage, setSelectedStage] = useState<PipelineStageInfo | null>(null)
  const [rationale, setRationale] = useState('')
  const [rationaleTouched, setRationaleTouched] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [targetStageSlug, setTargetStageSlug] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isDirectEarlyTermination, setIsDirectEarlyTermination] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<{
    card: PipelineCard
    stage: PipelineStageInfo
  } | null>(null)
  const [dismissTarget, setDismissTarget] = useState<{
    card: PipelineCard
    stage: PipelineStageInfo
  } | null>(null)
  const [requiredDocuments, setRequiredDocuments] = useState<StageAttachment[]>([])
  const [requiredMemos, setRequiredMemos] = useState<StageAttachment[]>([])
  const [noteDocuments, setNoteDocuments] = useState<StageAttachment[]>([])
  const [noteMemos, setNoteMemos] = useState<StageAttachment[]>([])
  const [requiredAttachmentSearch, setRequiredAttachmentSearch] = useState('')
  const [optionalAttachmentSearch, setOptionalAttachmentSearch] = useState('')
  const [requestDetailsCard, setRequestDetailsCard] = useState<PipelineCard | null>(null)
  const [reactivationCard, setReactivationCard] = useState<PipelineCard | null>(null)
  const [reactivationStage, setReactivationStage] = useState<PipelineStageInfo | null>(null)
  const [reactivationAttachmentSearch, setReactivationAttachmentSearch] = useState('')
  const [stageDataMap, setStageDataMap] = useState<Record<string, StageCompaniesState>>({})
  const stageDataMapRef = useRef(stageDataMap)
  useEffect(() => {
    stageDataMapRef.current = stageDataMap
  }, [stageDataMap])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  useEffect(() => {
    let active = true
    const fetchCurrentUser = async () => {
      if (!authUser) {
        setCurrentUserId(null)
        return
      }
      try {
        const profile = await usersService.getCurrentUser()
        if (active) {
          setCurrentUserId(typeof profile?.id === 'number' ? profile.id : null)
        }
      } catch (error) {
        if (active) {
          setCurrentUserId(null)
        }
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to load current user profile', error)
        }
      }
    }
    void fetchCurrentUser()
    return () => {
      active = false
    }
  }, [authUser])
  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchInput.trim()
    if (trimmed === activeSearch) return
    setActiveSearch(trimmed)
  }, [searchInput, activeSearch])

  const updateQueryParams = useCallback(
    (nextTab: PipelineTab, nextView: PipelineView) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', nextTab)
      if (nextTab === 'maintenance' || !TIMELINE_ENABLED) {
        params.delete('view')
      } else {
        params.set('view', nextView)
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [TIMELINE_ENABLED, pathname, router, searchParams]
  )

  useEffect(() => {
    updateQueryParams(activeTab, view)
  }, [activeTab, updateQueryParams, view])

  const isReactivationModalOpen = Boolean(reactivationCard)
  const pipelineQuery = usePipelineBoardQuery()
  const timelineQuery = usePipelineTimelineQuery({
    enabled: TIMELINE_ENABLED && view === 'timeline',
  })
  const queryClient = useQueryClient()
  const cancelDialogOpen = Boolean(cancelTarget)
  const dismissDialogOpen = Boolean(dismissTarget)
  const attachmentsEnabled = dialogOpen
  const activeCompanyId = selectedCard ? Number(selectedCard.id) : null
  const requiredDocumentsQuery = useAllLinkedDocsMemoQuery({
    enabled: attachmentsEnabled,
    search: requiredAttachmentSearch,
    companyId: activeCompanyId,
    type: 'DOCUMENT',
  })
  const requiredMemosQuery = useAllLinkedDocsMemoQuery({
    enabled: attachmentsEnabled,
    search: requiredAttachmentSearch,
    companyId: activeCompanyId,
    type: 'MEMO',
  })
  const optionalDocumentsQuery = useAllLinkedDocsMemoQuery({
    enabled: attachmentsEnabled,
    search: optionalAttachmentSearch,
    companyId: activeCompanyId,
    type: 'DOCUMENT',
  })
  const optionalMemosQuery = useAllLinkedDocsMemoQuery({
    enabled: attachmentsEnabled,
    search: optionalAttachmentSearch,
    companyId: activeCompanyId,
    type: 'MEMO',
  })
  const reactivationDocumentsQuery = useAllLinkedDocsMemoQuery({
    enabled: isReactivationModalOpen,
    search: reactivationAttachmentSearch,
    companyId: reactivationCard ? Number(reactivationCard.id) : null,
    type: 'DOCUMENT',
  })
  const reactivationMemosQuery = useAllLinkedDocsMemoQuery({
    enabled: isReactivationModalOpen,
    search: reactivationAttachmentSearch,
    companyId: reactivationCard ? Number(reactivationCard.id) : null,
    type: 'MEMO',
  })
  const {
    data: reactivationPrimaryAnalysts = [],
    isLoading: isLoadingReactivationPrimaryAnalysts,
  } = useAnalysts(isReactivationModalOpen ? 'arnie-primary-analyst' : undefined)
  const {
    data: reactivationSecondaryAnalysts = [],
    isLoading: isLoadingReactivationSecondaryAnalysts,
  } = useAnalysts(isReactivationModalOpen ? 'arnie-secondary-analyst' : undefined)

  useEffect(() => {
    if (pipelineQuery.isError) {
      notify.error({ title: 'Failed to load pipeline', description: 'Please try again' })
    }
  }, [pipelineQuery.isError])

  useEffect(() => {
    if (timelineQuery.isError) {
      notify.error({ title: 'Failed to load timeline', description: 'Please try again' })
    }
  }, [timelineQuery.isError])

  const stages = useMemo(
    () => pipelineQuery.data?.boardStages ?? [],
    [pipelineQuery.data?.boardStages]
  )

  const stageMap = useMemo(() => pipelineQuery.data?.stageMap ?? {}, [pipelineQuery.data?.stageMap])

  const stageOrderMap = useMemo(() => {
    const orderMap: Record<string, number> = {}
    stages.forEach((stage, index) => {
      orderMap[stage.slug] = typeof stage.order === 'number' ? stage.order : index
    })
    return orderMap
  }, [stages])

  const loadStageCompanies = useCallback(
    async (slug?: string, reset: boolean = false) => {
      const targetStages = slug ? [slug] : stages.map((stage) => stage.slug)
      if (!targetStages.length) return

      setStageDataMap((prev) => {
        const next = { ...prev }
        targetStages.forEach((target) => {
          const prevState = prev[target] ?? createStageState()
          const nextState = reset
            ? { ...createStageState(), isLoading: true }
            : { ...prevState, isLoading: true, error: null }
          next[target] = nextState
        })
        return next
      })

      const currentOffsets: Record<string, number> = {}
      targetStages.forEach((target) => {
        currentOffsets[target] = reset ? 0 : (stageDataMapRef.current[target]?.offset ?? 0)
      })

      try {
        const response = await pipelineService.getAllStageCompanies({
          view: 'pipeline',
          stage: slug,
          skip: slug ? (currentOffsets[slug] ?? 0) : 0,
          limit: STAGE_PAGE_SIZE,
          search: activeSearch ? activeSearch : undefined,
          analyst_id:
            analyst && analyst !== 'all' && !Number.isNaN(Number(analyst))
              ? Number(analyst)
              : undefined,
        })

        setStageDataMap((prev) => {
          const next = { ...prev }
          targetStages.forEach((target) => {
            const stageResponse = response.stages?.[target] ?? { total: 0, companies: [] }
            const mappedRecords = stageResponse.companies.map((record) =>
              mapCompanyRecordToCard(record, stageMap)
            )
            const prevState = prev[target] ?? createStageState()
            const newItems = reset ? mappedRecords : [...prevState.items, ...mappedRecords]
            const newOffset = (currentOffsets[target] ?? 0) + mappedRecords.length
            const totalCount = stageResponse.total ?? newItems.length
            next[target] = {
              items: newItems,
              offset: newOffset,
              total: totalCount,
              hasMore: mappedRecords.length === STAGE_PAGE_SIZE && newOffset < totalCount,
              isLoading: false,
              error: null,
            }
          })
          return next
        })
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`Failed to load companies`, error)
        }
        setStageDataMap((prev) => {
          const next = { ...prev }
          targetStages.forEach((target) => {
            const prevState = prev[target] ?? createStageState()
            next[target] = {
              ...prevState,
              isLoading: false,
              error: 'Unable to load companies',
            }
          })
          return next
        })
      }
    },
    [activeSearch, analyst, stageMap, stages]
  )

  const refreshAllStages = useCallback(() => {
    if (!stages.length) return
    void loadStageCompanies(undefined, true)
  }, [stages, loadStageCompanies])

  useEffect(() => {
    if (!stages.length) return
    setStageDataMap((prev) => {
      const next = { ...prev }
      stages.forEach((stage) => {
        if (!next[stage.slug]) {
          next[stage.slug] = createStageState()
        }
      })
      return next
    })
  }, [stages])

  useEffect(() => {
    refreshAllStages()
  }, [refreshAllStages])

  const handleLoadMoreStage = useCallback(
    (stage: PipelineStageInfo) => {
      const state = stageDataMapRef.current[stage.slug] ?? createStageState()
      if (state.isLoading || !state.hasMore) return
      loadStageCompanies(stage.slug)
    },
    [loadStageCompanies]
  )

  const boardData: PipelineBoardData = useMemo(() => {
    return stages.reduce<PipelineBoardData>((acc, stage) => {
      const stageState = stageDataMap[stage.slug]
      acc[stage.slug] = stageState?.items ?? []
      return acc
    }, {})
  }, [stages, stageDataMap])
  const stageStates = useMemo(() => {
    return stages.reduce<Record<string, StageCompaniesState>>((acc, stage) => {
      acc[stage.slug] = stageDataMap[stage.slug] ?? createStageState()
      return acc
    }, {})
  }, [stages, stageDataMap])

  const filteredBoardData: PipelineBoardData = boardData

  const { analystOptions } = usePipelineOriginationAnalystOptions({
    enabled: activeTab === 'pipeline',
    skip: 0,
    limit: 100,
    valueKind: 'id',
  })

  const clearAttachments = useCallback(() => {
    setRequiredDocuments([])
    setRequiredMemos([])
    setNoteDocuments([])
    setNoteMemos([])
    setRequiredAttachmentSearch('')
    setOptionalAttachmentSearch('')
  }, [])

  const resetDialog = () => {
    setDialogOpen(false)
    setSelectedCard(null)
    setSelectedStage(null)
    setRationale('')
    setRationaleTouched(false)
    setTargetStageSlug(null)
    setSubmissionError(null)
    setIsDirectEarlyTermination(false)
    clearAttachments()
  }

  const handleCardSelect = (
    card: PipelineCard,
    stage: PipelineStageInfo,
    preferredTargetSlug?: string | null
  ) => {
    setIsDirectEarlyTermination(false)
    clearAttachments()
    const stageInfo = stageMap[stage.slug] ?? stage
    const allowed = stageInfo.allowedNext ?? []
    const approvalTarget = card.currentApproval?.toStage ?? null
    const preferredTarget =
      preferredTargetSlug ??
      (stage.slug === EARLY_TERMINATION_SLUG ? REACTIVATION_TARGET_SLUG : null)
    const isForwardStage = (candidateSlug?: string | null) => {
      if (!candidateSlug) return false
      if (preferredTargetSlug && candidateSlug === preferredTargetSlug) {
        return true
      }
      const currentOrder = stageOrderMap[stage.slug]
      const candidateOrder = stageOrderMap[candidateSlug]
      if (currentOrder === undefined || candidateOrder === undefined) {
        return true
      }
      return candidateOrder > currentOrder
    }
    const forwardAllowed = allowed.filter((slug) => isForwardStage(slug))
    const approvalTargetForward =
      approvalTarget && isForwardStage(approvalTarget) ? approvalTarget : null
    const nextPreferred =
      forwardAllowed.find((slug) => slug !== 'ARCHIVE' && slug !== EARLY_TERMINATION_SLUG) ??
      forwardAllowed[0]
    const defaultTarget =
      preferredTarget ??
      approvalTargetForward ??
      nextPreferred ??
      forwardAllowed[0] ??
      allowed.find((slug) => slug !== 'ARCHIVE' && slug !== EARLY_TERMINATION_SLUG) ??
      allowed[0] ??
      null

    if (preferredTarget && !stageMap[preferredTarget]) {
      notify.error({
        title: 'Stage unavailable',
        description: 'The Watchlist stage is not configured. Please contact an admin.',
      })
      return
    }

    setSelectedCard(card)
    setSelectedStage(stageInfo)
    setTargetStageSlug(defaultTarget ?? null)
    setSubmissionError(null)
    if (card.currentApproval?.rationale) {
      setRationale(card.currentApproval.rationale)
    } else {
      setRationale('')
    }
    setRationaleTouched(false)
    setDialogOpen(true)
  }

  const handleReactivateClick = (card: PipelineCard, _stage: PipelineStageInfo) => {
    const watchlistStage = stageMap[REACTIVATION_TARGET_SLUG]
    if (!watchlistStage) {
      notify.error({
        title: 'Watchlist unavailable',
        description: 'The Watchlist stage is not configured. Please contact an admin.',
      })
      return
    }
    setReactivationCard(card)
    setReactivationStage(stageMap[card.stageSlug] ?? null)
    setReactivationAttachmentSearch('')
  }

  const handleEarlyTerminateClick = useCallback(
    (card: PipelineCard, stage: PipelineStageInfo) => {
      const stageInfo = stageMap[stage.slug] ?? stage
      const terminationStage = stageMap[EARLY_TERMINATION_SLUG]

      if (!terminationStage) {
        notify.error({
          title: 'Termination unavailable',
          description: 'Early termination is not configured',
        })
        return
      }

      clearAttachments()
      setSelectedCard(card)
      setSelectedStage(stageInfo)
      setTargetStageSlug(EARLY_TERMINATION_SLUG)
      setSubmissionError(null)
      setRationale('')
      setRationaleTouched(false)
      setIsDirectEarlyTermination(true)
      setDialogOpen(true)
    },
    [clearAttachments, stageMap]
  )

  const handleCancelRequestClick = (card: PipelineCard, stage: PipelineStageInfo) => {
    if (!card.currentApproval) {
      notify.error({
        title: 'No pending request',
        description: 'This company does not have an active approval request to cancel.',
      })
      return
    }

    const stageInfo = stageMap[stage.slug] ?? stage
    setCancelTarget({ card, stage: stageInfo })
  }

  const handleDismissRequestClick = (card: PipelineCard, stage: PipelineStageInfo) => {
    if (!card.currentApproval) {
      notify.error({
        title: 'Request unavailable',
        description: 'No rejected request found to dismiss.',
      })
      return
    }
    const stageInfo = stageMap[stage.slug] ?? stage
    setDismissTarget({ card, stage: stageInfo })
  }

  const handleViewRequestDetails = (card: PipelineCard) => {
    if (!card.currentApproval) return
    setRequestDetailsCard(card)
  }

  const handleEarlyTerminateFromDetails = useCallback(
    (card: PipelineCard) => {
      const stageInfo = stageMap[card.stageSlug]
      setRequestDetailsCard(null)
      if (stageInfo) {
        handleEarlyTerminateClick(card, stageInfo)
      }
    },
    [handleEarlyTerminateClick, stageMap]
  )

  const closeReactivationModal = () => {
    setReactivationCard(null)
    setReactivationStage(null)
    setReactivationAttachmentSearch('')
  }

  const handleDocumentSelect = (item: StageAttachment) => {
    setNoteDocuments((previous) => previous.filter((entry) => entry.id !== item.id))
    setRequiredDocuments((previous) => {
      if (previous.some((entry) => entry.id === item.id)) return previous
      return [...previous, item]
    })
  }

  const handleDocumentRemove = (id: number) => {
    setRequiredDocuments((previous) => previous.filter((item) => item.id !== id))
  }

  const handleMemoSelect = (item: StageAttachment) => {
    setNoteMemos((previous) => previous.filter((entry) => entry.id !== item.id))
    setRequiredMemos((previous) => {
      if (previous.some((entry) => entry.id === item.id)) return previous
      return [...previous, item]
    })
  }

  const handleMemoRemove = (id: number) => {
    setRequiredMemos((previous) => previous.filter((item) => item.id !== id))
  }

  const handleNoteAttachmentSelect = (item: StageAttachment) => {
    const isRequired =
      item.type === 'memo'
        ? requiredMemos.some((entry) => entry.id === item.id)
        : requiredDocuments.some((entry) => entry.id === item.id)
    if (isRequired) return
    if (item.type === 'memo') {
      setNoteMemos((previous) => {
        if (previous.some((entry) => entry.id === item.id)) return previous
        return [...previous, item]
      })
    } else {
      setNoteDocuments((previous) => {
        if (previous.some((entry) => entry.id === item.id)) return previous
        return [...previous, item]
      })
    }
  }

  const handleNoteAttachmentRemove = (item: StageAttachment) => {
    if (item.type === 'memo') {
      setNoteMemos((previous) => previous.filter((entry) => entry.id !== item.id))
    } else {
      setNoteDocuments((previous) => previous.filter((entry) => entry.id !== item.id))
    }
  }

  const selectedDocuments = useMemo(
    () => mergeAttachmentLists(requiredDocuments, noteDocuments),
    [requiredDocuments, noteDocuments]
  )
  const selectedMemos = useMemo(
    () => mergeAttachmentLists(requiredMemos, noteMemos),
    [requiredMemos, noteMemos]
  )
  const noteAttachments = useMemo(
    () => mergeAttachmentLists(noteDocuments, noteMemos),
    [noteDocuments, noteMemos]
  )

  const selectedTargetStage = useMemo(() => {
    if (!targetStageSlug) return null
    return stageMap[targetStageSlug] ?? null
  }, [targetStageSlug, stageMap])

  const targetStageRequirements = useMemo((): StageMoveRequirements | null => {
    if (selectedCard?.currentApproval && selectedCard.currentApproval.toStage === targetStageSlug) {
      return {
        requiredRoles: selectedCard.currentApproval.requiredRoles ?? [],
        minRationaleLength: selectedCard.currentApproval.rationaleRequired ?? 1,
        requiredAttachments: selectedCard.currentApproval.requiredAttachments,
      }
    }

    if (!selectedTargetStage?.meta) {
      return {
        requiredRoles: [],
        minRationaleLength: 1,
        requiredAttachments: undefined,
      }
    }

    const meta = selectedTargetStage.meta as Record<string, unknown>
    const workflow = (meta?.['workflow_config'] ?? null) as Record<string, unknown> | null
    const config = (workflow?.['config'] ?? null) as Record<string, unknown> | null
    if (!config) {
      return {
        requiredRoles: [] as string[],
        minRationaleLength: 1,
        requiredAttachments: undefined,
      }
    }

    const configRecord = config as Record<string, unknown>
    const requiredRolesRaw = configRecord['required_roles']
    const levelRolesRaw = configRecord['levels']
    const requiredDocsRaw = configRecord['required_documents']
    const rationaleRequiredRaw = configRecord['rationale_required']
    const requiredAttachments = normaliseAttachmentRequirements(requiredDocsRaw)

    const rolesFromConfig = Array.isArray(requiredRolesRaw)
      ? requiredRolesRaw.filter((role: unknown): role is string => typeof role === 'string')
      : []
    const rolesFromLevels = Array.isArray(levelRolesRaw)
      ? levelRolesRaw
          .flatMap((level) =>
            Array.isArray((level as Record<string, unknown>)?.required_roles)
              ? ((level as Record<string, unknown>).required_roles as unknown[])
              : []
          )
          .filter((role): role is string => typeof role === 'string')
      : []
    const requiredRoles = Array.from(new Set([...rolesFromConfig, ...rolesFromLevels]))
    const minRationale =
      typeof rationaleRequiredRaw === 'number' && rationaleRequiredRaw > 0
        ? rationaleRequiredRaw
        : 1

    return {
      requiredRoles,
      minRationaleLength: minRationale,
      requiredAttachments,
    }
  }, [selectedCard?.currentApproval, selectedTargetStage, targetStageSlug])

  const targetStageName = useMemo(() => {
    if (!targetStageSlug) return ''
    const info = stageMap[targetStageSlug]
    return info ? formatStageName(info) : formatStageName({ slug: targetStageSlug })
  }, [targetStageSlug, stageMap])
  const attachmentRequirements = targetStageRequirements?.requiredAttachments
  const documentRequirementSignature = (attachmentRequirements?.documents ?? []).join('|')
  const memoRequirementSignature = (attachmentRequirements?.memos ?? []).join('|')
  const documentOptions = useMemo(() => {
    const map = new Map<number, StageAttachment>()
    const activeCard = selectedCard
    const companyTarget = activeCard
      ? { ticker: activeCard.ticker, companyId: activeCard.id }
      : null
    requiredDocumentsQuery.data?.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (!attachmentMatchesCompany(item, companyTarget)) return
        map.set(item.id, item)
      })
    })
    requiredDocuments.forEach((item) => map.set(item.id, item))
    return Array.from(map.values())
  }, [requiredDocumentsQuery.data, requiredDocuments, selectedCard])
  const memoOptions = useMemo(() => {
    const map = new Map<number, StageAttachment>()
    const activeCard = selectedCard
    const companyTarget = activeCard
      ? { ticker: activeCard.ticker, companyId: activeCard.id }
      : null
    requiredMemosQuery.data?.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (!attachmentMatchesCompany(item, companyTarget)) return
        map.set(item.id, item)
      })
    })
    requiredMemos.forEach((item) => map.set(item.id, item))
    return Array.from(map.values())
  }, [requiredMemosQuery.data, requiredMemos, selectedCard])
  const reactivationDocumentOptions = useMemo(() => {
    const map = new Map<number, StageAttachment>()
    const card = reactivationCard
    const companyTarget = card ? { ticker: card.ticker, companyId: card.id } : null
    reactivationDocumentsQuery.data?.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (!attachmentMatchesCompany(item, companyTarget)) return
        map.set(item.id, item)
      })
    })
    return Array.from(map.values())
  }, [reactivationDocumentsQuery.data, reactivationCard])
  const reactivationMemoOptions = useMemo(() => {
    const map = new Map<number, StageAttachment>()
    const card = reactivationCard
    const companyTarget = card ? { ticker: card.ticker, companyId: card.id } : null
    reactivationMemosQuery.data?.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (!attachmentMatchesCompany(item, companyTarget)) return
        map.set(item.id, item)
      })
    })
    return Array.from(map.values())
  }, [reactivationMemosQuery.data, reactivationCard])
  const filteredDocumentOptions = useMemo(
    () => filterAttachmentsByRequirements(documentOptions, 'document', attachmentRequirements),
    [documentOptions, attachmentRequirements]
  )
  const filteredMemoOptions = useMemo(
    () => filterAttachmentsByRequirements(memoOptions, 'memo', attachmentRequirements),
    [memoOptions, attachmentRequirements]
  )
  const optionalCombinedAttachmentOptions = useMemo(() => {
    const map = new Map<string, StageAttachment>()
    const activeCard = selectedCard
    const companyTarget = activeCard
      ? { ticker: activeCard.ticker, companyId: activeCard.id }
      : null
    optionalDocumentsQuery.data?.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (!attachmentMatchesCompany(item, companyTarget)) return
        map.set(`document-${item.id}`, item)
      })
    })
    optionalMemosQuery.data?.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (!attachmentMatchesCompany(item, companyTarget)) return
        map.set(`memo-${item.id}`, item)
      })
    })
    return Array.from(map.values())
  }, [optionalDocumentsQuery.data, optionalMemosQuery.data, selectedCard])
  const requiredAttachmentTokens = useMemo(
    () => getCombinedRequirementTokens(attachmentRequirements),
    [attachmentRequirements]
  )
  const combinedAttachmentOptions = useMemo(
    () => [...documentOptions, ...memoOptions],
    [documentOptions, memoOptions]
  )
  const allAttachmentOptions = useMemo(
    () => mergeAttachmentLists(combinedAttachmentOptions, optionalCombinedAttachmentOptions),
    [combinedAttachmentOptions, optionalCombinedAttachmentOptions]
  )
  const requiredAttachmentsOptions = useMemo(
    () => filterAttachmentsByTokens(allAttachmentOptions, requiredAttachmentTokens),
    [allAttachmentOptions, requiredAttachmentTokens]
  )
  const requiredAttachmentKeys = useMemo(() => {
    const keys = new Set<string>()
    requiredDocuments.forEach((item) => keys.add(`${item.type}-${item.id}`))
    requiredMemos.forEach((item) => keys.add(`${item.type}-${item.id}`))
    return keys
  }, [requiredDocuments, requiredMemos])
  const noteAttachmentOptions = useMemo(() => {
    const map = new Map<string, StageAttachment>()
    optionalCombinedAttachmentOptions.forEach((item) => {
      const key = `${item.type}-${item.id}`
      if (requiredAttachmentKeys.has(key)) return
      map.set(key, item)
    })
    noteAttachments.forEach((item) => map.set(`${item.type}-${item.id}`, item))
    return Array.from(map.values())
  }, [optionalCombinedAttachmentOptions, requiredAttachmentKeys, noteAttachments])
  const reactivationAttachmentRequirements = useMemo(
    () => getStageRequiredAttachments(stageMap[REACTIVATION_TARGET_SLUG]),
    [stageMap]
  )
  const filteredReactivationDocumentOptions = useMemo(
    () =>
      filterAttachmentsByRequirements(
        reactivationDocumentOptions,
        'document',
        reactivationAttachmentRequirements
      ),
    [reactivationDocumentOptions, reactivationAttachmentRequirements]
  )
  const filteredReactivationMemoOptions = useMemo(
    () =>
      filterAttachmentsByRequirements(
        reactivationMemoOptions,
        'memo',
        reactivationAttachmentRequirements
      ),
    [reactivationMemoOptions, reactivationAttachmentRequirements]
  )
  const reactivationCombinedAttachmentOptions = useMemo(
    () => [...reactivationDocumentOptions, ...reactivationMemoOptions],
    [reactivationDocumentOptions, reactivationMemoOptions]
  )
  const reactivationRequiredTokens = useMemo(
    () => getCombinedRequirementTokens(reactivationAttachmentRequirements),
    [reactivationAttachmentRequirements]
  )
  const reactivationRequiredAttachmentOptions = useMemo(() => {
    return filterAttachmentsByTokens(
      reactivationCombinedAttachmentOptions,
      reactivationRequiredTokens
    )
  }, [reactivationCombinedAttachmentOptions, reactivationRequiredTokens])
  const reactivationMoveMutation = useMutation({
    mutationFn: async (input: {
      ticker: string
      exchange: string
      companyId: string
      primaryAnalystId: number
      secondaryAnalystId: number
      rationale: string
      attachments?: { documents?: AttachmentCollectionsPayload }
    }) => {
      const payload: MoveCompanyRequest = {
        rationale: input.rationale,
        primary_analyst: [input.primaryAnalystId],
        secondary_analyst: [input.secondaryAnalystId],
      }

      if (input.attachments?.documents) {
        payload.documents = input.attachments.documents
      }

      return coverageService.moveCompanyToStage(
        input.ticker,
        input.exchange,
        input.companyId,
        'WATCHLIST',
        payload
      )
    },
    onSuccess: (_response, variables) => {
      notify.success({
        title: 'Re-added to Watchlist',
        description: `${formatTickerWithExchange(variables.ticker, variables.exchange)} submitted with updated analysts.`,
      })
      closeReactivationModal()
      void queryClient.invalidateQueries({ queryKey: ['pipeline', 'board'] })
      void queryClient.invalidateQueries({ queryKey: ['pipeline', 'timeline'] })
      void queryClient.invalidateQueries({ queryKey: ['approvals', 'list'], exact: false })
    },
    onError: (error: unknown) => {
      let description = 'Unable to submit reactivation request.'
      if (isAxiosError(error)) {
        const data = error.response?.data
        if (data && typeof data === 'object') {
          if ('message' in data && typeof data.message === 'string') {
            description = data.message
          } else if ('detail' in data && typeof data.detail === 'string') {
            description = data.detail
          }
        }
      }
      notify.error({ title: 'Request failed', description })
    },
  })
  useEffect(() => {
    if (!attachmentRequirements?.documents?.length) return
    setRequiredDocuments((previous) =>
      previous.filter((item) =>
        attachmentMatchesRequirements(item, 'document', attachmentRequirements)
      )
    )
  }, [attachmentRequirements, documentRequirementSignature])
  useEffect(() => {
    if (!attachmentRequirements?.memos?.length) return
    setRequiredMemos((previous) =>
      previous.filter((item) => attachmentMatchesRequirements(item, 'memo', attachmentRequirements))
    )
  }, [attachmentRequirements, memoRequirementSignature])

  const refetchStageAttachments = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['attachments'] })
    await Promise.allSettled([
      requiredDocumentsQuery.refetch(),
      requiredMemosQuery.refetch(),
      optionalDocumentsQuery.refetch(),
      optionalMemosQuery.refetch(),
    ])
  }, [
    queryClient,
    optionalDocumentsQuery,
    optionalMemosQuery,
    requiredDocumentsQuery,
    requiredMemosQuery,
  ])

  const canEarlyTerminateOverall = useMemo(
    () => Boolean(stageMap[EARLY_TERMINATION_SLUG]),
    [stageMap]
  )
  const canEarlyTerminateInDialog =
    canEarlyTerminateOverall &&
    !isDirectEarlyTermination &&
    selectedStage?.slug !== EARLY_TERMINATION_SLUG
  const documentQueryInfo = {
    isLoading: requiredDocumentsQuery.isLoading && !requiredDocumentsQuery.data,
    isFetchingNextPage: requiredDocumentsQuery.isFetchingNextPage,
    hasNextPage: Boolean(requiredDocumentsQuery.hasNextPage),
    fetchNextPage: () => {
      void requiredDocumentsQuery.fetchNextPage()
    },
    errorMessage: requiredDocumentsQuery.isError
      ? 'Unable to load documents. Please try again.'
      : undefined,
  }
  const memoQueryInfo = {
    isLoading: requiredMemosQuery.isLoading && !requiredMemosQuery.data,
    isFetchingNextPage: requiredMemosQuery.isFetchingNextPage,
    hasNextPage: Boolean(requiredMemosQuery.hasNextPage),
    fetchNextPage: () => {
      void requiredMemosQuery.fetchNextPage()
    },
    errorMessage: requiredMemosQuery.isError
      ? 'Unable to load memos. Please try again.'
      : undefined,
  }
  const attachmentQueryInfo = {
    isLoading:
      (optionalDocumentsQuery.isLoading && !optionalDocumentsQuery.data) ||
      (optionalMemosQuery.isLoading && !optionalMemosQuery.data),
    isFetchingNextPage:
      optionalDocumentsQuery.isFetchingNextPage || optionalMemosQuery.isFetchingNextPage,
    hasNextPage: Boolean(optionalDocumentsQuery.hasNextPage || optionalMemosQuery.hasNextPage),
    fetchNextPage: () => {
      if (optionalDocumentsQuery.hasNextPage) {
        void optionalDocumentsQuery.fetchNextPage()
      }
      if (optionalMemosQuery.hasNextPage) {
        void optionalMemosQuery.fetchNextPage()
      }
    },
    errorMessage:
      optionalDocumentsQuery.isError || optionalMemosQuery.isError
        ? 'Unable to load attachments. Please try again.'
        : undefined,
  }
  const reactivationDocumentQueryInfo = {
    isLoading: reactivationDocumentsQuery.isLoading && !reactivationDocumentsQuery.data,
    isFetchingNextPage: reactivationDocumentsQuery.isFetchingNextPage,
    hasNextPage: Boolean(reactivationDocumentsQuery.hasNextPage),
    fetchNextPage: () => {
      void reactivationDocumentsQuery.fetchNextPage()
    },
    errorMessage: reactivationDocumentsQuery.isError
      ? 'Unable to load documents. Please try again.'
      : undefined,
  }
  const reactivationMemoQueryInfo = {
    isLoading: reactivationMemosQuery.isLoading && !reactivationMemosQuery.data,
    isFetchingNextPage: reactivationMemosQuery.isFetchingNextPage,
    hasNextPage: Boolean(reactivationMemosQuery.hasNextPage),
    fetchNextPage: () => {
      void reactivationMemosQuery.fetchNextPage()
    },
    errorMessage: reactivationMemosQuery.isError
      ? 'Unable to load memos. Please try again.'
      : undefined,
  }
  const reactivationAttachmentQueryInfo = {
    isLoading:
      (reactivationDocumentsQuery.isLoading && !reactivationDocumentsQuery.data) ||
      (reactivationMemosQuery.isLoading && !reactivationMemosQuery.data),
    isFetchingNextPage:
      reactivationDocumentsQuery.isFetchingNextPage || reactivationMemosQuery.isFetchingNextPage,
    hasNextPage: Boolean(
      reactivationDocumentsQuery.hasNextPage || reactivationMemosQuery.hasNextPage
    ),
    fetchNextPage: () => {
      if (reactivationDocumentsQuery.hasNextPage) {
        void reactivationDocumentsQuery.fetchNextPage()
      }
      if (reactivationMemosQuery.hasNextPage) {
        void reactivationMemosQuery.fetchNextPage()
      }
    },
    errorMessage:
      reactivationDocumentsQuery.isError || reactivationMemosQuery.isError
        ? 'Unable to load attachments. Please try again.'
        : undefined,
  }

  const buildStageMoveAttachments = ():
    | {
        documents: AttachmentCollectionsPayload
      }
    | undefined => {
    const attachments = mergeAttachmentLists(selectedDocuments, selectedMemos)
    const documentsPayload = attachmentsToRecord(attachments)
    if (!Object.keys(documentsPayload).length) {
      return undefined
    }
    return {
      documents: documentsPayload,
    }
  }

  const stageMoveMutation = useMutation({
    mutationFn: async (input: StageMoveMutationInput) => {
      const payload: MoveCompanyRequest = {
        rationale: input.rationale,
      }

      const documents = input.attachments?.documents
      if (documents) {
        payload.documents = documents
      }

      return coverageService.moveCompanyToStage(
        input.ticker,
        input.exchange,
        input.companyId,
        input.newStageSlug,
        payload
      )
    },
    onSuccess: (response) => {
      const message =
        response?.message ||
        (response?.status === 'pending'
          ? 'Stage change request submitted for approval.'
          : 'Stage updated successfully.')

      notify.success({
        title: 'Request submitted',
        description: message || 'Stage change request is pending approval',
      })

      setSubmissionError(null)
      resetDialog()
      void queryClient.invalidateQueries({ queryKey: ['pipeline', 'board'] })
      void queryClient.invalidateQueries({ queryKey: ['pipeline', 'timeline'] })
      void queryClient.invalidateQueries({ queryKey: ['approvals', 'list'], exact: false })
      refreshAllStages()
    },
    onError: (error: unknown) => {
      const defaultMessage = 'Unable to submit stage move. Please try again.'
      if (typeof window !== 'undefined') {
        console.error('Stage move failed', error)
      }

      let message = defaultMessage
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response
        const data = response?.data
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof data.message === 'string'
        ) {
          message = data.message
        } else if (
          data &&
          typeof data === 'object' &&
          'detail' in data &&
          typeof data.detail === 'string'
        ) {
          message = data.detail
        }
      }

      setSubmissionError(message)
      notify.error({
        title: 'Request failed',
        description: message || 'Unable to submit stage change',
      })
    },
  })

  const cancelRequestMutation = useMutation({
    mutationFn: async (input: { requestId: number; rationale?: string }) => {
      return approvalsService.decide({
        request_ids: [input.requestId],
        decision: 'cancelled',
        rationale: input.rationale,
      })
    },
    onSuccess: (response) => {
      const summary = summarizeApprovalDecisionResponse(response)
      if (summary.errors.length) {
        notify.error({ title: 'Cancellation failed', description: summary.errors[0] })
        return
      }
      if (summary.notes.length) {
        notify.warning({ title: 'Request not actionable', description: summary.notes[0] })
        return
      }

      notify.success({
        title: 'Request cancelled',
        description: 'The stage move request has been withdrawn.',
      })
      setCancelTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['pipeline', 'board'] })
      void queryClient.invalidateQueries({ queryKey: ['pipeline', 'timeline'] })
      void queryClient.invalidateQueries({ queryKey: ['approvals', 'list'], exact: false })
      refreshAllStages()
    },
    onError: (error: unknown) => {
      let message = 'Unable to cancel the request right now.'

      if (isAxiosError(error)) {
        const data = error.response?.data

        if (data && typeof data === 'object') {
          if ('message' in data && typeof data.message === 'string') {
            message = data.message
          } else if ('detail' in data && typeof data.detail === 'string') {
            message = data.detail
          }
        }
      }

      notify.error({
        title: 'Cancellation failed',
        description: message,
      })
    },
  })
  const isCancelling = cancelRequestMutation.isPending

  const dismissRequestMutation = useMutation({
    mutationFn: async (input: { requestId: number; rationale?: string }) => {
      return approvalsService.decide({
        request_ids: [input.requestId],
        decision: 'dismissed',
        rationale: input.rationale,
      })
    },
    onSuccess: (response) => {
      const summary = summarizeApprovalDecisionResponse(response)
      if (summary.errors.length) {
        notify.error({ title: 'Dismissal failed', description: summary.errors[0] })
        return
      }
      if (summary.notes.length) {
        notify.warning({ title: 'Request not actionable', description: summary.notes[0] })
        return
      }

      notify.success({
        title: 'Request dismissed',
        description: 'The rejected request has been dismissed.',
      })
      setDismissTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['pipeline', 'board'] })
      void queryClient.invalidateQueries({ queryKey: ['pipeline', 'timeline'] })
      void queryClient.invalidateQueries({ queryKey: ['approvals', 'list'], exact: false })
      refreshAllStages()
    },
    onError: (error: unknown) => {
      let message = 'Unable to dismiss the request right now.'
      if (isAxiosError(error)) {
        const data = error.response?.data
        if (data && typeof data === 'object') {
          if ('message' in data && typeof data.message === 'string') {
            message = data.message
          } else if ('detail' in data && typeof data.detail === 'string') {
            message = data.detail
          }
        }
      }
      notify.error({
        title: 'Dismissal failed',
        description: message,
      })
    },
  })
  const isDismissing = dismissRequestMutation.isPending

  const handleCancelRequestFromDetails = useCallback(
    (card: PipelineCard) => {
      if (!card.currentApproval) return
      setRequestDetailsCard(null)
      cancelRequestMutation.mutate({ requestId: card.currentApproval.id })
    },
    [cancelRequestMutation]
  )

  const handleSubmit = () => {
    if (!selectedCard || !selectedStage || !targetStageSlug) return
    const trimmed = rationale.trim()
    const minLength = targetStageRequirements?.minRationaleLength ?? 1
    if (trimmed.length < minLength) {
      setRationaleTouched(true)
      setSubmissionError(`Rationale must be at least ${minLength} characters.`)
      return
    }

    const missingTokens = getMissingRequiredAttachmentTokens(
      mergeAttachmentLists(selectedDocuments, selectedMemos),
      attachmentRequirements
    )
    if (missingTokens.length) {
      setSubmissionError(`Attach required items: ${missingTokens.join(', ')}`)
      return
    }

    const attachments = buildStageMoveAttachments()

    stageMoveMutation.mutate({
      ticker: selectedCard.ticker,
      exchange: selectedCard.exchange,
      companyId: String(selectedCard.id),
      newStageSlug: targetStageSlug,
      rationale: trimmed,
      attachments,
    })
  }

  const handleTerminate = () => {
    if (!selectedCard || !selectedStage) return
    const trimmed = rationale.trim()
    if (trimmed.length === 0) {
      setRationaleTouched(true)
      setSubmissionError('Add a brief rationale before requesting early termination.')
      return
    }

    const terminationStage = stageMap[EARLY_TERMINATION_SLUG]
    if (!terminationStage) {
      notify.error({
        title: 'Termination unavailable',
        description: 'Early termination is not configured',
      })
      return
    }

    const attachments = buildStageMoveAttachments()

    stageMoveMutation.mutate({
      ticker: selectedCard.ticker,
      exchange: selectedCard.exchange,
      companyId: String(selectedCard.id),
      newStageSlug: EARLY_TERMINATION_SLUG,
      rationale: trimmed,
      attachments,
    })
  }

  const effectiveView = TIMELINE_ENABLED ? view : 'kanban'
  const isInitialPipelineLoad = pipelineQuery.isLoading

  if (isInitialPipelineLoad && activeTab === 'pipeline') {
    return (
      <div className="space-y-6">
        <PipelineToolbar
          filter={searchInput}
          onFilterChange={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          analyst={analyst}
          onAnalystChange={setAnalyst}
          view={effectiveView}
          onViewChange={setView}
          analystOptions={analystOptions}
          onRefresh={() => {
            void pipelineQuery.refetch()
            refreshAllStages()
          }}
          showViewToggle={TIMELINE_ENABLED}
        />
        <PipelineBoardSkeleton />
      </div>
    )
  }

  if (pipelineQuery.isError && activeTab === 'pipeline') {
    return (
      <div className="space-y-6">
        <PipelineToolbar
          filter={searchInput}
          onFilterChange={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          analyst={analyst}
          onAnalystChange={setAnalyst}
          view={effectiveView}
          onViewChange={setView}
          analystOptions={analystOptions}
          onRefresh={() => {
            void pipelineQuery.refetch()
            refreshAllStages()
          }}
          showViewToggle={TIMELINE_ENABLED}
        />
        <PipelineErrorState onRetry={() => pipelineQuery.refetch()} />
      </div>
    )
  }

  const timelineEntries = timelineQuery.data?.entries ?? []
  const isTimelineLoading = effectiveView === 'timeline' && timelineQuery.isFetching
  const cancelTicker = cancelTarget?.card.ticker ?? ''
  const cancelTickerLabel = cancelTarget
    ? formatTickerWithExchange(cancelTarget.card.ticker, cancelTarget.card.exchange)
    : ''
  const cancelStageName = cancelTarget ? formatStageName(cancelTarget.stage) : ''
  const cancelDescription = cancelTicker
    ? `This will withdraw the pending approval request for ${cancelTickerLabel} to move out of ${cancelStageName || 'its current stage'}.`
    : 'This will withdraw the selected stage move request.'
  const dismissTicker = dismissTarget?.card.ticker ?? ''
  const dismissTickerLabel = dismissTarget
    ? formatTickerWithExchange(dismissTarget.card.ticker, dismissTarget.card.exchange)
    : ''
  const dismissStageName = dismissTarget ? formatStageName(dismissTarget.stage) : ''
  const dismissDescription = dismissTicker
    ? `This will dismiss the rejected request for ${dismissTickerLabel} and return it to ${dismissStageName || 'its current stage'}.`
    : 'This will dismiss the rejected request and return the card to its normal state.'
  const reactivationTitle = reactivationCard
    ? `Re-add ${formatTickerWithExchange(reactivationCard.ticker, reactivationCard.exchange)} to Watchlist`
    : 'Re-add to Watchlist'
  const terminationLabel =
    reactivationStage?.slug === EARLY_TERMINATION_SLUG
      ? 'early terminated'
      : reactivationStage?.slug === 'EXITED'
        ? 'exited'
        : null
  const stageAssignmentMeta = (reactivationCard?.meta?.stage_assignment_meta ?? {}) as Record<
    string,
    unknown
  >
  const terminationDateRaw =
    (reactivationCard?.meta?.stage_assignment_updated_at as string | undefined) ??
    reactivationCard?.currentApproval?.decisionMeta?.decidedAt ??
    reactivationCard?.currentApproval?.submittedAt ??
    null
  const terminationDate =
    terminationDateRaw && !Number.isNaN(Date.parse(terminationDateRaw))
      ? new Date(terminationDateRaw).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null
  const terminationReasonFromStageMeta =
    typeof stageAssignmentMeta?.reason === 'string' && stageAssignmentMeta.reason.trim().length
      ? stageAssignmentMeta.reason.trim()
      : undefined
  const terminationReason =
    terminationReasonFromStageMeta ??
    reactivationCard?.currentApproval?.decisionMeta?.comment ??
    reactivationCard?.currentApproval?.rationale ??
    null
  const reactivationInfoBox =
    terminationLabel && reactivationCard
      ? `This company was ${terminationLabel} on ${terminationDate ?? '—'} for: ${
          terminationReason ?? 'No reason provided.'
        }`
      : undefined
  const reactivationRationalePlaceholder = 'Explain why this company should be reconsidered...'
  const isStageColumnsLoading = stages.some((stage) => {
    const state = stageDataMap[stage.slug]
    return !state || (state.isLoading && state.items.length === 0)
  })
  const showBoardSkeleton =
    effectiveView === 'kanban' && (pipelineQuery.isFetching || isStageColumnsLoading)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex">
          <div className="inline-flex h-9 gap-1 rounded-lg bg-gray-200 p-1">
            {(['pipeline', 'maintenance'] as PipelineTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  'h-7 rounded-md px-4 text-xs transition-all',
                  activeTab === tab
                    ? 'bg-white font-semibold text-gray-900 shadow-sm'
                    : 'font-normal text-gray-500 hover:text-gray-800'
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'pipeline' ? 'Origination' : 'Maintenance'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <PipelineToolbar
          filter={searchInput}
          onFilterChange={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          analyst={analyst}
          onAnalystChange={setAnalyst}
          view={effectiveView}
          onViewChange={setView}
          analystOptions={analystOptions}
          onRefresh={() => {
            void pipelineQuery.refetch()
            refreshAllStages()
          }}
          showViewToggle={TIMELINE_ENABLED && activeTab === 'pipeline'}
        />
      ) : null}

      {activeTab === 'maintenance' ? (
        <MaintenanceTab isActive={activeTab === 'maintenance'} />
      ) : effectiveView === 'kanban' ? (
        showBoardSkeleton ? (
          <PipelineBoardSkeleton />
        ) : (
          <PipelineBoard
            stages={stages}
            data={filteredBoardData}
            onCardSelect={handleCardSelect}
            onEarlyTerminate={handleEarlyTerminateClick}
            onCancelRequest={handleCancelRequestClick}
            onDismissRequest={handleDismissRequestClick}
            onViewRequest={handleViewRequestDetails}
            onReactivate={handleReactivateClick}
            currentUserId={currentUserId}
            stageStates={stageStates}
            onLoadMoreStage={handleLoadMoreStage}
          />
        )
      ) : (
        <PipelineTimeline entries={timelineEntries} isLoading={isTimelineLoading} />
      )}

      <StageMoveDialog
        open={dialogOpen}
        onClose={resetDialog}
        onSubmit={handleSubmit}
        onEarlyTerminate={handleTerminate}
        rationale={rationale}
        rationaleTouched={rationaleTouched}
        onRationaleChange={setRationale}
        onRationaleTouch={() => setRationaleTouched(true)}
        card={selectedCard}
        fromStage={selectedStage ? formatStageName(selectedStage) : ''}
        targetStageSlug={targetStageSlug}
        targetStageName={targetStageName}
        requirements={targetStageRequirements}
        isSubmitting={stageMoveMutation.isPending}
        errorMessage={submissionError}
        canEarlyTerminate={canEarlyTerminateInDialog}
        attachmentOptions={noteAttachmentOptions}
        noteAttachments={noteAttachments}
        onNoteAttachmentSelect={handleNoteAttachmentSelect}
        onNoteAttachmentRemove={handleNoteAttachmentRemove}
        requiredAttachmentSearch={requiredAttachmentSearch}
        onRequiredAttachmentSearchChange={setRequiredAttachmentSearch}
        optionalAttachmentSearch={optionalAttachmentSearch}
        onOptionalAttachmentSearchChange={setOptionalAttachmentSearch}
        attachmentQueryInfo={attachmentQueryInfo}
        selectedDocuments={requiredDocuments}
        selectedMemos={requiredMemos}
        onDocumentSelect={handleDocumentSelect}
        onDocumentRemove={handleDocumentRemove}
        onMemoSelect={handleMemoSelect}
        onMemoRemove={handleMemoRemove}
        documentOptions={filteredDocumentOptions}
        memoOptions={filteredMemoOptions}
        documentsQueryInfo={documentQueryInfo}
        memosQueryInfo={memoQueryInfo}
        requiredAttachmentOptions={requiredAttachmentsOptions}
        companyId={selectedCard?.id}
        onAttachmentsRefetch={refetchStageAttachments}
      />
      <CompanyMoveModal
        isOpen={isReactivationModalOpen}
        onClose={closeReactivationModal}
        mode="watchlist"
        titleOverride={reactivationTitle}
        infoBoxText={reactivationInfoBox}
        rationalePlaceholder={reactivationRationalePlaceholder}
        companyData={{
          id:
            typeof reactivationCard?.id === 'number'
              ? reactivationCard.id
              : reactivationCard?.id
                ? Number(reactivationCard.id)
                : undefined,
          ticker: reactivationCard?.ticker ?? '',
          name: reactivationCard?.company ?? '',
        }}
        primaryAnalysts={reactivationPrimaryAnalysts}
        secondaryAnalysts={reactivationSecondaryAnalysts}
        isLoadingPrimaryAnalysts={isLoadingReactivationPrimaryAnalysts}
        isLoadingSecondaryAnalysts={isLoadingReactivationSecondaryAnalysts}
        attachmentRequirements={reactivationAttachmentRequirements}
        attachmentOptions={reactivationCombinedAttachmentOptions}
        attachmentSearch={reactivationAttachmentSearch}
        onAttachmentSearchChange={setReactivationAttachmentSearch}
        attachmentQueryInfo={reactivationAttachmentQueryInfo}
        documentOptions={filteredReactivationDocumentOptions}
        memoOptions={filteredReactivationMemoOptions}
        documentsQueryInfo={reactivationDocumentQueryInfo}
        memosQueryInfo={reactivationMemoQueryInfo}
        requiredAttachmentOptions={reactivationRequiredAttachmentOptions}
        isSubmitting={reactivationMoveMutation.isPending}
        onSubmit={(data, attachments) => {
          const ticker = reactivationCard?.ticker
          if (!ticker) {
            notify.error({ title: 'No company selected', description: 'Select a company first.' })
            return
          }
          if (!('primaryAnalyst' in data) || !('secondaryAnalyst' in data) || !('screen' in data)) {
            notify.error({
              title: 'Incomplete form',
              description: 'Select primary/secondary analysts and rationale.',
            })
            return
          }

          reactivationMoveMutation.mutate({
            ticker,
            exchange: reactivationCard.exchange,
            companyId: String(reactivationCard.id),
            primaryAnalystId: Number(data.primaryAnalyst),
            secondaryAnalystId: Number(data.secondaryAnalyst),
            rationale: data.screen.trim(),
            attachments,
          })
        }}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isCancelling) {
            setCancelTarget(null)
          }
        }}
        onCancel={() => {
          if (!isCancelling) {
            setCancelTarget(null)
          }
        }}
        title="Cancel stage move request?"
        description={cancelDescription}
        cancelLabel="Keep Request"
        confirmLabel="Cancel Request"
        confirmLoadingLabel="Cancelling…"
        confirmVariant="destructive"
        isConfirming={isCancelling}
        onConfirm={() => {
          if (!cancelTarget?.card.currentApproval) {
            setCancelTarget(null)
            return
          }
          cancelRequestMutation.mutate({
            requestId: cancelTarget.card.currentApproval.id,
          })
        }}
      />
      <ConfirmDialog
        open={dismissDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDismissing) {
            setDismissTarget(null)
          }
        }}
        onCancel={() => {
          if (!isDismissing) {
            setDismissTarget(null)
          }
        }}
        title="Dismiss rejected request?"
        description={dismissDescription}
        cancelLabel="Keep Request"
        confirmLabel="Dismiss Request"
        confirmLoadingLabel="Dismissing…"
        confirmVariant="destructive"
        isConfirming={isDismissing}
        onConfirm={() => {
          if (!dismissTarget?.card.currentApproval) {
            setDismissTarget(null)
            return
          }
          dismissRequestMutation.mutate({
            requestId: dismissTarget.card.currentApproval.id,
          })
        }}
      />
      <StageRequestDetailsDialog
        open={Boolean(requestDetailsCard)}
        card={requestDetailsCard}
        targetStageName={
          requestDetailsCard?.currentApproval
            ? formatStageName(
                stageMap[requestDetailsCard.currentApproval.toStage] ?? {
                  slug: requestDetailsCard.currentApproval.toStage,
                }
              )
            : undefined
        }
        onClose={() => setRequestDetailsCard(null)}
        onCancelRequest={handleCancelRequestFromDetails}
        onEarlyTerminate={handleEarlyTerminateFromDetails}
        canEarlyTerminate={canEarlyTerminateOverall}
      />
    </div>
  )
}
