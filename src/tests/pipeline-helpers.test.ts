import { describe, expect, it } from 'vitest'

import {
  filterPipelineBoardData,
  getInitials,
  getNextStageName,
  TEMPLATE_PATH_RULES,
} from '@/containers/pipeline/lib/helpers'
import type { PipelineCard, PipelineStageInfo } from '@/containers/pipeline/lib/types'

const slugify = (name: string) => name.toUpperCase().replace(/\s+/g, '_')

const stageNames = [
  'Active Discussion',
  'VCP',
  'Airplane Mode',
  'Memo Draft',
  'Final Diligence',
  'Approved',
  'Invested',
]

const stages: PipelineStageInfo[] = stageNames.map((name, index) => ({
  slug: slugify(name),
  name,
  order: index,
  allowedNext: [],
  meta: null,
}))

const stageMap = stages.reduce<Record<string, PipelineStageInfo>>((acc, stage) => {
  acc[stage.slug] = stage
  return acc
}, {})

const boardData: Record<string, PipelineCard[]> = {
  [slugify('Active Discussion')]: [
    {
      id: 'sony',
      ticker: 'SONY',
      exchange: '',
      company: 'Sony Group',
      analysts: { primary: 'Isaac Chen', secondary: 'Alex Rodriguez' },
      daysInStage: 8,
      status: 'on-track',
      statusLabel: 'On track',
      stageSlug: slugify('Active Discussion'),
    },
  ],
  [slugify('Airplane Mode')]: [
    {
      id: 'googl',
      ticker: 'GOOGL',
      exchange: '',
      company: 'Alphabet Inc.',
      analysts: { primary: 'Alex Rodriguez', secondary: 'Sarah Miller' },
      daysInStage: 22,
      status: 'pending',
      statusLabel: 'Pending approval',
      statusDescription: 'Awaiting approval for Memo Draft.',
      stageSlug: slugify('Airplane Mode'),
      currentApproval: {
        id: 1,
        status: 'pending',
        toStage: slugify('Memo Draft'),
        submittedAt: new Date().toISOString(),
      },
    },
  ],
  [slugify('Invested')]: [
    {
      id: 'msft',
      ticker: 'MSFT',
      exchange: '',
      company: 'Microsoft Corp.',
      analysts: { primary: 'Isaac Chen', secondary: 'Sarah Miller' },
      daysInStage: 120,
      status: 'on-track',
      statusLabel: 'On track',
      stageSlug: slugify('Invested'),
    },
  ],
}

describe('Pipeline helpers', () => {
  it('returns the next stage in sequence', () => {
    stages[0].allowedNext = [stages[1].slug]
    stages[4].allowedNext = [stages[5].slug]

    expect(getNextStageName(stages[0], stageMap)).toBe(stages[1].name)
    expect(getNextStageName(stages[4], stageMap)).toBe(stages[5].name)
  })

  it('returns the same stage when on the final stage', () => {
    const finalStage = stages[stages.length - 1]
    finalStage.allowedNext = []
    expect(getNextStageName(finalStage, stageMap)).toBe(finalStage.name)
  })

  it('derives initials from analyst names', () => {
    expect(getInitials('Alex Rodriguez')).toBe('AR')
    expect(getInitials('isaac chen')).toBe('IC')
    expect(getInitials('Single')).toBe('S')
  })

  it('filters pipeline board data by analyst', () => {
    const analystFiltered = filterPipelineBoardData(stages, boardData, 'isaac')
    const activeSlug = slugify('Active Discussion')
    const investStage = analystFiltered[slugify('Invested')]
    expect(analystFiltered[activeSlug]).toHaveLength(1)
    expect(analystFiltered[activeSlug][0].ticker).toBe('SONY')
    expect(investStage).toHaveLength(1)
    expect(investStage[0].ticker).toBe('MSFT')

    const allAnalysts = filterPipelineBoardData(stages, boardData, 'all')
    expect(allAnalysts[activeSlug]).toHaveLength(1)
    expect(allAnalysts[slugify('Airplane Mode')]).toHaveLength(1)
    expect(allAnalysts[slugify('Invested')]).toHaveLength(1)
  })

  it('maps template tokens to the correct template paths', () => {
    const resolve = (token?: string) => {
      if (!token) return '/research-updates'
      const upper = token.toUpperCase()
      const match = TEMPLATE_PATH_RULES.find((rule) => rule.match.test(upper))
      return match?.path ?? '/research-updates'
    }

    expect(resolve('screen')).toBe('/research-updates/template/screen')
    expect(resolve('going_in_value_creation_plan')).toBe('/research-updates/template/vcp-screen')
    expect(resolve('GOING_IN_VALUATION')).toBe('/research-updates/template/vcp-screen')
    expect(resolve('investment_memo')).toBe('/research-updates/template/investment-memo')
    expect(resolve(undefined)).toBe('/research-updates')
    expect(resolve('misc')).toBe('/research-updates')
  })
})
