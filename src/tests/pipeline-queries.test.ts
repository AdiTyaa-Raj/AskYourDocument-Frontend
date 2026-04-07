import { describe, expect, it } from 'vitest'

import { calculateDaysInStage } from '@/containers/pipeline/lib/helpers'
import type { PipelineStageInfo } from '@/containers/pipeline/lib/types'
import { attachmentsToRecord, type StageAttachment } from '@/lib/attachments'
import { __pipelineTestHelpers } from '@/containers/pipeline/lib/queries'
import type { PipelineStageCompanyRecordApi } from '@/services/api/pipeline.service'
import type { ApprovalRequestApi } from '@/services/api/approvals.service'

const {
  normaliseStage,
  extractRequiredRoles,
  deriveStatusFromApproval,
  mapCompanyRecordToCard,
  formatApprover,
} = __pipelineTestHelpers

describe('Pipeline query helpers', () => {
  it('normalises stage metadata and allowed transitions', () => {
    const stage = normaliseStage({
      slug: 'ACTIVE_DISCUSSION',
      name: 'Active Discussion',
      order: 3,
      meta: {
        allowed_next: ['VCP', 'ARCHIVE'],
      },
    })

    expect(stage.slug).toBe('ACTIVE_DISCUSSION')
    expect(stage.allowedNext).toEqual(['VCP', 'ARCHIVE'])
    expect(stage.name).toBe('Active Discussion')
  })

  it('preserves early termination stage ordering and transitions', () => {
    const stage = normaliseStage({
      slug: 'EARLY_TERMINATED',
      name: 'Early Terminated',
      order: 9,
      meta: {},
    })

    expect(stage.slug).toBe('EARLY_TERMINATED')
    expect(stage.name).toBe('Early Terminated')
    expect(stage.allowedNext).toEqual([])
  })

  it('extracts required roles from stage config snapshot', () => {
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

  it('derives status metadata for approvals', () => {
    expect(deriveStatusFromApproval(undefined)).toEqual({ status: 'on-track', label: 'On track' })
    const pending = deriveStatusFromApproval({ status: 'pending' } as ApprovalRequestApi, 'VCP')
    expect(pending.status).toBe('pending')
    expect(pending.label).toMatch(/Pending/)
    const rejected = deriveStatusFromApproval({ status: 'rejected' } as ApprovalRequestApi)
    expect(rejected.status).toBe('rejected')
    expect(rejected.description).toMatch(/Review/)
  })

  it('maps API company records to pipeline cards with approval summary', () => {
    const stageEntries: PipelineStageInfo[] = [
      { slug: 'WATCHLIST', name: 'Watchlist', order: 2, allowedNext: ['ACTIVE_DISCUSSION'] },
      { slug: 'ACTIVE_DISCUSSION', name: 'Active Discussion', order: 3, allowedNext: ['VCP'] },
    ]
    const stageMap = stageEntries.reduce<Record<string, PipelineStageInfo>>((acc, stage) => {
      acc[stage.slug] = stage
      return acc
    }, {})

    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 1,
        ticker: 'ABNB',
        name: 'Airbnb Inc.',
        meta: {
          primary_analyst_initials: 'SM',
          secondary_analyst_initials: 'IC',
          exchange: 'NASDAQ',
        },
      },
      StageAssignment: {
        id: 1,
        stage_id: 2,
        company_id: 1,
        created_at: '2025-10-25T00:00:00Z',
      },
      Stage: stageEntries[0],
      current_approval_request: [
        {
          id: 10,
          status: 'pending',
          payload: {
            to_stage: 'ACTIVE_DISCUSSION',
            from_stage: 'WATCHLIST',
            rationale: 'Strong conviction on traveller demand',
          },
          approval_config_snapshot: {
            stages: {
              ACTIVE_DISCUSSION: {
                required_roles: ['arnie-lead-investor'],
                required_documents: ['initial_brief'],
                rationale_required: 150,
              },
            },
          },
          created_at: '2025-10-26T00:00:00Z',
        },
      ],
    }

    const card = mapCompanyRecordToCard(record, stageMap)

    expect(card.ticker).toBe('ABNB')
    expect(card.exchange).toBe('NASDAQ')
    expect(card.stageSlug).toBe('WATCHLIST')
    expect(card.status).toBe('pending')
    expect(card.statusLabel).toMatch(/Pending/)
    expect(card.currentApproval?.toStage).toBe('ACTIVE_DISCUSSION')
    expect(card.currentApproval?.requiredRoles).toEqual(['arnie-lead-investor'])
    expect(card.currentApproval?.rationaleRequired).toBe(150)
  })

  it('maps exchange from Company top-level when meta has no exchange', () => {
    const stageMap: Record<string, PipelineStageInfo> = {
      WATCHLIST: { slug: 'WATCHLIST', name: 'Watchlist', order: 2, allowedNext: [] },
    }
    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 99,
        ticker: 'TEST',
        name: 'Test Co',
        exchange: 'NYSE',
        meta: {},
      },
      StageAssignment: {
        id: 1,
        stage_id: 2,
        company_id: 99,
        created_at: '2025-10-25T00:00:00Z',
      },
      Stage: stageMap.WATCHLIST,
      current_approval_request: [],
    }
    const card = mapCompanyRecordToCard(record, stageMap)
    expect(card.exchange).toBe('NYSE')
  })

  it('maps records without approvals to on-track cards', () => {
    const stageMap: Record<string, PipelineStageInfo> = {
      APPROVED: { slug: 'APPROVED', name: 'Approved', order: 6, allowedNext: ['INVESTED'] },
    }

    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 2,
        ticker: 'MSFT',
        name: 'Microsoft Corp.',
        meta: {
          primary_analyst: 'IC',
        },
      },
      StageAssignment: {
        id: 2,
        company_id: 2,
        stage_id: 6,
        created_at: '2025-10-01T00:00:00Z',
      },
      Stage: stageMap.APPROVED,
      current_approval_request: [],
    }

    const card = mapCompanyRecordToCard(record, stageMap)

    expect(card.status).toBe('on-track')
    expect(card.statusLabel).toContain('On track')
    expect(card.currentApproval).toBeUndefined()
  })

  it('includes rejection metadata when audit logs are available', () => {
    const stageMap: Record<string, PipelineStageInfo> = {
      ACTIVE_DISCUSSION: {
        slug: 'ACTIVE_DISCUSSION',
        name: 'Active Discussion',
        order: 3,
        allowedNext: ['VCP'],
      },
      VCP: { slug: 'VCP', name: 'VCP', order: 4, allowedNext: [] },
    }

    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 9,
        ticker: 'NFLX',
        name: 'Netflix',
      },
      StageAssignment: {
        id: 9,
        company_id: 9,
        stage_id: 3,
        created_at: '2025-10-10T00:00:00Z',
      },
      Stage: stageMap.ACTIVE_DISCUSSION,
      current_approval_request: [
        {
          id: 44,
          status: 'rejected',
          requester_user_id: 5,
          payload: {
            to_stage: 'VCP',
            from_stage: 'ACTIVE_DISCUSSION',
            rationale: 'Ready for IC review',
          },
          approval_config_snapshot: {
            stages: {
              VCP: {
                required_roles: ['arnie-primary-analyst'],
              },
            },
          },
          created_at: '2025-10-12T00:00:00Z',
          audit_logs: [
            {
              id: 1001,
              action: 'approved',
              created_at: '2025-10-12T05:00:00Z',
              details: { comment: 'Initial approval' },
            },
            {
              id: 1002,
              action: 'rejected',
              created_at: '2025-10-13T12:34:00Z',
              details: { comment: 'Need more diligence on churn' },
            },
          ],
        },
      ],
    }

    const card = mapCompanyRecordToCard(record, stageMap)

    expect(card.status).toBe('rejected')
    expect(card.currentApproval?.decisionMeta?.status).toBe('rejected')
    expect(card.currentApproval?.decisionMeta?.comment).toBeUndefined()
    expect(card.currentApproval?.decisionMeta?.decidedAt).toBeUndefined()
  })

  it('does not use payload rejection reason when decision rationale is missing', () => {
    const stageMap: Record<string, PipelineStageInfo> = {
      WATCHLIST: {
        slug: 'WATCHLIST',
        name: 'Watchlist',
        order: 2,
        allowedNext: ['ACTIVE_DISCUSSION'],
      },
      ACTIVE_DISCUSSION: {
        slug: 'ACTIVE_DISCUSSION',
        name: 'Active Discussion',
        order: 3,
        allowedNext: ['VCP'],
      },
    }

    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 11,
        ticker: 'SHOP',
        name: 'Shopify',
      },
      StageAssignment: {
        id: 11,
        company_id: 11,
        stage_id: 2,
        created_at: '2025-09-01T00:00:00Z',
      },
      Stage: stageMap.WATCHLIST,
      current_approval_request: [
        {
          id: 55,
          status: 'rejected',
          payload: {
            to_stage: 'ACTIVE_DISCUSSION',
            from_stage: 'WATCHLIST',
            rationale: 'Solid pipeline build',
            rejection_reason: 'Screen memo missing key metrics',
          },
          created_at: '2025-09-05T00:00:00Z',
          audit_logs: [
            {
              id: 2001,
              action: 'rejected',
              created_at: '2025-09-05T13:30:00Z',
              details: {},
            },
          ],
        },
      ],
    }

    const card = mapCompanyRecordToCard(record, stageMap)
    expect(card.currentApproval?.decisionMeta?.comment).toBeUndefined()
    expect(card.currentApproval?.decisionMeta?.status).toBe('rejected')
  })

  it('uses decision_rationale and decided_by_user_id from payload when present', () => {
    const stageMap: Record<string, PipelineStageInfo> = {
      WATCHLIST: {
        slug: 'WATCHLIST',
        name: 'Watchlist',
        order: 2,
        allowedNext: ['ACTIVE_DISCUSSION'],
      },
      ACTIVE_DISCUSSION: {
        slug: 'ACTIVE_DISCUSSION',
        name: 'Active Discussion',
        order: 3,
        allowedNext: ['VCP'],
      },
    }

    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 21,
        ticker: 'SQ',
        name: 'Block',
      },
      StageAssignment: {
        id: 21,
        company_id: 21,
        stage_id: 2,
        created_at: '2025-10-10T00:00:00Z',
      },
      Stage: stageMap.WATCHLIST,
      current_approval_request: [
        {
          id: 77,
          status: 'rejected',
          payload: {
            to_stage: 'ACTIVE_DISCUSSION',
            from_stage: 'WATCHLIST',
            rationale: 'Ready to discuss',
            decision_rationale: 'Missing updated investment memo',
            decided_by_user_id: 42,
            decided_at: '2025-10-12T08:00:00Z',
          },
        },
      ],
    }

    const card = mapCompanyRecordToCard(record, stageMap)

    expect(card.currentApproval?.decisionMeta?.comment).toBe('Missing updated investment memo')
    expect(card.currentApproval?.decisionMeta?.decidedByUserId).toBe(42)
    expect(card.currentApproval?.decisionMeta?.decidedAt).toBe('2025-10-12T08:00:00Z')
    expect(card.currentApproval?.decisionMeta?.status).toBe('rejected')
  })

  it('prefers analyst arrays from stage assignment metadata', () => {
    const stageMap: Record<string, PipelineStageInfo> = {
      WATCHLIST: {
        slug: 'WATCHLIST',
        name: 'Watchlist',
        order: 2,
        allowedNext: ['ACTIVE_DISCUSSION'],
      },
    }
    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 5,
        ticker: 'ABNB',
        name: 'Airbnb',
      },
      StageAssignment: {
        id: 5,
        company_id: 5,
        stage_id: 2,
        created_at: '2025-11-01T00:00:00Z',
        meta: {
          primary_analyst: [
            {
              user_id: 7,
              full_name: 'Alice Example',
              email: 'alice@example.com',
              role: 'arnie-primary-analyst',
            },
          ],
          secondary_analyst: [
            {
              user_id: 8,
              email: 'bob@example.com',
              role: 'arnie-secondary-analyst',
            },
          ],
        },
      },
      Stage: stageMap.WATCHLIST,
      current_approval_request: [],
    }

    const card = mapCompanyRecordToCard(record, stageMap)
    expect(card.analysts.primary).toBe('Alice Example')
    expect(card.analysts.secondary).toBe('bob@example.com')
  })

  it('prioritises most recent approval when multiple exist', () => {
    const stageMap: Record<string, PipelineStageInfo> = {
      WATCHLIST: {
        slug: 'WATCHLIST',
        name: 'Watchlist',
        order: 1,
        allowedNext: ['ACTIVE_DISCUSSION'],
      },
      ACTIVE_DISCUSSION: {
        slug: 'ACTIVE_DISCUSSION',
        name: 'Active Discussion',
        order: 2,
        allowedNext: ['FINAL_DILIGENCE'],
      },
      FINAL_DILIGENCE: {
        slug: 'FINAL_DILIGENCE',
        name: 'Final Diligence',
        order: 3,
        allowedNext: ['VCP'],
      },
    }
    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 42,
        ticker: 'TEST',
        name: 'Test Inc',
      },
      StageAssignment: {
        id: 10,
        stage_id: 1,
        company_id: 42,
        created_at: '2025-01-01T00:00:00Z',
      },
      Stage: stageMap.WATCHLIST,
      current_approval_request: [
        {
          id: 5,
          status: 'rejected',
          created_at: '2025-01-05T00:00:00Z',
          payload: { to_stage: 'ACTIVE_DISCUSSION', rationale: 'Old request' },
        },
        {
          id: 8,
          status: 'pending',
          created_at: '2025-01-10T00:00:00Z',
          payload: { to_stage: 'FINAL_DILIGENCE', rationale: 'Latest request' },
        },
      ],
    }

    const card = mapCompanyRecordToCard(record, stageMap)
    expect(card.currentApproval?.toStage).toBe('FINAL_DILIGENCE')
    expect(card.currentApproval?.status).toBe('pending')
  })

  it('calculates elapsed days in stage from ISO timestamp', () => {
    const today = new Date()
    const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(calculateDaysInStage(fiveDaysAgo)).toBeGreaterThanOrEqual(4)
    expect(calculateDaysInStage('invalid-date')).toBe(0)
  })

  it('prefers updated_at when computing days in stage', () => {
    const now = new Date()
    const updatedAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()

    const stageMap: Record<string, PipelineStageInfo> = {
      ACTIVE_DISCUSSION: {
        slug: 'ACTIVE_DISCUSSION',
        name: 'Active Discussion',
        order: 2,
        allowedNext: ['VCP'],
      },
    }

    const record: PipelineStageCompanyRecordApi = {
      Company: {
        id: 3,
        ticker: 'COIN',
        name: 'Coinbase Global',
      },
      StageAssignment: {
        id: 3,
        company_id: 3,
        stage_id: 4,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      Stage: stageMap.ACTIVE_DISCUSSION,
      current_approval_request: [],
    }

    const card = mapCompanyRecordToCard(record, stageMap)
    expect(card.daysInStage).toBeGreaterThanOrEqual(3)
    expect(card.daysInStage).toBeLessThanOrEqual(4)
  })

  it('formats approver labels consistently', () => {
    expect(formatApprover(undefined)).toBe('System')
    expect(formatApprover(null)).toBe('System')
    expect(formatApprover(7)).toBe('User 7')
    expect(formatApprover('42')).toBe('User 42')
    expect(formatApprover('Lead Investor')).toBe('Lead Investor')
  })

  it('transforms attachment selections into backend payload shape', () => {
    const attachments: StageAttachment[] = [
      { id: 42, label: 'investment_memo.pdf', type: 'document' },
      { id: 77, label: 'Active Discussion Summary', type: 'memo' },
      { id: Number.NaN, label: 'invalid', type: 'memo' },
    ]

    expect(attachmentsToRecord(attachments)).toEqual({
      'investment_memo.pdf': 42,
      'Active Discussion Summary': 77,
    })
    expect(attachmentsToRecord([])).toEqual({})
  })
})
