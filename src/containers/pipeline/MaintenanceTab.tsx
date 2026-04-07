'use client'

import { useCallback, useEffect, useMemo, useState, type UIEvent } from 'react'
import { ChevronDown, ChevronRight, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react'

import { InitialsAvatar } from '@/components/shared/InitialsAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import notify from '@/lib/notifications'
import { cn } from '@/lib/utils'
import {
  CATEGORY_ORDER,
  formatDueDate,
  formatMaintenanceStatusLabel,
  getMaintenanceStatusClass,
  mapApiTaskToTask,
  mapCategoryApiToState,
  normaliseMaintenanceStatus,
} from './lib/maintenance-helpers'
import {
  useMaintenanceDropdownCompaniesQuery,
  useMaintenanceFiltersQuery,
  useMaintenanceMutations,
  usePipelineMaintenanceAnalystOptions,
  useMaintenanceSummaryQuery,
  useMaintenanceTabCountsQuery,
} from './lib/maintenance-queries'
import type {
  MaintenanceAssignee,
  MaintenanceCategoryKey,
  MaintenanceCategoryState,
  MaintenanceCreatePayload,
  MaintenanceFilters,
  MaintenanceSelectOption,
  MaintenanceStatus,
  MaintenanceUpdatePayload,
  MaintenanceTask,
} from './lib/maintenance-types'
import { DEFAULT_FILTERS, NA_STATUS_OPTION, ACTIVE_STATUS_OPTIONS } from './lib/maintenance-helpers'
import {
  maintenanceService,
  type MaintenanceAssigneeApi,
  type MaintenanceCategoryKeyApi,
  type MaintenanceTaskApi,
} from '@/services/api/maintenance.service'
import {
  MaintenanceActiveSkeleton,
  MaintenanceTableSkeleton,
} from './components/PipelineBoardSkeleton'

import { MaintenanceToolbar } from './components/maintenance/maintenance-toolbar'
import { MaintenanceCreateModal } from './components/maintenance/maintenance-create-modal'
import { MaintenanceDetailSheet } from './components/maintenance/maintenance-detail-sheet'
import { AppFeedbackState } from '@/components/shared/AppFeedbackState'

interface MaintenanceTabProps {
  isActive: boolean
}

const normaliseOptions = (
  list: Array<{ value: string; label?: string; full_name?: string }> | string[] | undefined,
  allLabel: string
): MaintenanceSelectOption[] => {
  const items =
    list?.map((item) =>
      typeof item === 'string'
        ? { value: item, label: item }
        : {
            value: item.value,
            label: item.label ?? item.full_name ?? item.value,
          }
    ) ?? []
  return [{ value: 'all', label: allLabel }, ...items]
}

export function MaintenanceTab({ isActive }: MaintenanceTabProps) {
  const [filters, setFilters] = useState<MaintenanceFilters>(DEFAULT_FILTERS)
  const [subTab, setSubTab] = useState<'active' | 'completed' | 'deleted'>('active')
  const [expandedGroups, setExpandedGroups] = useState<Set<MaintenanceCategoryKey>>(() => new Set())
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null)
  const [categories, setCategories] = useState<MaintenanceCategoryState[]>([])
  const [tabCounts, setTabCounts] = useState<{
    active: number
    completed: number
    deleted: number
  }>({ active: 0, completed: 0, deleted: 0 })
  const [loadingCategory, setLoadingCategory] = useState<MaintenanceCategoryKey | null>(null)
  const [companySearch, setCompanySearch] = useState('')
  const [modalCompanySearchTerm, setModalCompanySearchTerm] = useState('')
  const [modalCompanySearchQuery, setModalCompanySearchQuery] = useState<string | null>(null)
  const [companyHasMore, setCompanyHasMore] = useState(false)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [companyOptionsState, setCompanyOptionsState] = useState<MaintenanceSelectOption[] | null>(
    null
  )
  const [countryOptionsState, setCountryOptionsState] = useState<MaintenanceSelectOption[] | null>(
    null
  )
  const [countryHasMore, setCountryHasMore] = useState(false)
  const [countryLoading, setCountryLoading] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [analystOptionsState, setAnalystOptionsState] = useState<MaintenanceAssignee[]>([])
  const [analystHasMore, setAnalystHasMore] = useState(false)
  const [analystLoading, setAnalystLoading] = useState(false)
  const [analystSearch, setAnalystSearch] = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState<MaintenanceAssignee[]>([])
  const [assigneeHasMore, setAssigneeHasMore] = useState(false)
  const [assigneeLoading, setAssigneeLoading] = useState(false)
  const [assigneeSkip, setAssigneeSkip] = useState(0)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [statusUpdatingId, setStatusUpdatingId] = useState<MaintenanceTask['id'] | null>(null)
  const [tableLoadingMore, setTableLoadingMore] = useState(false)

  const handleFiltersChange = (next: Partial<MaintenanceFilters>) => {
    setFilters((prev) => {
      const merged = { ...prev, ...next }
      if (subTab !== 'active') {
        merged.status = 'all'
      }
      return merged
    })
    if (Object.prototype.hasOwnProperty.call(next, 'company')) {
      setCompanySearch('')
    }
    if (Object.prototype.hasOwnProperty.call(next, 'analyst')) {
      setAnalystSearch('')
    }
    if (Object.prototype.hasOwnProperty.call(next, 'country')) {
      setCountrySearch('')
    }
  }

  const filtersQuery = useMaintenanceFiltersQuery(subTab, isActive)
  const summaryQuery = useMaintenanceSummaryQuery(filters, subTab, isActive)
  const tabCountsQuery = useMaintenanceTabCountsQuery(filters, isActive)
  const companiesQuery = useMaintenanceDropdownCompaniesQuery(
    createModalOpen && modalCompanySearchQuery !== null,
    modalCompanySearchQuery ?? undefined
  )
  const { createTask, updateTask, updateStatus, deleteTask, restoreTask, watchTask } =
    useMaintenanceMutations()

  const filtersData = useMemo(() => {
    const data = filtersQuery.data as
      | { filter_type?: string; filters?: Record<string, unknown> }
      | undefined
    if (!data) return undefined
    if (data.filter_type === 'all' && data.filters) return data.filters as Record<string, unknown>
    if (!('filter_type' in (data ?? {}))) return data as Record<string, unknown>
    return undefined
  }, [filtersQuery.data])

  const companyOptions = useMemo(
    () =>
      normaliseOptions(
        filtersData?.ticker as Array<{ value: string; label?: string }>,
        'All Companies'
      ),
    [filtersData?.ticker]
  )
  const ANALYST_PAGE_SIZE = 100
  const { analystOptions, data: maintenanceAnalystsPage } = usePipelineMaintenanceAnalystOptions({
    enabled: isActive,
    limit: ANALYST_PAGE_SIZE,
    valueKind: 'id',
  })
  const countryOptions = useMemo(
    () =>
      normaliseOptions(
        filtersData?.country as Array<{ value: string; label?: string }>,
        'All Countries'
      ),
    [filtersData?.country]
  )

  useEffect(() => {
    const counts = (filtersQuery.data as { counts?: Record<string, number> } | undefined)?.counts
    if (!counts) return
    if (companySearch || analystSearch || countrySearch) return
    const companyLength = (companyOptionsState ?? companyOptions).filter(
      (opt) => opt.value !== 'all'
    ).length
    const countryLength = (countryOptionsState ?? countryOptions).filter(
      (opt) => opt.value !== 'all'
    ).length

    if (counts.ticker !== undefined) {
      setCompanyHasMore(counts.ticker > companyLength)
    }
    if (counts.country !== undefined) {
      setCountryHasMore(counts.country > countryLength)
    }
  }, [
    companyOptions,
    companyOptionsState,
    countryOptions,
    countryOptionsState,
    filtersQuery.data,
    analystSearch,
    companySearch,
    countrySearch,
  ])

  /* Analyst has more options available. */
  useEffect(() => {
    if (!isActive) return
    if (analystOptionsState.length > 0 || analystSearch) return
    const len = maintenanceAnalystsPage?.length ?? 0
    setAnalystHasMore(len >= ANALYST_PAGE_SIZE)
  }, [
    ANALYST_PAGE_SIZE,
    analystOptionsState.length,
    analystSearch,
    isActive,
    maintenanceAnalystsPage,
  ])

  useEffect(() => {
    setCompanySearch('')
    setModalCompanySearchTerm('')
    setModalCompanySearchQuery(null)
    setCompanyHasMore(false)
    setCompanyOptionsState(null)
    setCompanySearch('')
    setCountryOptionsState(null)
    setCountryHasMore(false)
    setCountryLoading(false)
    setCountrySearch('')
    setAnalystOptionsState([])
    setAnalystHasMore(false)
    setAnalystSearch('')
  }, [subTab])

  useEffect(() => {
    if (tabCountsQuery.data) {
      setTabCounts({
        active: tabCountsQuery.data.active ?? 0,
        completed: tabCountsQuery.data.completed ?? 0,
        deleted: tabCountsQuery.data.deleted ?? 0,
      })
    }
  }, [tabCountsQuery.data])

  const loadFilterOptions = useCallback(
    async (
      filterType: 'ticker' | 'analyst' | 'country',
      options?: { search?: string; append?: boolean; target?: 'ticker' | 'analyst' | 'country' }
    ) => {
      const limit = 100
      const targetType = options?.target ?? filterType

      if (filterType === 'analyst') {
        const currentAnalystOptions = analystOptionsState
        const skip = options?.append ? currentAnalystOptions.length : 0
        setAnalystLoading(true)
        try {
          const params: Record<string, unknown> = {
            limit: ANALYST_PAGE_SIZE,
            skip,
          }
          if (options?.search) {
            params.search = options.search
          }
          const res = await maintenanceService.getAnalysts(params)
          const raw =
            (Array.isArray(res.data)
              ? (res.data as MaintenanceAssigneeApi[])
              : (res.data as { users?: MaintenanceAssigneeApi[] }).users) ?? []
          const mappedAnalysts: MaintenanceAssignee[] = raw.map((item) => ({
            id: item.id ?? '',
            name: item.name || item.full_name || item.email || String(item.id ?? ''),
            full_name: item.full_name,
            email: item.email,
          }))
          if (options?.append) {
            const merged = [...currentAnalystOptions]
            mappedAnalysts.forEach((item) => {
              const exists = merged.some((opt) =>
                item.id !== undefined
                  ? String(opt.id ?? opt.name) === String(item.id)
                  : opt.name === item.name
              )
              if (!exists) merged.push(item)
            })
            setAnalystOptionsState(merged)
          } else {
            setAnalystOptionsState(mappedAnalysts)
          }
          setAnalystHasMore(mappedAnalysts.length === ANALYST_PAGE_SIZE)
          setAnalystSearch(options?.search ?? '')
        } catch (error) {
          console.error(error)
        } finally {
          setAnalystLoading(false)
        }
        return
      }

      const currentSelectOptions =
        targetType === 'ticker'
          ? (companyOptionsState ?? companyOptions).filter((opt) => opt.value !== 'all')
          : targetType === 'country'
            ? (countryOptionsState ?? countryOptions).filter((opt) => opt.value !== 'all')
            : []
      const skip = options?.append ? currentSelectOptions.length : 0
      const setLoading =
        targetType === 'ticker'
          ? setCompanyLoading
          : targetType === 'country'
            ? setCountryLoading
            : setAnalystLoading
      setLoading(true)
      try {
        const params: Record<string, unknown> = {
          tab: subTab,
          filter_type: filterType,
          skip,
          limit,
        }
        const optionalFilters: Array<[keyof MaintenanceFilters, string | undefined]> = [
          ['company', filters.company],
          ['analyst', filters.analyst],
          ['country', filters.country],
          ['status', filters.status],
        ]
        optionalFilters.forEach(([key, value]) => {
          if (value && value !== 'all') {
            params[key] = value
          }
        })
        if (options?.search) {
          params.search = options.search
        }

        const res = await maintenanceService.getFilters({
          ...params,
        })
        const data = ((res as { data?: unknown }).data ?? res) as {
          items?: Array<{ value: string; label?: string; full_name?: string; email?: string }>
          count?: number
          filters?: Record<string, Array<{ value: string; label?: string; full_name?: string }>>
        }
        const rawItems =
          data.items ??
          data.filters?.[filterType] ??
          (filterType === 'ticker'
            ? (data as { filters?: { ticker?: Array<{ value: string; label?: string }> } }).filters
                ?.ticker
            : data.filters?.[filterType])
        const mappedItems = (rawItems ?? []).map(
          (item: { value: string; label?: string; full_name?: string; email?: string }) => ({
            value: item.value,
            label: item.label ?? item.full_name ?? item.email ?? item.value,
            full_name: item.full_name,
            email: item.email,
          })
        )
        const totalCount =
          data.count ??
          (typeof data === 'object' && 'counts' in data
            ? ((data as { counts?: Record<string, number> }).counts?.[filterType] ?? 0)
            : undefined)
        const hasMore = totalCount !== undefined ? skip + mappedItems.length < totalCount : false

        if (targetType === 'ticker') {
          const nextOptions = options?.append
            ? [
                ...currentSelectOptions,
                ...mappedItems.filter(
                  (opt) => !currentSelectOptions.some((existing) => existing.value === opt.value)
                ),
              ]
            : mappedItems
          setCompanyOptionsState(nextOptions)
          setCompanyHasMore(hasMore)
        } else {
          const nextOptions = options?.append
            ? [
                ...currentSelectOptions,
                ...mappedItems.filter(
                  (opt) => !currentSelectOptions.some((existing) => existing.value === opt.value)
                ),
              ]
            : mappedItems
          setCountryOptionsState(nextOptions)
          setCountryHasMore(hasMore)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    },
    [
      ANALYST_PAGE_SIZE,
      analystOptionsState,
      companyOptions,
      companyOptionsState,
      countryOptions,
      countryOptionsState,
      filters.analyst,
      filters.company,
      filters.country,
      filters.status,
      subTab,
    ]
  )

  const handleCompanySearch = async (query: string) => {
    setCompanySearch(query)
    await loadFilterOptions('ticker', { search: query, append: false })
  }

  const handleCompanyLoadMore = async () => {
    await loadFilterOptions('ticker', { search: companySearch, append: true })
  }

  const handleCountryLoadMore = async () => {
    await loadFilterOptions('country', { search: countrySearch, append: true })
  }

  const handleAnalystSearchToolbar = (query: string) => {
    setAnalystSearch(query)
    void loadAnalysts(query, false)
  }

  const handleAnalystLoadMoreToolbar = () => {
    if (analystHasMore && !analystLoading) {
      void loadAnalysts(analystSearch, true)
    }
  }

  const loadAnalysts = useCallback(
    async (searchTerm: string, append = false) => {
      await loadFilterOptions('analyst', { search: searchTerm, append, target: 'analyst' })
    },
    [loadFilterOptions]
  )

  const fetchAssignees = useCallback(
    async (searchTerm: string, append = false) => {
      setAssigneeLoading(true)
      try {
        const params: Record<string, unknown> = {
          limit: ANALYST_PAGE_SIZE,
          skip: append ? assigneeSkip : 0,
        }
        if (searchTerm) {
          params.search = searchTerm
        }
        const res = await maintenanceService.getAnalysts(params)
        const raw =
          (Array.isArray(res.data)
            ? (res.data as MaintenanceAssigneeApi[])
            : (res.data as { users?: MaintenanceAssigneeApi[] }).users) ?? []
        const mapped: MaintenanceAssignee[] = raw.map((item) => ({
          id: item.id ?? '',
          name: item.name || item.full_name || item.email || String(item.id ?? ''),
          full_name: item.full_name,
          email: item.email,
        }))
        setAssigneeOptions((prev) => (append ? [...prev, ...mapped] : mapped))
        setAssigneeSkip((append ? assigneeSkip : 0) + mapped.length)
        setAssigneeHasMore(mapped.length === ANALYST_PAGE_SIZE)
      } catch (error) {
        console.error(error)
      } finally {
        setAssigneeLoading(false)
      }
    },
    [assigneeSkip]
  )

  const handleAssigneeDropdownOpen = () => {
    if (!assigneeOptions.length && !assigneeLoading) {
      void fetchAssignees('', false)
    }
  }

  const handleAssigneeSearch = (query: string) => {
    setAssigneeSearch(query)
    void fetchAssignees(query, false)
  }

  const handleAssigneeLoadMore = () => {
    if (assigneeHasMore && !assigneeLoading) {
      void fetchAssignees(assigneeSearch, true)
    }
  }

  const effectiveCompanyOptions =
    companyOptionsState && companyOptionsState.length > 0
      ? [{ value: 'all', label: 'All Companies' }, ...companyOptionsState]
      : companyOptions

  const effectiveCountryOptions =
    countryOptionsState && countryOptionsState.length > 0
      ? [{ value: 'all', label: 'All Countries' }, ...countryOptionsState]
      : countryOptions

  const effectiveAnalystOptions =
    analystOptionsState && analystOptionsState.length > 0
      ? [
          { value: 'all', label: 'All Analysts' },
          ...analystOptionsState.map((analyst) => ({
            value: analyst.id !== undefined ? String(analyst.id) : analyst.name,
            label: analyst.name || analyst.email || String(analyst.id ?? ''),
          })),
        ]
      : analystOptions

  useEffect(() => {
    if (!summaryQuery.data) return
    const nextCategories = CATEGORY_ORDER.map((key) => {
      const cat = summaryQuery.data[key as MaintenanceCategoryKeyApi]
      return mapCategoryApiToState(key as MaintenanceCategoryKey, cat)
    })
    setCategories(nextCategories)
    if (nextCategories.length > 0) {
      setExpandedGroups((prev: Set<MaintenanceCategoryKey>) => {
        const next = new Set<MaintenanceCategoryKey>(prev)
        next.add(nextCategories[0].key)
        return next
      })
    }
    const total = nextCategories.reduce((acc: number, cat: MaintenanceCategoryState) => {
      return acc + (cat.total ?? cat.items.length ?? 0)
    }, 0)
    setTabCounts((prev) => ({ ...prev, [subTab]: total }))
  }, [summaryQuery.data, subTab])

  useEffect(() => {
    if (!isActive) {
      setSelectedTaskId(null)
    }
  }, [isActive])

  const flattenedTasks = useMemo(() => categories.flatMap((cat) => cat.items), [categories])
  const selectedTask = useMemo(
    () => flattenedTasks.find((task) => task.id === selectedTaskId) ?? null,
    [flattenedTasks, selectedTaskId]
  )

  const resolvedTask = selectedTask

  const handleToggleGroup = (key: MaintenanceCategoryKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleStatusChange = async (
    id: MaintenanceTask['id'],
    status: MaintenanceStatus,
    showToast = true
  ) => {
    setStatusUpdatingId(id)
    try {
      await updateStatus.mutateAsync({ id, status })
      if (showToast) {
        notify.success({ title: 'Status updated' })
      }
    } catch (error) {
      console.error(error)
      if (showToast) {
        notify.error({ title: 'Could not update status' })
      }
    } finally {
      setStatusUpdatingId((prev) => (prev === id ? null : prev))
    }
  }

  const handleUpdateTask = async (
    id: MaintenanceTask['id'],
    payload: MaintenanceUpdatePayload,
    options?: { silent?: boolean }
  ) => {
    try {
      await updateTask.mutateAsync({
        id,
        payload: {
          title: payload.title,
          action: payload.action,
          due_date: payload.due_date ?? null,
          important: payload.important,
          status: payload.status,
          company_id: payload.company_id,
        },
      })
      if (!options?.silent) {
        notify.success({ title: 'Maintenance task updated' })
      }
    } catch {
      notify.error({ title: 'Could not update task' })
    }
  }

  const handleCreateTask = async (payload: MaintenanceCreatePayload) => {
    const assigneeIds = payload.assignees
      .map((a) => (a.id !== undefined ? String(a.id) : a.name))
      .filter(Boolean) as string[]
    try {
      const response = await createTask.mutateAsync({
        company_id: payload.companyId,
        title: payload.title,
        ticker: payload.ticker,
        action: payload.action,
        due_date: payload.due_date,
        assignee: assigneeIds,
        important: payload.important,
        status: 'TODO',
      })
      const created = (response?.data as { data?: MaintenanceTaskApi } | undefined)?.data
      const assigneeList = (created?.assignee ??
        created?.assignees ??
        []) as MaintenanceAssigneeApi[]
      const names = assigneeList
        .map((assignee) => assignee.name ?? assignee.full_name ?? assignee.email)
        .filter(Boolean)
        .join(' & ')
      notify.success({
        title: 'Maintenance task created',
        description: names ? `Assigned to ${names}.` : undefined,
      })
      setCreateModalOpen(false)
    } catch {
      notify.error({ title: 'Could not create task' })
    }
  }

  const handleRestoreTask = async (id: MaintenanceTask['id']) => {
    try {
      await restoreTask.mutateAsync(id)
      notify.success({ title: 'Task restored' })
    } catch {
      notify.error({ title: 'Could not restore task' })
    }
  }

  const handleDeleteTask = async (id: MaintenanceTask['id']) => {
    try {
      await deleteTask.mutateAsync(id)
      notify.success({ title: 'Task deleted', description: 'Moved to Deleted Tasks.' })
      setSelectedTaskId(null)
    } catch {
      notify.error({ title: 'Could not delete task' })
    }
  }

  const handleLoadMore = async (key: MaintenanceCategoryKey) => {
    const category = categories.find((cat) => cat.key === key)
    if (!category) return
    setLoadingCategory(key)
    try {
      const params: Record<string, unknown> = {
        category: key,
        skip: category.items.length,
        limit: category.limit ?? 10,
        tab: subTab,
      }
      const optionalFilters: Array<[keyof MaintenanceFilters, string | undefined]> = [
        ['company', filters.company],
        ['analyst', filters.analyst],
        ['country', filters.country],
        ['status', filters.status],
      ]
      optionalFilters.forEach(([optKey, value]) => {
        if (value && value !== 'all') {
          params[optKey] = value
        }
      })
      const res = await maintenanceService.getCategoryList(params)
      const mapped = (res.data?.items ?? []).map(mapApiTaskToTask)
      setCategories((prev) =>
        prev.map((cat) =>
          cat.key === key
            ? {
                ...cat,
                items: [...cat.items, ...mapped],
                has_more: res.data?.has_more ?? cat.has_more,
                total: res.data?.total ?? cat.total,
              }
            : cat
        )
      )
    } catch {
      notify.error({ title: 'Could not load more tasks' })
    } finally {
      setLoadingCategory(null)
    }
  }

  const handleLoadMoreAll = async () => {
    const keys = categories.filter((cat) => cat.has_more).map((cat) => cat.key)
    if (!keys.length) return
    setTableLoadingMore(true)
    for (const key of keys) {
      await handleLoadMore(key)
    }
    setTableLoadingMore(false)
  }

  const handleCategoryScroll =
    (key: MaintenanceCategoryKey) => (event: UIEvent<HTMLDivElement>) => {
      if (subTab !== 'active') return
      if (loadingCategory === key) return
      const category = categories.find((cat) => cat.key === key)
      if (!category?.has_more) return

      const target = event.currentTarget
      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight
      if (distanceFromBottom < 96) {
        void handleLoadMore(key)
      }
    }

  const handleSubTabChange = useCallback((value: typeof subTab) => {
    setSubTab(value)
    setSelectedTaskId(null)
  }, [])

  const handleCreateModalOpenChange = (open: boolean) => {
    setCreateModalOpen(open)
    if (!open) {
      setModalCompanySearchTerm('')
      setModalCompanySearchQuery(null)
      setAssigneeOptions([])
      setAssigneeSkip(0)
      setAssigneeHasMore(false)
      setAssigneeSearch('')
    }
  }

  const mappedCompaniesForModal = useMemo(
    () =>
      companiesQuery.data?.map((company) => ({
        id: (company as { id?: number }).id,
        ticker: company.ticker,
        name: company.name,
        stageLabel:
          (company as { stage_label?: string; stage?: string }).stage_label ??
          (company as { stage?: string }).stage,
        primaryAnalyst: company.primary_analyst?.full_name ?? company.primary_analyst?.name,
        secondaryAnalyst: company.secondary_analyst?.full_name ?? company.secondary_analyst?.name,
        primaryAnalystId: company.primary_analyst?.id,
        secondaryAnalystId: company.secondary_analyst?.id,
        country: company.country,
        assignees: (
          company as {
            assignees?: Array<{ id?: string | number; full_name?: string; name?: string }>
          }
        ).assignees,
      })) ?? [],
    [companiesQuery.data]
  )

  const handleModalCompanySearch = (query: string) => {
    setModalCompanySearchTerm(query)
    setModalCompanySearchQuery(query)
  }

  const handleDetailOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedTaskId(null)
    }
  }

  const handleToggleWatch = async (id: MaintenanceTask['id'], next: boolean) => {
    try {
      await watchTask.mutateAsync({ id, watch: next })
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) => (item.id === id ? { ...item, watching: next } : item)),
        }))
      )
      notify.success({ title: next ? 'Watching task' : 'Stopped watching task' })
    } catch {
      notify.error({ title: 'Could not update watch status' })
    }
  }

  const renderTabTrigger = useCallback(
    (value: typeof subTab, label: string, count: number, emphasis?: 'default' | 'danger') => {
      const isCurrent = subTab === value
      const danger = emphasis === 'danger'
      return (
        <button
          type="button"
          onClick={() => handleSubTabChange(value)}
          className={cn(
            'relative pb-3 text-xs transition-colors',
            isCurrent
              ? danger
                ? 'font-semibold text-red-700'
                : 'font-semibold text-gray-900'
              : danger
                ? 'text-gray-500 hover:text-gray-700'
                : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {label}
          <span
            className={cn(
              'ml-2 inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px]',
              isCurrent
                ? danger
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-300 text-gray-900'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {count}
          </span>
          {isCurrent ? (
            <div
              className={cn(
                'absolute right-0 bottom-0 left-0 h-0.5',
                danger ? 'bg-red-700' : 'bg-gray-900'
              )}
            />
          ) : null}
        </button>
      )
    },
    [handleSubTabChange, subTab]
  )

  const activeLoading = summaryQuery.isFetching && subTab === 'active'
  const completedLoading = summaryQuery.isFetching && subTab === 'completed'
  const deletedLoading = summaryQuery.isFetching && subTab === 'deleted'

  const renderAssignees = (assignees: MaintenanceAssignee[]) => (
    <div className="flex -space-x-2">
      {assignees.slice(0, 2).map((assignee, index) => {
        const displayName = assignee.name || assignee.email || '-'
        return (
          <span key={assignee.id ?? `${displayName}-${index}`} title={displayName}>
            <InitialsAvatar
              name={displayName}
              className="h-6 w-6 ring-2 ring-white"
              textClassName="text-[10px] text-white"
            />
          </span>
        )
      })}
    </div>
  )

  const renderCategoryItems = (category: MaintenanceCategoryState) => {
    const isExpanded = expandedGroups.has(category.key)
    const items = category.items
    const displayCount = items.length
    if (displayCount === 0) return null

    return (
      <div key={category.key}>
        <button
          type="button"
          onClick={() => handleToggleGroup(category.key)}
          className="mb-2 flex items-center gap-2 text-xs text-gray-700 transition-colors hover:text-gray-900"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <span>
            {category.label} ({displayCount} items)
          </span>
        </button>

        {isExpanded && (
          <div
            className="max-h-[520px] space-y-0 overflow-auto"
            onScroll={handleCategoryScroll(category.key)}
          >
            {items.map((task: MaintenanceTask, index: number) => {
              const isFirst = index === 0
              const isLast = index === items.length - 1
              const statusValue = normaliseMaintenanceStatus(task.status)

              return (
                <div
                  key={`${category.key}-${task.id}-${index}`}
                  className={cn(
                    'flex min-h-[52px] cursor-pointer items-center gap-3 border border-gray-200 bg-white px-3 py-3 transition-colors hover:bg-gray-50',
                    isFirst && 'rounded-t-md',
                    isLast ? 'rounded-b-md' : 'border-b-0'
                  )}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <Badge
                    variant="secondary"
                    className={cn('shrink-0 px-2 py-0.5 text-[10px]', getTickerBadgeClass(task))}
                  >
                    {task.ticker}
                  </Badge>

                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="truncate text-xs font-medium text-gray-900">
                      {task.title ?? ''}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {renderAssignees(task.assignees)}

                    <div className="w-14 text-right text-xs text-gray-600">
                      {formatDueDate(task.due_date)}
                    </div>

                    <div onClick={(event) => event.stopPropagation()}>
                      <Select
                        value={statusValue}
                        onValueChange={(value) => handleStatusSelect(task.id, value)}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-7 w-[120px] border-none px-2 text-[10px] shadow-none',
                            getMaintenanceStatusClass(statusValue)
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {statusUpdatingId === task.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-600" />
                            ) : null}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>{renderStatusOptions()}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )
            })}
            {category.has_more ? (
              <div className="border border-t-0 border-gray-200 bg-white px-3 py-2 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  disabled={loadingCategory === category.key}
                  onClick={() => handleLoadMore(category.key)}
                >
                  {loadingCategory === category.key ? 'Loading…' : 'Load More'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  const renderCompletedRows = (tasks: MaintenanceTask[]) => (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="sticky top-0 z-10 grid grid-cols-[100px_1fr_140px_120px_120px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">Tag</div>
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">
          Task Name
        </div>
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">
          Assignees
        </div>
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">
          Due Date
        </div>
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">Status</div>
      </div>
      <div className="max-h-[520px] overflow-auto">
        {tasks.map((task, index) => (
          <div
            key={`completed-${task.id}-${index}`}
            className={cn(
              'grid cursor-pointer grid-cols-[100px_1fr_140px_120px_120px] gap-4 px-4 py-4 transition-colors hover:bg-gray-50',
              index !== tasks.length - 1 && 'border-b border-gray-200'
            )}
            onClick={() => setSelectedTaskId(task.id)}
          >
            <div className="flex items-center">
              <Badge
                variant="secondary"
                className={cn('px-2 py-0.5 text-[10px]', getTickerBadgeClass(task))}
              >
                {task.ticker}
              </Badge>
            </div>
            <div className="flex items-center text-xs text-gray-900">{task.title ?? ''}</div>
            <div className="flex items-center">{renderAssignees(task.assignees)}</div>
            <div className="flex items-center text-xs text-gray-700">
              {formatDueDate(task.due_date)}
            </div>
            <div className="flex items-center">
              <Badge className="bg-green-50 text-[10px] text-green-700 hover:bg-green-50">
                Completed
              </Badge>
            </div>
          </div>
        ))}
      </div>
      {categories.some((cat) => cat.has_more) ? (
        <div className="border-t px-4 py-3 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            disabled={tableLoadingMore}
            onClick={handleLoadMoreAll}
          >
            {tableLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )

  const renderDeletedRows = (tasks: MaintenanceTask[]) => (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="sticky top-0 z-10 grid grid-cols-[100px_1fr_180px_140px_140px_120px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">Tag</div>
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">
          Task Name
        </div>
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">
          Original Assignees
        </div>
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">
          Deleted By
        </div>
        <div className="text-[10px] font-medium tracking-wide text-gray-700 uppercase">
          Deleted On
        </div>
        <div className="text-right text-[10px] font-medium tracking-wide text-gray-700 uppercase">
          Action
        </div>
      </div>

      <div className="max-h-[520px] overflow-auto">
        {tasks.map((task, index) => (
          <div
            key={`deleted-${task.id}-${index}`}
            className={cn(
              'grid cursor-pointer grid-cols-[100px_1fr_180px_140px_140px_120px] items-center gap-4 px-4 py-4 transition-colors hover:bg-gray-50',
              index !== tasks.length - 1 && 'border-b border-gray-200'
            )}
            onClick={() => setSelectedTaskId(task.id)}
          >
            <div className="flex items-center opacity-60">
              <Badge variant="secondary" className="bg-gray-100 px-2 py-0.5 text-[10px]">
                {task.ticker}
              </Badge>
            </div>
            <div className="flex items-center text-xs text-gray-900 opacity-60">
              {task.title ?? ''}
            </div>
            <div className="flex items-center opacity-60">{renderAssignees(task.assignees)}</div>
            <div className="flex items-center text-xs text-gray-700 opacity-60">
              {task.deleted_by ?? '—'}
            </div>
            <div className="flex items-center text-xs text-gray-700 opacity-60">
              {task.deleted_on ?? '—'}
            </div>
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                className="h-7 gap-1.5 rounded-md bg-gray-900 text-xs text-white hover:bg-gray-800"
                onClick={(event) => {
                  event.stopPropagation()
                  handleRestoreTask(task.id)
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </Button>
            </div>
          </div>
        ))}
      </div>
      {categories.some((cat) => cat.has_more) ? (
        <div className="border-t px-4 py-3 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            disabled={tableLoadingMore}
            onClick={handleLoadMoreAll}
          >
            {tableLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )

  const currentTasks = flattenedTasks

  const renderStatusOptions = () => (
    <>
      {(['TODO', 'INPROGRESS', 'DONE'] as MaintenanceStatus[]).map((status) => (
        <SelectItem key={status} value={status} className="text-xs">
          {formatMaintenanceStatusLabel(status)}
        </SelectItem>
      ))}
      <div className="my-1 border-t border-gray-200" />
      <SelectItem value="__delete__" className="text-xs text-red-700 focus:text-red-800">
        <span className="flex items-center gap-2">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Task
        </span>
      </SelectItem>
    </>
  )

  const handleStatusSelect = (taskId: MaintenanceTask['id'], value: string) => {
    if (value === '__delete__') {
      handleDeleteTask(taskId)
      return
    }
    handleStatusChange(taskId, value as MaintenanceStatus)
  }

  const renderContent = () => {
    if (subTab === 'active') {
      if (activeLoading) return <MaintenanceActiveSkeleton />
      const buckets = categories.some((cat) => cat.items.length > 0)
      if (!buckets)
        return (
          <AppFeedbackState
            variant="empty"
            title="No tasks yet"
            description="No maintenance tasks found"
          />
        )
      return (
        <div className="space-y-3 rounded-lg bg-gray-50 p-4">
          {categories.map(renderCategoryItems)}
        </div>
      )
    }

    if (subTab === 'completed') {
      if (completedLoading) return <MaintenanceTableSkeleton columns={5} rows={6} />
      const items = currentTasks.filter(
        (task) => normaliseMaintenanceStatus(task.status) === 'DONE'
      )
      if (items.length === 0)
        return (
          <AppFeedbackState
            variant="empty"
            title="No completed tasks"
            description="There are no completed maintenance tasks found"
          />
        )
      return renderCompletedRows(items)
    }

    const deleted = currentTasks.filter((task) => task.deleteRequested || task.deleted_at)
    if (deletedLoading) return <MaintenanceTableSkeleton columns={6} rows={6} />
    if (deleted.length === 0)
      return (
        <AppFeedbackState
          variant="empty"
          title="No deleted tasks"
          description="There are no deleted maintenance tasks found"
        />
      )
    return renderDeletedRows(deleted)
  }

  const stageLabelForCompany = useCallback(
    (ticker: string) => companiesQuery.data?.find((c) => c.ticker === ticker)?.stage_label,
    [companiesQuery.data]
  )

  const detailTask = useMemo(() => {
    if (!resolvedTask) return null
    return {
      ...resolvedTask,
      stageLabel:
        resolvedTask.stageLabel ??
        (resolvedTask.ticker ? stageLabelForCompany(resolvedTask.ticker) : undefined),
    }
  }, [resolvedTask, stageLabelForCompany])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-6">
          {renderTabTrigger('active', 'Active Tasks', tabCounts.active)}
          {renderTabTrigger('completed', 'Completed Tasks', tabCounts.completed)}
          {renderTabTrigger('deleted', 'Deleted Tasks', tabCounts.deleted, 'danger')}
        </div>
        <Button
          size="sm"
          className="mb-3 h-8 gap-1.5 rounded-md bg-gray-900 text-xs text-white hover:bg-gray-800"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Task
        </Button>
      </div>

      <MaintenanceToolbar
        filters={filters}
        companyOptions={effectiveCompanyOptions}
        analystOptions={effectiveAnalystOptions}
        countryOptions={effectiveCountryOptions}
        statusOptions={subTab === 'active' ? ACTIVE_STATUS_OPTIONS : NA_STATUS_OPTION}
        hideStatusFilter={subTab !== 'active'}
        onFiltersChange={handleFiltersChange}
        onCreateTask={() => setCreateModalOpen(true)}
        onCompanySearch={handleCompanySearch}
        onCompanyLoadMore={companyHasMore ? handleCompanyLoadMore : undefined}
        companyHasMore={companyHasMore}
        companyLoading={companyLoading}
        showCreateButton={false}
        onAnalystSearch={handleAnalystSearchToolbar}
        onAnalystLoadMore={analystHasMore ? handleAnalystLoadMoreToolbar : undefined}
        analystHasMore={analystHasMore}
        analystLoading={analystLoading}
        onCountryLoadMore={countryHasMore ? handleCountryLoadMore : undefined}
        countryHasMore={countryHasMore}
        countryLoading={countryLoading}
      />

      {renderContent()}

      <MaintenanceCreateModal
        open={createModalOpen}
        onOpenChange={handleCreateModalOpenChange}
        companies={mappedCompaniesForModal}
        analysts={assigneeOptions.length ? assigneeOptions : analystOptionsState}
        onAssigneeDropdownOpen={handleAssigneeDropdownOpen}
        onAssigneeSearch={handleAssigneeSearch}
        onAssigneeLoadMore={assigneeHasMore ? handleAssigneeLoadMore : undefined}
        analystHasMore={assigneeHasMore}
        analystLoading={assigneeLoading}
        companySearchTerm={modalCompanySearchTerm}
        onCompanySearch={handleModalCompanySearch}
        companySearchSubmitted={modalCompanySearchQuery !== null}
        isCompanyLoading={companiesQuery.isFetching || companyLoading}
        onCreate={handleCreateTask}
        isSubmitting={createTask.isPending}
      />

      <MaintenanceDetailSheet
        open={Boolean(selectedTaskId)}
        onOpenChange={handleDetailOpenChange}
        contextTab={subTab}
        task={detailTask}
        onUpdate={handleUpdateTask}
        onStatusChange={handleStatusChange}
        onDelete={(id) => handleDeleteTask(id)}
        onRestore={subTab === 'deleted' ? handleRestoreTask : undefined}
        isWatching={resolvedTask?.watching}
        isWatchable={Boolean(resolvedTask?.can_watch)}
        onToggleWatch={handleToggleWatch}
      />
    </div>
  )

  function getTickerBadgeClass(task: MaintenanceTask) {
    if (task.important) {
      return 'bg-red-50 text-red-700 hover:bg-red-50'
    }
    return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
  }
}

export default MaintenanceTab
