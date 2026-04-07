import { describe, expect, it } from 'vitest'

import { __approvalsTestHelpers } from '@/containers/approvals/lib/queries'
import type {
  ApprovalHistoryResponseApi,
  ApprovalListResponseApi,
  ApprovalLineApi,
  ApprovalRequestApi,
} from '@/services/api/approvals.service'
import type { UserDirectoryMap } from '@/services/api/users.service'

const {
  calculateDaysSince,
  formatStage,
  groupApprovalRows,
  extractRequiredRoles,
  mapApprovalGroup,
  mapHistoryResponse,
} = __approvalsTestHelpers

describe('Approvals query helpers', () => {
  it('calculates elapsed days from timestamp', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(calculateDaysSince(threeDaysAgo)).toBeGreaterThanOrEqual(3)
    expect(calculateDaysSince('invalid-date')).toBe(0)
  })

  it('formats stage slugs into readable labels', () => {
    expect(formatStage('FINAL_DILIGENCE')).toBe('Final Diligence')
    expect(formatStage()).toBe('Unknown')
  })

  it('groups approval rows by request id', () => {
    const requestOne: ApprovalRequestApi = {
      id: 1,
      status: 'pending',
      payload: {},
    }
    const requestTwo: ApprovalRequestApi = {
      id: 2,
      status: 'pending',
      payload: {},
    }
    const lineOne: ApprovalLineApi = { id: 'line-1', request_id: '1' }
    const lineTwo: ApprovalLineApi = { id: 'line-2', request_id: '1' }

    const rows: ApprovalListResponseApi['results'] = [
      { ApprovalRequest: requestOne, ApprovalLine: lineOne },
      { ApprovalRequest: requestOne, ApprovalLine: lineTwo },
      { ApprovalRequest: requestTwo, ApprovalLine: null },
    ]

    const groups = groupApprovalRows(rows)
    expect(groups).toHaveLength(2)
    const first = groups.find((group) => group.request.id === 1)
    expect(first?.lines).toHaveLength(2)
  })

  it('extracts required roles from stage config', () => {
    expect(extractRequiredRoles()).toBeUndefined()
    expect(
      extractRequiredRoles({
        required_roles: ['arnie-lead-investor'],
      })
    ).toEqual(['arnie-lead-investor'])

    expect(
      extractRequiredRoles({
        levels: [
          { required_roles: ['arnie-primary-analyst'] },
          { required_roles: ['arnie-secondary-analyst'] },
        ],
      })
    ).toEqual(['arnie-primary-analyst', 'arnie-secondary-analyst'])
  })

  it('maps approval group into request view model', () => {
    const createdAt = new Date().toISOString()
    const group: {
      request: ApprovalRequestApi
      lines: ApprovalLineApi[]
      role?: { name?: string | null }
      canApprove: boolean
      alreadyApproved: boolean
      cannotApprove: boolean
    } = {
      request: {
        id: 10,
        status: 'pending',
        created_at: createdAt,
        requester_user_id: 5,
        payload: {
          ticker: 'AAPL',
          from_stage: 'ACTIVE_DISCUSSION',
          to_stage: 'VCP',
          rationale: 'Ready for VCP review',
          documents: {
            'screen.xlsx': 12,
            'VCP Going-In Note': 77,
            'Risk Review Summary': 88,
          },
          requested_by: 'Sarah Miller',
        },
        approval_config_snapshot: {
          stages: {
            VCP: {
              required_roles: ['arnie-lead-investor'],
              required_documents: ['vcp_summary.pdf'],
            },
          },
        },
      } satisfies ApprovalRequestApi,
      lines: [],
      role: { name: 'arnie-primary-analyst' },
      canApprove: true,
      alreadyApproved: false,
      cannotApprove: false,
    }

    const companyMap: Record<
      string,
      { id: number; ticker: string; name: string; meta?: Record<string, unknown> | null }
    > = {
      AAPL: {
        id: 1,
        ticker: 'AAPL',
        name: 'Apple Inc.',
        meta: {
          sector: 'Technology',
          primary_analyst_initials: 'SM',
        },
      },
    }

    const result = mapApprovalGroup(group, companyMap)
    expect(result.kind).toBe('stage')
    if (result.kind !== 'stage') throw new Error('Expected stage approval')
    expect(result.ticker).toBe('AAPL')
    expect(result.toStage).toBe('VCP')
    expect(result.rationale).toContain('Ready for VCP review')
    expect(result.documents).toHaveLength(3)
    const docNames = result.documents.map((doc) => doc.name)
    expect(docNames).toEqual(
      expect.arrayContaining(['screen.xlsx', 'VCP Going-In Note', 'Risk Review Summary'])
    )
    expect(result.overview.primaryAnalyst).toBe('SM')
    expect(result.requester.role).toBe('Primary Analyst')
    expect(result.requiredRoles).toEqual(['arnie-lead-investor'])
    expect(result.status).toBe('pending')
    expect(result.canApprove).toBe(true)
    expect(result.alreadyApproved).toBe(false)
    expect(result.cannotApprove).toBe(false)
  })

  it('uses role from approval response when available', () => {
    const group = {
      request: {
        id: 55,
        status: 'pending',
        requester_user_id: 99,
        payload: {
          ticker: 'META',
          from_stage: 'WATCHLIST',
          to_stage: 'ACTIVE_DISCUSSION',
        },
      } satisfies ApprovalRequestApi,
      lines: [],
      role: { name: 'arnie-secondary-analyst' },
      canApprove: true,
      alreadyApproved: false,
      cannotApprove: false,
    }
    const companyMap = {
      META: { id: 4, ticker: 'META', name: 'Meta Platforms' },
    }

    const result = mapApprovalGroup(
      group as unknown as Parameters<typeof mapApprovalGroup>[0],
      companyMap
    )
    expect(result.requester.role).toBe('Secondary Analyst')
  })

  it('marks reactivation requests coming from Early Terminated to Watchlist', () => {
    const createdAt = new Date().toISOString()
    const group = {
      request: {
        id: 30,
        status: 'pending',
        created_at: createdAt,
        payload: {
          ticker: 'CRM',
          from_stage: 'EARLY_TERMINATED',
          to_stage: 'WATCHLIST',
        },
        approval_config_snapshot: {
          stages: {},
        },
      } satisfies ApprovalRequestApi,
      lines: [],
      canApprove: true,
      alreadyApproved: false,
      cannotApprove: false,
    }
    const companyMap = {
      CRM: {
        id: 9,
        ticker: 'CRM',
        name: 'Salesforce',
      },
    }

    const result = mapApprovalGroup(group, companyMap)
    if (result.kind !== 'stage') throw new Error('Expected stage approval')
    expect(result.isReactivationRequest).toBe(true)
    expect(result.fromStage).toBe('Early Terminated')
    expect(result.toStage).toBe('Watchlist')
  })

  it('falls back to analyst info when requester name missing', () => {
    const group = {
      request: {
        id: 15,
        status: 'pending',
        payload: {
          ticker: 'MSFT',
          from_stage: 'WATCHLIST',
          to_stage: 'ACTIVE_DISCUSSION',
        },
      } satisfies ApprovalRequestApi,
      lines: [],
      canApprove: false,
      alreadyApproved: false,
      cannotApprove: true,
    }

    const companyMap = {
      MSFT: {
        id: 2,
        ticker: 'MSFT',
        name: 'Microsoft',
        meta: {
          primary_analyst_full_name: 'Isaac Chen',
        },
      },
    }

    const result = mapApprovalGroup(group, companyMap)
    expect(result.requester.name).toBe('Isaac Chen')
    expect(result.cannotApprove).toBe(true)
  })

  it('maps memo approval group into memo view model', () => {
    const createdAt = new Date().toISOString()
    const group: {
      request: ApprovalRequestApi
      lines: ApprovalLineApi[]
      canApprove: boolean
      alreadyApproved: boolean
      cannotApprove: boolean
    } = {
      request: {
        id: 20,
        status: 'pending',
        created_at: createdAt,
        requester_user_id: 4,
        type: 'memo_approval',
        payload: {
          memo_id: 42,
          title: 'VCP Screen Update',
          template_type: 'VCP_SCREEN',
          companies: [
            { id: '1', ticker: 'ABNB', name: 'Airbnb Inc.' },
            { id: '2', ticker: 'SHOP', name: 'Shopify Inc.' },
          ],
          relevant_documents: ['99', 100],
          rationale: 'Updated unit metrics after earnings.',
        },
      } satisfies ApprovalRequestApi,
      lines: [],
      canApprove: false,
      alreadyApproved: false,
      cannotApprove: false,
    }

    const result = mapApprovalGroup(group, {})
    expect(result.kind).toBe('memo')
    if (result.kind !== 'memo') throw new Error('Expected memo approval')
    expect(result.memoId).toBe(42)
    expect(result.title).toBe('VCP Screen Update')
    expect(result.templateLabel).toBe('VCP Screen')
    expect(result.companies).toHaveLength(2)
    expect(result.documents).toHaveLength(2)
    expect(result.rationale).toContain('Updated unit metrics')
    expect(result.canApprove).toBe(false)
    expect(result.alreadyApproved).toBe(false)
    expect(result.cannotApprove).toBe(false)
  })

  it('preserves canApprove flags when grouping rows', () => {
    const rows = [
      {
        ApprovalRequest: { id: 1, status: 'pending', payload: {} } as ApprovalRequestApi,
        ApprovalLine: null,
        can_approve: true,
        already_approved: true,
        cannot_approve: false,
      },
      {
        ApprovalRequest: { id: 2, status: 'pending', payload: {} } as ApprovalRequestApi,
        ApprovalLine: null,
        can_approve: false,
        already_approved: false,
        cannot_approve: true,
      },
    ]

    const groups = groupApprovalRows(rows as unknown as ApprovalListResponseApi['results'])
    expect(groups).toHaveLength(2)
    const first = groups.find((group) => group.request.id === 1)
    const second = groups.find((group) => group.request.id === 2)
    expect(first?.canApprove).toBe(true)
    expect(second?.canApprove).toBe(false)
    expect(first?.alreadyApproved).toBe(true)
    expect(first?.cannotApprove).toBe(false)
    expect(second?.alreadyApproved).toBe(false)
    expect(second?.cannotApprove).toBe(true)
  })

  it('calculates days pending based on updated timestamp', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const group: {
      request: ApprovalRequestApi
      lines: ApprovalLineApi[]
      canApprove: boolean
      alreadyApproved: boolean
      cannotApprove: boolean
    } = {
      request: {
        id: 11,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: fiveDaysAgo,
        payload: {
          ticker: 'MSFT',
          from_stage: 'WATCHLIST',
          to_stage: 'ACTIVE_DISCUSSION',
        },
      } satisfies ApprovalRequestApi,
      lines: [],
      canApprove: true,
      alreadyApproved: false,
      cannotApprove: false,
    }

    const companyMap = {
      MSFT: {
        id: 2,
        ticker: 'MSFT',
        name: 'Microsoft Corporation',
      },
    }

    const result = mapApprovalGroup(group, companyMap)
    expect(result.daysPending).toBeGreaterThanOrEqual(5)
  })

  it('maps approval history response into entries', () => {
    const response = {
      ticker: 'AAPL',
      approvals: [
        [
          {
            id: 1,
            payload: {
              ticker: 'AAPL',
              company: 'Apple Inc.',
            },
            audit_logs: [
              {
                id: 100,
                action: 'approved',
                created_at: '2025-10-20T12:00:00Z',
                actor_user_id: 9,
                details: { comment: 'Looks good' },
              },
            ],
          },
          null,
        ],
      ],
      total: 1,
    } as unknown as ApprovalHistoryResponseApi

    const entries = mapHistoryResponse(response)
    expect(entries).toHaveLength(1)
    expect(entries[0].decision).toBe('Approved')
    expect(entries[0].approver).toBe('User 9')
  })

  it('uses directory names for history approvers when present', () => {
    const response = {
      ticker: 'SPOT',
      approvals: [
        [
          {
            id: 5,
            payload: {
              ticker: 'SPOT',
              company: 'Spotify',
            },
            audit_logs: [
              {
                id: 200,
                action: 'approved',
                created_at: '2025-10-21T12:00:00Z',
                actor_user_id: 44,
              },
            ],
          },
          null,
        ],
      ],
      total: 1,
    } as unknown as ApprovalHistoryResponseApi

    const directory: UserDirectoryMap = {
      44: {
        id: 44,
        fullName: 'Priya Malhotra',
        email: 'priya@example.com',
      },
    }

    const entries = mapHistoryResponse(response, directory)
    expect(entries).toHaveLength(1)
    expect(entries[0].approver).toBe('Priya Malhotra')
  })

  it('uses approval line data when audit logs are absent', () => {
    const response = {
      ticker: 'AAPL',
      approvals: [
        [
          {
            id: 2,
            payload: {
              ticker: 'AAPL',
              company: 'Apple Inc.',
            },
            created_at: '2025-10-21T09:00:00Z',
            status: 'approved',
          },
          {
            id: 'line-1',
            decision: 'approved',
            decision_rationale: 'All good',
            decided_by_user_id: 7,
            created_at: '2025-10-22T10:00:00Z',
          },
        ],
      ],
      total: 1,
    } as unknown as ApprovalHistoryResponseApi

    const entries = mapHistoryResponse(response)
    expect(entries).toHaveLength(1)
    expect(entries[0].decision).toBe('Approved')
    expect(entries[0].approver).toBe('User 7')
    expect(entries[0].comment).toBe('All good')
  })

  it('skips pending approvals in history when no decisions exist', () => {
    const response = {
      ticker: 'ADBE',
      approvals: [
        [
          {
            id: 3,
            created_at: '2025-11-03T05:40:11.211939Z',
            status: 'pending',
            requester_user_id: 1,
            payload: {
              ticker: 'ADBE',
              company: 'Adobe Inc.',
              rationale: 'passed initial screening',
              requested_by: 'Alex Analyst',
            },
          },
          {
            id: 'line-1',
            request_id: '3',
            decision: 'pending',
            created_at: '2025-11-03T05:40:11.307855Z',
          },
        ],
      ],
      total: 1,
    } as unknown as ApprovalHistoryResponseApi

    const entries = mapHistoryResponse(response)
    expect(entries).toHaveLength(0)
  })
})
