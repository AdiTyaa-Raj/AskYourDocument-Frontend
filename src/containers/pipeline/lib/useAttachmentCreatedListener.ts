'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { attachmentMatchesCompany, type StageAttachment } from '@/lib/attachments'
import { addItemIfNotExists, TEMPLATE_CREATED_MESSAGE } from './helpers'
import type { UseAttachmentCreatedFromOpenerOptions } from './maintenance-types'

function hasExpectedCompanyFilter(
  ticker?: string | null,
  companyId?: string | number | null
): boolean {
  if (typeof ticker === 'string' && ticker.trim().length > 0) return true
  if (companyId == null || companyId === '') return false
  return !Number.isNaN(Number(companyId))
}

function buildMemoAttachmentFromMessage(data: {
  memoId: number
  memoTitle: unknown
  memoCategory: unknown
  memoTicker?: unknown
  memoPrimaryCompanyId?: unknown
  memoCompanyIds?: unknown
}): StageAttachment {
  const attachmentType =
    typeof data.memoCategory === 'string' && data.memoCategory.trim()
      ? data.memoCategory.trim()
      : undefined
  const companyIds: Array<string | number> = []
  if (typeof data.memoPrimaryCompanyId === 'number') {
    companyIds.push(data.memoPrimaryCompanyId)
  }
  if (Array.isArray(data.memoCompanyIds)) {
    for (const raw of data.memoCompanyIds) {
      companyIds.push(raw)
    }
  }
  return {
    id: data.memoId,
    label: typeof data.memoTitle === 'string' ? data.memoTitle : `Memo ${data.memoId}`,
    subLabel: attachmentType ?? 'Memo',
    type: 'memo',
    memoTemplateType: attachmentType,
    ticker: typeof data.memoTicker === 'string' ? data.memoTicker : undefined,
    companyIds: companyIds.length ? companyIds : undefined,
  }
}

/** * Shared hook for "Create New" template flow when opened in another tab.*/
export function useAttachmentCreatedFromOpener({
  baseList,
  onSelect,
  onRefetch,
  expectedTicker,
  expectedCompanyId,
}: UseAttachmentCreatedFromOpenerOptions): StageAttachment[] {
  const [pendingAttachmentId, setPendingAttachmentId] = useState<number | null>(null)
  const [createdTemplate, setCreatedTemplate] = useState<StageAttachment | null>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  const mergedList = useMemo(
    () => addItemIfNotExists(baseList, createdTemplate),
    [baseList, createdTemplate]
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data ?? {}
      const {
        type,
        memoId,
        memoTitle,
        memoCategory,
        memoTicker,
        memoPrimaryCompanyId,
        memoCompanyIds,
      } = data
      if (type !== TEMPLATE_CREATED_MESSAGE || typeof memoId !== 'number') return
      const attachment = buildMemoAttachmentFromMessage({
        memoId,
        memoTitle,
        memoCategory,
        memoTicker,
        memoPrimaryCompanyId,
        memoCompanyIds,
      })
      if (
        hasExpectedCompanyFilter(expectedTicker, expectedCompanyId) &&
        !attachmentMatchesCompany(attachment, {
          ticker: expectedTicker ?? null,
          companyId: expectedCompanyId ?? null,
        })
      ) {
        if (onRefetch) {
          void Promise.resolve(onRefetch())
        }
        return
      }
      setCreatedTemplate(attachment)
      setPendingAttachmentId(memoId)
      selectRef.current(attachment)
      if (onRefetch) {
        void Promise.resolve(onRefetch())
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onRefetch, expectedTicker, expectedCompanyId])

  useEffect(() => {
    if (!createdTemplate) return
    const inList = baseList.some((a) => a.id === createdTemplate.id)
    if (inList) setCreatedTemplate(null)
  }, [createdTemplate, baseList])

  useEffect(() => {
    if (pendingAttachmentId == null) return
    const item = mergedList.find((a) => a.type === 'memo' && a.id === pendingAttachmentId)
    if (item) {
      selectRef.current(item)
      setPendingAttachmentId(null)
    }
  }, [pendingAttachmentId, mergedList])

  return mergedList
}
