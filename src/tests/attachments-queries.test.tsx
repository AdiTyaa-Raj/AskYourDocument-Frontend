import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAllLinkedDocsMemoQuery } from '@/lib/attachments'
import { contentService } from '@/services/api'

vi.mock('@/services/api', () => ({
  contentService: {
    getContent: vi.fn(),
  },
}))

describe('Attachment queries', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('fetches published documents only when type is DOCUMENT', async () => {
    const response = {
      data: [
        {
          id: 123,
          content_type: 'DOCUMENT' as const,
          category: 'SCREEN',
          title: 'Screen Note',
          status: 'PUBLISHED',
          primary_company_id: 189220,
          company_ids: [189220],
          file_metadata: { filename: 'screen.pdf' },
        },
      ],
      total: 1,
      skip: 0,
      limit: 10,
    }

    vi.mocked(contentService.getContent).mockResolvedValue(response)

    const { result } = renderHook(
      () => useAllLinkedDocsMemoQuery({ companyId: 189220, type: 'DOCUMENT' }),
      {
        wrapper,
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(contentService.getContent).toHaveBeenCalledWith(
      0,
      10,
      expect.objectContaining({
        content_type: 'DOCUMENT',
        status: 'PUBLISHED',
        search: undefined,
        related_to_company_id: [189220],
      })
    )

    const firstItem = result.current.data?.pages?.[0]?.items?.[0]
    expect(firstItem?.type).toBe('document')
    expect(firstItem?.label).toBe('Screen Note')
    expect(firstItem?.meta?.status).toBe('PUBLISHED')
  })

  it('fetches published memos with trimmed search terms when type is MEMO', async () => {
    const response = {
      data: [],
      total: 0,
      skip: 0,
      limit: 10,
    }

    vi.mocked(contentService.getContent).mockResolvedValue(response)

    const { result } = renderHook(
      () => useAllLinkedDocsMemoQuery({ search: '  earnings  ', companyId: null, type: 'MEMO' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(contentService.getContent).toHaveBeenCalledWith(
      0,
      10,
      expect.objectContaining({
        content_type: 'MEMO',
        status: 'PUBLISHED',
        search: 'earnings',
        related_to_company_id: undefined,
      })
    )
  })

  it('fetches both documents and memos when type is not specified', async () => {
    const response = {
      data: [
        {
          id: 123,
          content_type: 'DOCUMENT' as const,
          category: 'SCREEN',
          title: 'Screen Note',
          status: 'PUBLISHED',
          primary_company_id: 189220,
          company_ids: [189220],
          file_metadata: { filename: 'screen.pdf' },
        },
        {
          id: 456,
          content_type: 'MEMO' as const,
          category: 'EARNINGS',
          title: 'Earnings Memo',
          status: 'PUBLISHED',
          primary_company_id: 189220,
          company_ids: [189220],
        },
      ],
      total: 2,
      skip: 0,
      limit: 10,
    }

    vi.mocked(contentService.getContent).mockResolvedValue(response)

    const { result } = renderHook(() => useAllLinkedDocsMemoQuery({ companyId: 189220 }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const callArgs = vi.mocked(contentService.getContent).mock.calls[0]
    expect(callArgs[2]).not.toHaveProperty('content_type')

    expect(result.current.data?.pages?.[0]?.items).toHaveLength(2)
  })

  it('fetches only documents when type is DOCUMENT', async () => {
    const response = {
      data: [
        {
          id: 123,
          content_type: 'DOCUMENT' as const,
          category: 'SCREEN',
          title: 'Screen Note',
          status: 'PUBLISHED',
          primary_company_id: 189220,
          company_ids: [189220],
          file_metadata: { filename: 'screen.pdf' },
        },
      ],
      total: 1,
      skip: 0,
      limit: 10,
    }

    vi.mocked(contentService.getContent).mockResolvedValue(response)

    const { result } = renderHook(
      () => useAllLinkedDocsMemoQuery({ companyId: 189220, type: 'DOCUMENT' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(contentService.getContent).toHaveBeenCalledWith(
      0,
      10,
      expect.objectContaining({
        content_type: 'DOCUMENT',
        status: 'PUBLISHED',
      })
    )
  })

  it('fetches only memos when type is MEMO', async () => {
    const response = {
      data: [
        {
          id: 456,
          content_type: 'MEMO' as const,
          category: 'EARNINGS',
          title: 'Earnings Memo',
          status: 'PUBLISHED',
          primary_company_id: 189220,
          company_ids: [189220],
        },
      ],
      total: 1,
      skip: 0,
      limit: 10,
    }

    vi.mocked(contentService.getContent).mockResolvedValue(response)

    const { result } = renderHook(
      () => useAllLinkedDocsMemoQuery({ companyId: 189220, type: 'MEMO' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(contentService.getContent).toHaveBeenCalledWith(
      0,
      10,
      expect.objectContaining({
        content_type: 'MEMO',
        status: 'PUBLISHED',
      })
    )
  })
})
