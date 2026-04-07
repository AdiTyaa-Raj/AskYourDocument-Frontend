import { describe, expect, it } from 'vitest'

import {
  ACTIVE_STATUS_OPTIONS,
  NA_STATUS_OPTION,
  CATEGORY_ORDER,
  buildMaintenanceCategories,
  formatMaintenanceStatusLabel,
  mapApiTaskToTask,
  normaliseMaintenanceStatus,
} from '@/containers/pipeline/lib/maintenance-helpers'
import { buildMaintenanceParams } from '@/containers/pipeline/lib/maintenance-queries'
import type { MaintenanceTaskApi } from '@/services/api/maintenance.service'

describe('maintenance helpers', () => {
  it('buildMaintenanceParams keeps only non-all filters', () => {
    const params = buildMaintenanceParams(
      {
        company: 'ABC',
        analyst: 'all',
        country: undefined,
        status: 'TODO',
      },
      'active'
    )
    expect(params).toEqual({
      limit: 10,
      tab: 'active',
      company: 'ABC',
      status: 'TODO',
    })
  })

  it('maps API task including watch flags and names', () => {
    const apiTask: MaintenanceTaskApi = {
      id: 1,
      ticker: 'AAPL',
      action: 'Do thing',
      status: 'TODO',
      assignee: [
        { id: '1', full_name: 'Jane' },
        { id: '2', email: 'j@x.com' },
      ],
      created_by: { id: '9', name: 'Creator' },
      deleted_by: { id: '10', name: 'Deleter' } as unknown as string,
      watching: true,
    }

    const mapped = mapApiTaskToTask(apiTask)
    expect(mapped.title).toBe('')
    expect(mapped.action).toBe('Do thing')
    expect(mapped.assignees).toHaveLength(2)
    expect(mapped.created_by).toBe('Creator')
    expect(mapped.deleted_by).toBe('Deleter')
    expect(mapped.watching).toBe(true)
  })

  it('prefers is_watching flag when present', () => {
    const apiTask = {
      id: 2,
      ticker: 'MSFT',
      action: 'Action',
      status: 'TODO',
      is_watching: true,
    } as MaintenanceTaskApi
    expect(mapApiTaskToTask(apiTask).watching).toBe(true)
  })

  it('normalises status and labels', () => {
    expect(normaliseMaintenanceStatus('INPROGRESS')).toBe('INPROGRESS')
    expect(normaliseMaintenanceStatus('')).toBe('TODO')
    expect(formatMaintenanceStatusLabel('INPROGRESS')).toBe('In Progress')
  })

  it('builds categories with correct default ordering', () => {
    const categories = buildMaintenanceCategories([
      { id: 1, ticker: 'AAPL', action: '', assignees: [], status: 'TODO', due_date: null },
    ])
    expect(categories.map((c) => c.key)).toEqual(CATEGORY_ORDER)
  })

  it('exposes active and inactive status options correctly', () => {
    expect(ACTIVE_STATUS_OPTIONS.map((o) => o.value)).toEqual(['all', 'TODO', 'INPROGRESS'])
    expect(NA_STATUS_OPTION.map((o) => o.value)).toEqual(['all'])
  })
})
