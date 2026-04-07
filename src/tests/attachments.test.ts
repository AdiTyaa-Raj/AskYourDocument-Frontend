import { describe, it, expect } from 'vitest'

import {
  attachmentMatchesCompany,
  filterAttachmentsByRequirements,
  getMissingRequiredAttachmentTypes,
  normaliseAttachmentRequirements,
  type StageAttachment,
} from '@/lib/attachments'

const screenDoc: StageAttachment = {
  id: 1,
  label: 'Screen Worksheet',
  type: 'document',
  documentType: 'SCREEN',
}

const diligenceDoc: StageAttachment = {
  id: 2,
  label: 'Final Memo',
  type: 'document',
  documentType: 'FINAL_INVESTMENT_MEMO',
}

const vcpMemo: StageAttachment = {
  id: 3,
  label: 'Going-in VCP',
  type: 'memo',
  memoTemplateType: 'GOING_IN_VCP',
}

describe('Attachment helpers', () => {
  it('normalises mixed requirement inputs', () => {
    expect(normaliseAttachmentRequirements(undefined)).toBeUndefined()
    expect(normaliseAttachmentRequirements(['SCREEN'])).toEqual({ documents: ['SCREEN'] })
    expect(
      normaliseAttachmentRequirements({ documents: ['SCREEN'], memos: ['GOING_IN_VCP'] })
    ).toEqual({ documents: ['SCREEN'], memos: ['GOING_IN_VCP'] })
    expect(normaliseAttachmentRequirements({ documents: [], memos: [] })).toBeUndefined()
  })

  it('filters attachments by required token', () => {
    const filteredDocs = filterAttachmentsByRequirements([screenDoc, diligenceDoc], 'document', {
      documents: ['SCREEN'],
    })
    expect(filteredDocs).toEqual([screenDoc])

    const filteredMemos = filterAttachmentsByRequirements([screenDoc, vcpMemo], 'memo', {
      memos: ['GOING_IN_VCP'],
    })
    expect(filteredMemos).toEqual([vcpMemo])
  })

  it('detects missing attachment types', () => {
    expect(
      getMissingRequiredAttachmentTypes([screenDoc], 'document', { documents: ['SCREEN'] })
    ).toEqual([])

    expect(getMissingRequiredAttachmentTypes([], 'memo', { memos: ['GOING_IN_VCP'] })).toEqual([
      'GOING_IN_VCP',
    ])
  })

  it('matches attachments by ticker or company id', () => {
    const attachmentWithTicker: StageAttachment = {
      id: 10,
      label: 'Sample Doc',
      type: 'document',
      documentType: 'SCREEN',
      ticker: 'ABCD',
    }
    const attachmentWithCompanyIds: StageAttachment = {
      id: 11,
      label: 'Memo',
      type: 'memo',
      memoTemplateType: 'GOING_IN_VCP',
      companyIds: ['42', '55'],
    }

    expect(
      attachmentMatchesCompany(attachmentWithTicker, { ticker: 'abcd', companyId: null })
    ).toBe(true)
    expect(attachmentMatchesCompany(attachmentWithTicker, { ticker: 'XYZ', companyId: null })).toBe(
      false
    )
    expect(
      attachmentMatchesCompany(attachmentWithCompanyIds, { ticker: null, companyId: 42 })
    ).toBe(true)
    expect(
      attachmentMatchesCompany(attachmentWithCompanyIds, { ticker: null, companyId: 99 })
    ).toBe(false)
  })
})
