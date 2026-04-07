'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { PortfolioHoldings } from './components/PortfolioHoldings'
import { WatchList } from './components/WatchList'
import { Universe } from './components/Universe'
import { AnalystAssignmentModal } from './components/AnalystAssignmentModal'
import { AnalystReassignmentWarningModal } from './components/AnalystReassignmentWarningModal'
import {
  usePortfolioHoldings,
  useWatchlistCompanies,
  useUniverseCompanies,
  useAnalysts,
  useUpdateStageAssignmentAnalysts,
  coverageKeys,
  transformCompanyToWatchlistBaseRow,
} from './lib/queries'
import { buildWatchlistAnalystFieldsFromRecord } from './lib/helper'
import type { PipelineStageCompanyRecordApi } from '@/services/api/pipeline.service'
import { useCoverageSearch } from './lib/search-filter-helpers'
import {
  attachmentMatchesCompany,
  filterAttachmentsByRequirements,
  filterAttachmentsByTokens,
  getCombinedRequirementTokens,
  useAllLinkedDocsMemoQuery,
  type StageAttachment,
} from '@/lib/attachments'
import { usePipelineStages } from '@/lib/hooks/usePipelineStages'
import { getStageRequiredAttachments } from '@/lib/pipelineStageUtils'
import { coverageService } from '@/services/api/coverage.service'
import notify from '@/lib/notifications'
import type {
  AttachmentCollectionsPayload,
  AttachmentCompanyState,
  MoveCompanyRequest,
  PortfolioAnalystCompanyState,
  PortfolioHoldingsTableRow,
  UniverseTableRow,
  UpdateAnalystSubmissionData,
  WatchListTableData,
} from './lib/types'

export function CoverageContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Global search state for all coverage tabs
  const { searchQuery, setSearchQuery, debouncedQuery, formattedSearchQuery } = useCoverageSearch()
  const queryClient = useQueryClient()

  // Get tab from URL query parameter, default to 'portfolio-holdings'
  const tabFromUrl = searchParams.get('tab') || 'portfolio-holdings'

  // Validate that the tab from URL is valid
  const validTabs = ['portfolio-holdings', 'watch-list', 'universe']
  const initialTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'portfolio-holdings'

  // Active tab state
  const [activeTab, setActiveTab] = useState(initialTab)

  // Attachment search state
  const [attachmentSearch, setAttachmentSearch] = useState('')
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false)
  const [isActiveDiscussionModalOpen, setIsActiveDiscussionModalOpen] = useState(false)
  const [isAnalystAssignmentModalOpen, setIsAnalystAssignmentModalOpen] = useState(false)
  const [analystAssignmentCompany, setAnalystAssignmentCompany] = useState<PortfolioAnalystCompanyState | null>(null)
  const [analystAssignmentSource, setAnalystAssignmentSource] = useState<'portfolio-holdings' | 'watch-list'>('portfolio-holdings')
  const [reassignmentWarning, setReassignmentWarning] = useState<{
    isOpen: boolean
    warnings: string[]
    pendingData: UpdateAnalystSubmissionData | null
  }>({ isOpen: false, warnings: [], pendingData: null })
  const [attachmentCompany, setAttachmentCompany] = useState<AttachmentCompanyState | null>(null)

  // Pagination state for Universe
  const [universePage, setUniversePage] = useState(1)
  const [universePageSize, setUniversePageSize] = useState(10)

  // Pagination state for WatchList
  const [watchlistPage, setWatchlistPage] = useState(1)
  const [watchlistPageSize, setWatchlistPageSize] = useState(10)

  // Pagination state for Portfolio Holdings
  const [portfolioPage, setPortfolioPage] = useState(1)
  const [portfolioPageSize, setPortfolioPageSize] = useState(10)

  // Fetch portfolio holdings from API
  const {
    data: portfolioResponse,
    isLoading,
    error,
    refetch,
  } = usePortfolioHoldings(
    (portfolioPage - 1) * portfolioPageSize,
    portfolioPageSize,
    formattedSearchQuery,
    activeTab === 'portfolio-holdings'
  )

  const portfolioData = (portfolioResponse?.companies as PortfolioHoldingsTableRow[]) || []
  const portfolioTotalCount = portfolioResponse?.total || 0

  // Fetch watchlist companies from API
  const {
    data: watchlistResponse,
    isLoading: isLoadingWatchlist,
    isError: isErrorWatchlist,
    refetch: refetchWatchlist
  } = useWatchlistCompanies(
    (watchlistPage - 1) * watchlistPageSize,
    watchlistPageSize,
    formattedSearchQuery,
    activeTab === 'watch-list'
  )

  const watchlistData = useMemo((): WatchListTableData[] => {
    const records = watchlistResponse?.companies as PipelineStageCompanyRecordApi[] | undefined
    if (!records?.length) {
      return []
    }
    return records.map((record) => ({
      ...transformCompanyToWatchlistBaseRow(record),
      ...buildWatchlistAnalystFieldsFromRecord(record),
    }))
  }, [watchlistResponse])

  const watchlistTotalCount = watchlistResponse?.total || 0

  // Fetch universe companies from API
  const {
    data: universeResponse,
    isLoading: isLoadingUniverse,
    error: errorUniverse,
    refetch: refetchUniverse
  } = useUniverseCompanies(
    (universePage - 1) * universePageSize,
    universePageSize,
    formattedSearchQuery,
    activeTab === 'universe'
  )

  const universeData = (universeResponse?.companies as UniverseTableRow[]) || []
  const universeTotalCount = universeResponse?.total || 0

  // Fetch analysts
  const attachmentsEnabled =
    (isWatchlistModalOpen || isActiveDiscussionModalOpen) && Boolean(attachmentCompany)
  const shouldLoadAnalysts = isWatchlistModalOpen || isAnalystAssignmentModalOpen
  const { data: primaryAnalysts = [], isLoading: isLoadingPrimaryAnalysts } = useAnalysts(
    'arnie-primary-analyst',
    shouldLoadAnalysts
  )
  const { data: secondaryAnalysts = [], isLoading: isLoadingSecondaryAnalysts } = useAnalysts(
    'arnie-secondary-analyst',
    shouldLoadAnalysts
  )

  // Fetch pipeline stages
  const { data: pipelineStages } = usePipelineStages()
  const companyTarget = useMemo(
    () =>
      attachmentCompany?.id
        ? { companyId: attachmentCompany.id, ticker: attachmentCompany.ticker }
        : null,
    [attachmentCompany]
  )

  // Fetch all attachments (documents and memos)
  const allAttachmentsQuery = useAllLinkedDocsMemoQuery({
    enabled: attachmentsEnabled,
    search: attachmentSearch,
    companyId: attachmentCompany?.id ?? null,
  })

  const refetchCoverageAttachments = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['attachments'] })
    await allAttachmentsQuery.refetch()
  }, [queryClient, allAttachmentsQuery])

  // Process all attachments
  const allAttachments = useMemo(() => {
    const map = new Map<number, StageAttachment>()
    allAttachmentsQuery.data?.pages.forEach((page) => {
      page.items.forEach((item) => {
        if (companyTarget && !attachmentMatchesCompany(item, companyTarget)) return
        map.set(item.id, item)
      })
    })
    return Array.from(map.values())
  }, [companyTarget, allAttachmentsQuery.data])

  // Get stage requirements
  const watchlistStageRequirements = useMemo(
    () => getStageRequiredAttachments(pipelineStages?.['WATCHLIST']),
    [pipelineStages]
  )

  const activeDiscussionStageRequirements = useMemo(
    () => getStageRequiredAttachments(pipelineStages?.['ACTIVE_DISCUSSION']),
    [pipelineStages]
  )

  // Query info for attachments
  const attachmentQueryInfo = {
    isLoading: allAttachmentsQuery.isLoading && !allAttachmentsQuery.data,
    isFetchingNextPage: allAttachmentsQuery.isFetchingNextPage,
    hasNextPage: Boolean(allAttachmentsQuery.hasNextPage),
    fetchNextPage: () => {
      void allAttachmentsQuery.fetchNextPage()
    },
    errorMessage:
      allAttachmentsQuery.error != null
        ? allAttachmentsQuery.error instanceof Error
          ? allAttachmentsQuery.error.message
          : 'Unable to load attachments.'
        : undefined,
  }

  // Required attachments for watchlist
  const requiredTokensWatchlist = useMemo(
    () => getCombinedRequirementTokens(watchlistStageRequirements),
    [watchlistStageRequirements]
  )

  const requiredAttachmentOptionsForWatchlist = useMemo(
    () => filterAttachmentsByTokens(allAttachments, requiredTokensWatchlist),
    [allAttachments, requiredTokensWatchlist]
  )

  // Required attachments for active discussion
  const requiredTokensActiveDiscussion = useMemo(
    () => getCombinedRequirementTokens(activeDiscussionStageRequirements),
    [activeDiscussionStageRequirements]
  )

  const requiredAttachmentOptionsForActiveDiscussion = useMemo(
    () => filterAttachmentsByTokens(allAttachments, requiredTokensActiveDiscussion),
    [allAttachments, requiredTokensActiveDiscussion]
  )

  const updateStageAssignmentAnalystsMutation = useUpdateStageAssignmentAnalysts()

  // Mutation for moving company to watchlist
  const moveToWatchlistMutation = useMutation({
    mutationFn: async (data: {
      ticker: string
      exchange: string
      companyId: string
      primaryAnalystId: number
      secondaryAnalystId: number
      rationale: string
      attachments?: {
        documents?: AttachmentCollectionsPayload
      }
    }) => {
      const payload: MoveCompanyRequest = {
        rationale: data.rationale,
        primary_analyst: [data.primaryAnalystId],
        secondary_analyst: [data.secondaryAnalystId],
      }

      if (data.attachments?.documents) {
        payload.documents = data.attachments.documents
      }

      return await coverageService.moveCompanyToStage(
        data.ticker,
        data.exchange,
        data.companyId,
        'WATCHLIST',
        payload
      )
    },
    onSuccess: (response, variables) => {
      notify.success({
        title: 'Move requested',
        description: `${variables.ticker} submitted for Watchlist approval`,
      })

      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('UNIVERSE') })
      queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('WATCHLIST') })
    },
    onError: (error: any, variables) => {
      console.error('❌ Move to watchlist failed:', error)

      const statusCode = error?.response?.status ?? error?.status
      if (statusCode === 409) {
        notify.error({
          title: 'Request already exists',
          description: 'This company is already in the approval process',
        })
      } else if (statusCode === 400) {
        const errorMessage = error?.response?.data?.detail || error?.response?.data?.message || 'Invalid request data'
        notify.error({ title: 'Invalid request', description: errorMessage })
      } else if (statusCode === 422) {
        notify.error({ title: 'Validation failed', description: 'Please check your input' })
      } else {
        const errorMessage =
          error?.response?.data?.message || error?.message || 'Unknown error occurred'
        notify.error({ title: 'Move failed', description: errorMessage })
      }
    },
  })

  // Mutation for moving company to active discussion
  const moveToActiveDiscussionMutation = useMutation({
    mutationFn: async (data: {
      ticker: string
      exchange: string
      companyId: string
      rationale: string
      attachments?: {
        documents?: AttachmentCollectionsPayload
      }
    }) => {
      const payload: MoveCompanyRequest = {
        rationale: data.rationale,
      }
      if (data.attachments?.documents) {
        payload.documents = data.attachments.documents
      }
      return await coverageService.moveCompanyToStage(
        data.ticker,
        data.exchange,
        data.companyId,
        'ACTIVE_DISCUSSION',
        payload
      )
    },
    onSuccess: (response, variables) => {
      notify.success({
        title: 'Move requested',
        description: `${variables.ticker} submitted for Active Discussion`,
      })

      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('WATCHLIST') })
      queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('ACTIVE_DISCUSSION') })
    },
    onError: (error: any) => {
      console.error('❌ Move to active discussion failed:', error)

      const statusCode = error?.response?.status ?? error?.status
      if (statusCode === 409) {
        const errorMessage = 'This company is already in the approval process'
        notify.error({
          title: 'Request already exists',
          description: errorMessage,
        })
      } else if (statusCode === 400) {
        const errorMessage = error?.response?.data?.message || error?.response?.data?.detail || 'Invalid request data'
        notify.error({ title: 'Invalid request', description: errorMessage })
      } else if (statusCode === 422) {
        const errorMessage = error?.response?.data?.message || error?.response?.data?.detail || 'Please check your input'
        notify.error({ title: 'Validation failed', description: errorMessage })
      } else {
        const errorMessage =
          error?.response?.data?.message || error?.response?.data?.detail || error?.message || 'Unknown error occurred'
        notify.error({ title: 'Move failed', description: errorMessage })
      }
    },
  })

  // Mutation for removing company from watchlist (moving back to universe)
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (vars: { ticker: string; exchange: string; companyId: string }) => {
      return await coverageService.moveCompanyToStage(
        vars.ticker,
        vars.exchange,
        vars.companyId,
        'UNIVERSE',
        {}
      )
    },
    onSuccess: (_response, vars) => {
      notify.success({
        title: 'Removed from watchlist',
        description: `${vars.ticker} has been moved back to Universe`,
      })
      queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('WATCHLIST') })
    },
    onError: (error: any, _ticker) => {
      console.error('❌ Remove from watchlist failed:', error)

      const statusCode = error?.response?.status ?? error?.status
      if (statusCode === 400) {
        const errorMessage = error?.response?.data?.message || error?.response?.data?.detail || 'Invalid request data'
        notify.error({ title: 'Invalid request', description: errorMessage })
      } else if (statusCode === 422) {
        const errorMessage = error?.response?.data?.message || error?.response?.data?.detail || 'Please check your input'
        notify.error({ title: 'Validation failed', description: errorMessage })
      } else {
        const errorMessage =
          error?.response?.data?.message || error?.response?.data?.detail || error?.message || 'Unknown error occurred'
        notify.error({ title: 'Remove failed', description: errorMessage })
      }
    },
  })

  // Handlers for modal state
  const handleWatchlistModalOpen = useCallback((company?: AttachmentCompanyState) => {
    setAttachmentCompany(company ?? null)
    setIsWatchlistModalOpen(true)
  }, [])

  const handleWatchlistModalClose = useCallback(() => {
    setIsWatchlistModalOpen(false)
    setAttachmentCompany(null)
    setAttachmentSearch('')
  }, [])

  const handleActiveDiscussionModalOpen = useCallback(
    (company?: AttachmentCompanyState) => {
      setAttachmentCompany(company ?? null)
      setIsActiveDiscussionModalOpen(true)
    },
    []
  )

  const handleActiveDiscussionModalClose = useCallback(() => {
    setIsActiveDiscussionModalOpen(false)
    setAttachmentCompany(null)
    setAttachmentSearch('')
  }, [])

  const handleAnalystAssignmentModalOpen = useCallback(
    (company: PortfolioAnalystCompanyState & { id: number }, source: 'portfolio-holdings' | 'watch-list' = 'portfolio-holdings') => {
      if (!company.stageAssignmentId) {
        notify.error({
          title: 'Assignment unavailable',
          description: 'Unable to update analysts because stage assignment id is missing.',
        })
        return
      }
      setAnalystAssignmentCompany(company)
      setAnalystAssignmentSource(source)
      setIsAnalystAssignmentModalOpen(true)
    },
    []
  )

  const handleAnalystAssignmentModalClose = useCallback(() => {
    setIsAnalystAssignmentModalOpen(false)
    setAnalystAssignmentCompany(null)
  }, [])

  const handleAnalystAssignmentSubmit = useCallback(
    async (data: UpdateAnalystSubmissionData) => {
      try {
        const response = await updateStageAssignmentAnalystsMutation.mutateAsync(data)
        if (response?.status === 'confirmation_required') {
          setReassignmentWarning({
            isOpen: true,
            warnings: response.warnings ?? [],
            pendingData: data,
          })
          return
        }
        notify.success({
          title: 'Analysts updated',
          description: `${analystAssignmentCompany?.ticker || 'Company'} analyst assignment saved.`,
        })
        handleAnalystAssignmentModalClose()
      } catch (error: any) {
        const statusCode = error?.response?.status ?? error?.status
        if (statusCode === 422) {
          notify.error({
            title: 'Validation failed',
            description: 'Please select valid and different analysts.',
          })
          return
        }
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to update analysts'
        notify.error({
          title: 'Update failed',
          description: message,
        })
      }
    },
    [
      handleAnalystAssignmentModalClose,
      analystAssignmentCompany?.ticker,
      updateStageAssignmentAnalystsMutation,
    ]
  )

  const handleReassignmentWarningConfirm = useCallback(async () => {
    if (!reassignmentWarning.pendingData) return
    try {
      await updateStageAssignmentAnalystsMutation.mutateAsync({
        ...reassignmentWarning.pendingData,
        confirmReassignment: true,
      })
      setReassignmentWarning({ isOpen: false, warnings: [], pendingData: null })
      notify.success({
        title: 'Analysts updated',
        description: `${analystAssignmentCompany?.ticker || 'Company'} analyst assignment saved.`,
      })
      handleAnalystAssignmentModalClose()
    } catch (error: any) {
      const statusCode = error?.response?.status ?? error?.status
      if (statusCode === 422) {
        notify.error({
          title: 'Validation failed',
          description: 'Please select valid and different analysts.',
        })
        return
      }
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update analysts'
      notify.error({
        title: 'Update failed',
        description: message,
      })
    }
  }, [
    reassignmentWarning.pendingData,
    updateStageAssignmentAnalystsMutation,
    analystAssignmentCompany?.ticker,
    handleAnalystAssignmentModalClose,
  ])

  // Reset pagination to first page based on active tab
  const resetPaginationForActiveTab = useCallback(() => {
    switch (activeTab) {
      case 'portfolio-holdings':
        setPortfolioPage(1)
        break
      case 'watch-list':
        setWatchlistPage(1)
        break
      case 'universe':
        setUniversePage(1)
        break
    }
  }, [activeTab])

  // Handler for tab change
  const handleTabChange = useCallback((value: string) => {
    // If there's an active search query, invalidate queries to force refetch
    if (searchQuery || debouncedQuery) {
      // Invalidate the query for the tab we're switching to
      switch (value) {
        case 'portfolio-holdings':
          queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('INVESTED') })
          setPortfolioPage(1)
          break
        case 'watch-list':
          queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('WATCHLIST') })
          setWatchlistPage(1)
          break
        case 'universe':
          queryClient.invalidateQueries({ queryKey: coverageKeys.byStage('UNIVERSE') })
          setUniversePage(1)
          break
      }
    }
    setActiveTab(value)

    // Update URL with new tab parameter
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'portfolio-holdings') {
      // Remove tab param for default 'portfolio-holdings' tab to keep URL clean
      params.delete('tab')
    } else {
      params.set('tab', value)
    }

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.push(newUrl, { scroll: false })
  }, [searchQuery, debouncedQuery, queryClient, router, searchParams])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">CRM</h2>
        <p className="text-sm text-gray-600">
          Portfolio holdings, watch list, and investment universe
        </p>
      </div>

      {/* Tabs with Search */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-gray-50 p-1 rounded-full border border-gray-200">
            <TabsTrigger
              value="portfolio-holdings"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 px-6 py-2.5 text-sm font-medium rounded-full transition-all"
            >
              Portfolio Holdings
            </TabsTrigger>
            <TabsTrigger
              value="watch-list"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 px-6 py-2.5 text-sm font-medium rounded-full transition-all"
            >
              Watch List
            </TabsTrigger>
            <TabsTrigger
              value="universe"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 px-6 py-2.5 text-sm font-medium rounded-full transition-all"
            >
              Universe
            </TabsTrigger>
          </TabsList>

          {/* Search Input */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search by company name/ticker"
              className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                resetPaginationForActiveTab()
              }}
            />
          </div>
        </div>

        <TabsContent value="portfolio-holdings" className="mt-0">
          <PortfolioHoldings
            data={portfolioData}
            totalCount={portfolioTotalCount}
            isLoading={isLoading}
            error={error}
            refetch={refetch}
            searchQuery={debouncedQuery}
            onOpenAnalystAssignmentModal={(company) => handleAnalystAssignmentModalOpen(company, 'portfolio-holdings')}
            page={portfolioPage}
            pageSize={portfolioPageSize}
            onPageChange={setPortfolioPage}
            onPageSizeChange={(value) => {
              setPortfolioPageSize(value)
              setPortfolioPage(1)
            }}
          />
        </TabsContent>

        <TabsContent value="watch-list" className="mt-0">
          <WatchList
            searchQuery={debouncedQuery}
            watchlistData={watchlistData}
            totalCount={watchlistTotalCount}
            isLoading={isLoadingWatchlist}
            isError={isErrorWatchlist}
            refetch={refetchWatchlist}
            attachmentRequirements={activeDiscussionStageRequirements}
            attachmentOptions={allAttachments}
            attachmentSearch={attachmentSearch}
            onAttachmentSearchChange={setAttachmentSearch}
            attachmentQueryInfo={attachmentQueryInfo}
            requiredAttachmentOptions={requiredAttachmentOptionsForActiveDiscussion}
            onModalOpen={handleActiveDiscussionModalOpen}
            onModalClose={handleActiveDiscussionModalClose}
            onOpenAnalystAssignmentModal={(company) => handleAnalystAssignmentModalOpen(company, 'watch-list')}
            onAttachmentsRefetch={refetchCoverageAttachments}
            moveToActiveDiscussionMutation={moveToActiveDiscussionMutation}
            removeFromWatchlistMutation={removeFromWatchlistMutation}
            page={watchlistPage}
            pageSize={watchlistPageSize}
            onPageChange={setWatchlistPage}
            onPageSizeChange={(value) => {
              setWatchlistPageSize(value)
              setWatchlistPage(1)
            }}
          />
        </TabsContent>

        <TabsContent value="universe" className="mt-0">
          <Universe
            searchQuery={debouncedQuery}
            universeData={universeData}
            totalCount={universeTotalCount}
            isLoading={isLoadingUniverse}
            error={errorUniverse}
            refetch={refetchUniverse}
            primaryAnalysts={primaryAnalysts}
            secondaryAnalysts={secondaryAnalysts}
            isLoadingPrimaryAnalysts={isLoadingPrimaryAnalysts}
            isLoadingSecondaryAnalysts={isLoadingSecondaryAnalysts}
            attachmentRequirements={watchlistStageRequirements}
            attachmentOptions={allAttachments}
            attachmentSearch={attachmentSearch}
            onAttachmentSearchChange={setAttachmentSearch}
            attachmentQueryInfo={attachmentQueryInfo}
            requiredAttachmentOptions={requiredAttachmentOptionsForWatchlist}
            onModalOpen={handleWatchlistModalOpen}
            onModalClose={handleWatchlistModalClose}
            onAttachmentsRefetch={refetchCoverageAttachments}
            moveToWatchlistMutation={moveToWatchlistMutation}
            page={universePage}
            pageSize={universePageSize}
            onPageChange={setUniversePage}
            onPageSizeChange={(value) => {
              setUniversePageSize(value)
              setUniversePage(1)
            }}
          />
        </TabsContent>
      </Tabs>

      <AnalystAssignmentModal
        isOpen={isAnalystAssignmentModalOpen}
        onClose={handleAnalystAssignmentModalClose}
        companyData={
          analystAssignmentCompany ?? {
            ticker: '',
            name: '',
          }
        }
        primaryAnalysts={primaryAnalysts}
        secondaryAnalysts={secondaryAnalysts}
        isLoadingPrimaryAnalysts={isLoadingPrimaryAnalysts}
        isLoadingSecondaryAnalysts={isLoadingSecondaryAnalysts}
        isSubmitting={updateStageAssignmentAnalystsMutation.isPending}
        onSubmit={handleAnalystAssignmentSubmit}
        contextLabel={analystAssignmentSource === 'watch-list' ? 'watchlist' : 'portfolio holding'}
      />

      <AnalystReassignmentWarningModal
        isOpen={reassignmentWarning.isOpen}
        onClose={() => setReassignmentWarning({ isOpen: false, warnings: [], pendingData: null })}
        onConfirm={handleReassignmentWarningConfirm}
        warnings={reassignmentWarning.warnings}
        isConfirming={updateStageAssignmentAnalystsMutation.isPending}
      />
    </div>
  )
}
