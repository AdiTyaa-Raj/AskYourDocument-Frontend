import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  maintenanceService,
  type MaintenanceAnalystResponseItem,
  type MaintenanceSummaryResponse,
} from '@/services/api/maintenance.service'
import type { MaintenanceFilters, MaintenanceStatus } from './maintenance-types'

export const buildMaintenanceParams = (
  filters: MaintenanceFilters,
  subTab: 'active' | 'completed' | 'deleted'
): Record<string, unknown> => {
  const params: Record<string, unknown> = { limit: 10, tab: subTab }
  const optionalFilters: Partial<MaintenanceFilters> = {
    company: filters.company,
    analyst: filters.analyst,
    country: filters.country,
    status: filters.status,
  }

  Object.entries(optionalFilters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params[key] = value
    }
  })

  return params
}

export const buildMaintenanceCountParams = (
  filters: MaintenanceFilters
): Record<string, unknown> => {
  const params: Record<string, unknown> = {}
  const optionalFilters: Partial<MaintenanceFilters> = {
    company: filters.company,
    analyst: filters.analyst,
    country: filters.country,
    status: filters.status,
  }

  Object.entries(optionalFilters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params[key] = value
    }
  })

  return params
}

type FilterMode =
  | {
      filterType?: undefined
      search?: string
      skip?: number
      limit?: number
    }
  | {
      filterType: 'ticker' | 'analyst' | 'country' | 'status'
      search?: string
      skip?: number
      limit?: number
    }

export const useMaintenanceFiltersQuery = (
  subTab: 'active' | 'completed' | 'deleted',
  enabled: boolean,
  options?: FilterMode
) => {
  const { filterType, search, skip = 0, limit = 100 } = options ?? {}

  return useQuery({
    queryKey: ['maintenance', 'filters', subTab, filterType ?? 'all', search ?? '', skip, limit],
    enabled,
    queryFn: async () => {
      const res = await maintenanceService.getFilters({
        tab: subTab,
        filter_type: filterType ?? 'all',
        search,
        skip,
        limit,
      })
      const payload = (res as { data?: unknown }).data ?? res
      return payload
    },
  })
}

export const useMaintenanceSummaryQuery = (
  filters: MaintenanceFilters,
  subTab: 'active' | 'completed' | 'deleted',
  enabled: boolean
) =>
  useQuery({
    queryKey: ['maintenance', 'summary', subTab, filters],
    enabled,
    queryFn: async () => {
      const res = await maintenanceService.getSummary(buildMaintenanceParams(filters, subTab))
      return res.data as MaintenanceSummaryResponse['data']
    },
  })

export const useMaintenanceTabCountsQuery = (filters: MaintenanceFilters, enabled: boolean) =>
  useQuery({
    queryKey: ['maintenance', 'tab-counts', filters],
    enabled,
    queryFn: async () => {
      const res = await maintenanceService.getTabCounts(buildMaintenanceCountParams(filters))
      return (res as { data?: unknown }).data as {
        active?: number
        completed?: number
        deleted?: number
      }
    },
  })

export const useMaintenanceDropdownCompaniesQuery = (enabled: boolean, search?: string) =>
  useQuery({
    queryKey: ['maintenance', 'dropdown-companies', search ?? ''],
    enabled,
    queryFn: async () => {
      const res = await maintenanceService.getDropdownCompanies(search ? { search } : undefined)
      return res.data
    },
  })

export const useMaintenanceAnalystsQuery = (enabled: boolean) =>
  useQuery({
    queryKey: ['maintenance', 'analysts'],
    enabled,
    queryFn: async () => {
      const res = await maintenanceService.getOnlyAnalysts()
      const users = Array.isArray(res.data)
        ? res.data
        : ((res.data as { users?: MaintenanceAnalystResponseItem[] }).users ?? [])
      return users
    },
  })

/** Pipeline Maintenance tab: analyst toolbar options from assignees API . */
export function usePipelineMaintenanceAnalystOptions(options: {
  enabled: boolean
  limit?: number
  valueKind?: 'id' | 'name'
}) {
  const { enabled, limit = 100, valueKind = 'id' } = options

  const query = useQuery({
    queryKey: ['maintenance', 'pipeline-maintenance-analysts', limit],
    enabled,
    queryFn: async () => {
      const res = await maintenanceService.getAnalysts({ limit, skip: 0 })
      const users = Array.isArray(res.data)
        ? res.data
        : ((res.data as { users?: MaintenanceAnalystResponseItem[] }).users ?? [])
      return users
    },
  })

  const analystOptions = useMemo(() => {
    const allLabel = 'All Analysts'
    const mapped =
      query.data?.map((item) => {
        const label = item.full_name ?? item.name ?? item.email ?? String(item.id ?? '')
        const value = valueKind === 'name' ? label : String(item.id ?? '')
        return { value, label }
      }) ?? []
    return [{ value: 'all', label: allLabel }, ...mapped]
  }, [query.data, valueKind])

  return { ...query, analystOptions }
}

export const useMaintenanceMutations = () => {
  const queryClient = useQueryClient()

  const createTask = useMutation({
    mutationFn: (payload: {
      title?: string
      ticker: string
      action: string
      due_date?: string
      assignee: string[]
      important?: boolean
      status?: MaintenanceStatus
      company_id?: string | number
    }) =>
      maintenanceService.createTask({
        company_id: payload.company_id,
        title: payload.title,
        ticker: payload.ticker,
        action: payload.action,
        due_date: payload.due_date,
        assignee: payload.assignee,
        status: payload.status,
        important: payload.important,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'summary'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'tab-counts'] })
    },
  })

  const updateTask = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number
      payload: Partial<{
        title?: string
        action?: string
        notes?: string
        due_date?: string | null
        important?: boolean
        company_id?: string | number
        status?: MaintenanceStatus
      }>
    }) => maintenanceService.updateTask(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'summary'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'tab-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'task', variables.id] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: MaintenanceStatus }) =>
      maintenanceService.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'summary'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'tab-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'task', variables.id] })
    },
  })

  const deleteTask = useMutation({
    mutationFn: (id: string | number) => maintenanceService.deleteTask(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'summary'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'tab-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'task', variables] })
    },
  })

  const restoreTask = useMutation({
    mutationFn: (id: string | number) => maintenanceService.restoreTask(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'summary'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'tab-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'task', variables] })
    },
  })

  const watchTask = useMutation({
    mutationFn: ({ id, watch }: { id: string | number; watch: boolean }) =>
      watch ? maintenanceService.watchTask(id) : maintenanceService.unwatchTask(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'summary'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'tab-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['maintenance', 'task', variables.id] })
    },
  })

  return {
    createTask,
    updateTask,
    updateStatus,
    deleteTask,
    restoreTask,
    watchTask,
  }
}

export function usePipelineOriginationAnalystOptions(options: {
  enabled: boolean
  skip?: number
  limit?: number
  valueKind?: 'id' | 'name'
}) {
  const { enabled, valueKind = 'id' } = options

  const query = useMaintenanceAnalystsQuery(enabled)

  const analystOptions = useMemo(() => {
    const allLabel = 'All Analysts'

    const mapped =
      query.data?.map((item) => {
        const label = item.full_name ?? item.name ?? item.email ?? String(item.id ?? '')
        const value = valueKind === 'name' ? label : String(item.id ?? '')
        return { value, label }
      }) ?? []

    return [{ value: 'all', label: allLabel }, ...mapped]
  }, [query.data, valueKind])

  return { ...query, analystOptions }
}
