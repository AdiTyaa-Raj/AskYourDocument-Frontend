import type {
  MaintenanceCategoryKey,
  MaintenanceCategoryState,
  MaintenanceStatus,
  MaintenanceAssignee,
  MaintenanceTask,
  MaintenanceFilters,
} from './maintenance-types'
import type {
  MaintenanceAssigneeApi,
  MaintenanceCategoryApi,
  MaintenanceTaskApi,
  MaintenanceCategoryKeyApi,
} from '@/services/api/maintenance.service'

const CATEGORY_LABELS: Record<MaintenanceCategoryKey, string> = {
  due_1_week: 'Due: 1 Week',
  due_1_month: 'Due: 1 Month',
  due_quarter: 'Due: 1 Quarter',
  overdue: 'Overdue',
}

export const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'TODO', label: 'To Do' },
  { value: 'INPROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
]

export const ACTIVE_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'TODO', label: 'To Do' },
  { value: 'INPROGRESS', label: 'In Progress' },
]

export const NA_STATUS_OPTION: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Status N/A' },
]

export const DEFAULT_FILTERS: MaintenanceFilters = {
  company: 'all',
  analyst: 'all',
  status: 'all',
  country: 'all',
}

export const buildMaintenanceCategories = (
  tasks: MaintenanceTask[]
): MaintenanceCategoryState[] => {
  const buckets: Record<MaintenanceCategoryKey, MaintenanceTask[]> = {
    due_1_week: [],
    due_1_month: [],
    due_quarter: [],
    overdue: [],
  }

  const now = new Date()

  tasks.forEach((task) => {
    if (task.category) {
      buckets[task.category].push(task)
      return
    }

    const dueDate = task.due_date ? new Date(task.due_date) : null
    const diffDays = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / 86400000) : 0

    let key: MaintenanceCategoryKey = 'due_quarter'
    if (!dueDate || diffDays < 0) {
      key = 'overdue'
    } else if (diffDays <= 7) {
      key = 'due_1_week'
    } else if (diffDays <= 30) {
      key = 'due_1_month'
    } else if (diffDays <= 90) {
      key = 'due_quarter'
    }

    buckets[key].push(task)
  })

  const categoryOrder: MaintenanceCategoryKey[] = CATEGORY_ORDER

  return categoryOrder.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    items: buckets[key].sort((a, b) => {
      const aDate = a.due_date ? new Date(a.due_date).getTime() : 0
      const bDate = b.due_date ? new Date(b.due_date).getTime() : 0
      return aDate - bDate
    }),
  }))
}

export const CATEGORY_ORDER: MaintenanceCategoryKeyApi[] = [
  'due_1_week',
  'due_1_month',
  'due_quarter',
  'overdue',
]

export const formatMaintenanceStatusLabel = (status?: MaintenanceStatus | null) => {
  switch (status) {
    case 'INPROGRESS':
      return 'In Progress'
    case 'DONE':
      return 'Done'
    case 'TODO':
    default:
      return 'To Do'
  }
}

export const normaliseMaintenanceStatus = (status?: string | null): MaintenanceStatus => {
  if (status === 'INPROGRESS' || status === 'DONE' || status === 'TODO') {
    return status
  }
  return 'TODO'
}

export function getMaintenanceTaskUrlState(params: {
  pathname: string
  searchParams: URLSearchParams | string
  selectedTaskId?: string | number | null
}): { currentUrl: string; nextUrl: string } {
  const searchParams =
    typeof params.searchParams === 'string'
      ? new URLSearchParams(params.searchParams)
      : new URLSearchParams(params.searchParams.toString())
  const currentQuery =
    typeof params.searchParams === 'string' ? params.searchParams : params.searchParams.toString()
  const currentUrl = currentQuery ? `${params.pathname}?${currentQuery}` : params.pathname
  const nextId = params.selectedTaskId != null ? String(params.selectedTaskId) : null

  if (nextId) {
    searchParams.set('taskId', nextId)
    searchParams.delete('maintenanceId')
  } else {
    searchParams.delete('taskId')
    searchParams.delete('maintenanceId')
  }

  const query = searchParams.toString()
  const nextUrl = query ? `${params.pathname}?${query}` : params.pathname
  return { currentUrl, nextUrl }
}

export const formatDueDate = (value?: string | null): string => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const getMaintenanceStatusClass = (status?: MaintenanceStatus | null) => {
  switch (status) {
    case 'INPROGRESS':
      return 'text-blue-700'
    case 'DONE':
      return 'text-green-700'
    case 'TODO':
    default:
      return 'text-muted-foreground'
  }
}

const mapAssignee = (assignee: MaintenanceAssigneeApi): MaintenanceAssignee => {
  const name = assignee.full_name || assignee.name || assignee.email || '-'
  return {
    id: assignee.id,
    name,
    email: assignee.email,
  }
}

export const mapApiTaskToTask = (task: MaintenanceTaskApi): MaintenanceTask => {
  const assigneesRaw = Array.isArray(task.assignee) ? task.assignee : (task.assignees ?? [])
  let createdBy: string | undefined
  if (typeof task.created_by === 'string') {
    createdBy = task.created_by
  } else {
    createdBy = task.created_by?.name ?? undefined
  }
  const rawDeletedBy = (task as { deleted_by?: unknown }).deleted_by
  let deletedBy: string | undefined
  if (typeof rawDeletedBy === 'string') {
    deletedBy = rawDeletedBy
  } else if (rawDeletedBy && typeof rawDeletedBy === 'object') {
    const deletedObj = rawDeletedBy as { name?: string; id?: string | number }
    deletedBy = deletedObj.name
  }
  return {
    id: task.id,
    company_id: task.company_id,
    company_name: (task as { company_name?: string }).company_name,
    title: task.title ?? '',
    ticker: task.ticker,
    action: task.action ?? '',
    notes: task.notes,
    company: task.company ?? task.company_name ?? task.ticker,
    country: task.country,
    due_date: task.due_date ?? null,
    assignees: assigneesRaw.map(mapAssignee),
    important: Boolean(task.important),
    status: normaliseMaintenanceStatus(task.status),
    created_by: createdBy,
    created_at: task.created_at,
    updated_at: task.updated_at,
    deleted_at: task.deleted_at ?? null,
    deleteRequested: Boolean(task.deleted_at),
    deleted_by: deletedBy,
    stageLabel: task.stage_label,
    can_watch: (task as { can_watch?: boolean }).can_watch,
    watching:
      (task as unknown as { watching?: boolean; is_watching?: boolean })?.watching ??
      (task as unknown as { watching?: boolean; is_watching?: boolean })?.is_watching ??
      false,
  }
}

export const mapCategoryApiToState = (
  key: MaintenanceCategoryKey,
  category?: MaintenanceCategoryApi
): MaintenanceCategoryState => ({
  key,
  label: CATEGORY_LABELS[key],
  items: (category?.items ?? []).map(mapApiTaskToTask),
  total: category?.total,
  limit: category?.limit,
  has_more: category?.has_more,
})
