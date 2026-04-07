/**
 * AI Chat Queries Tests
 * Test suite for AI Chat TanStack Query hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useChatSessions,
  useSessionDetails,
  useSendChatMessage,
  useCreateSession,
  useDeleteChatSession,
} from '@/containers/ai-chat/lib/queries'
import { chatService } from '@/services/api/chat.service'
import type {
  ChatSessionsApiResponse,
  SessionDetailsApiResponse,
} from '@/containers/ai-chat/lib/types'

// Mock the chat service
vi.mock('@/services/api/chat.service', () => ({
  chatService: {
    getSessions: vi.fn(),
    getSessionDetails: vi.fn(),
    sendChatMessage: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
  },
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AI Chat Queries', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.clear()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('useChatSessions', () => {
    const mockSessions: ChatSessionsApiResponse = {
      data: [
        {
          id: 'session-1',
          title: 'Chat about Tesla',
          description: null,
          user_id: 'user-1',
          is_active: true,
          message_count: 5,
          last_activity: '2024-10-16T11:00:00Z',
          created_at: '2024-10-16T10:00:00Z',
          updated_at: '2024-10-16T11:00:00Z',
          metadata: {},
        },
        {
          id: 'session-2',
          title: 'Pipeline questions',
          description: null,
          user_id: 'user-2',
          is_active: false,
          message_count: 3,
          last_activity: '2024-10-15T10:00:00Z',
          created_at: '2024-10-15T09:00:00Z',
          updated_at: '2024-10-15T10:00:00Z',
          metadata: {},
        },
      ],
      status: 200,
      message: 'ok',
    }

    it('should fetch chat sessions successfully', async () => {
      vi.mocked(chatService.getSessions).mockResolvedValue(mockSessions)

      const { result } = renderHook(() => useChatSessions(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSessions.data)
      expect(chatService.getSessions).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      vi.mocked(chatService.getSessions).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChatSessions(), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })

    it('should return empty array when no sessions', async () => {
      const emptyResponse: ChatSessionsApiResponse = {
        data: [],
        status: 200,
        message: 'ok',
      }
      vi.mocked(chatService.getSessions).mockResolvedValue(emptyResponse)

      const { result } = renderHook(() => useChatSessions(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(0)
    })
  })

  describe('useSessionDetails', () => {
    const mockSessionDetails: SessionDetailsApiResponse = {
      data: {
        id: 'session-1',
        title: 'Chat about Tesla',
        description: null,
        user_id: 'user-1',
        is_active: true,
        message_count: 2,
        last_activity: '2024-10-16T11:00:00Z',
        created_at: '2024-10-16T10:00:00Z',
        updated_at: '2024-10-16T11:00:00Z',
        metadata: {},
        messages: [
          {
            id: 'msg-1',
            session_id: 'session-1',
            role: 'user',
            content: 'Tell me about Tesla',
            created_at: '2024-10-16T10:00:00Z',
            metadata: {},
          },
          {
            id: 'msg-2',
            session_id: 'session-1',
            role: 'assistant',
            content: 'Tesla is an electric vehicle company...',
            created_at: '2024-10-16T10:00:30Z',
            metadata: {},
          },
        ],
      },
      status: 200,
      message: 'ok',
    }

    it('should fetch session details when sessionId is provided', async () => {
      vi.mocked(chatService.getSessionDetails).mockResolvedValue(mockSessionDetails)

      const { result } = renderHook(() => useSessionDetails('session-1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.session.id).toBe('session-1')
      expect(result.current.data?.messages).toHaveLength(2)
      expect(chatService.getSessionDetails).toHaveBeenCalledWith('session-1', true, 50)
    })

    it('should not fetch when sessionId is null', async () => {
      const { result } = renderHook(() => useSessionDetails(null), { wrapper })

      expect(result.current.data).toBeUndefined()
      expect(chatService.getSessionDetails).not.toHaveBeenCalled()
    })

    it('should handle fetch error', async () => {
      vi.mocked(chatService.getSessionDetails).mockRejectedValue(new Error('Session not found'))

      const { result } = renderHook(() => useSessionDetails('invalid-session'), { wrapper })

      // Wait for the query to be enabled and start fetching
      await waitFor(
        () => {
          expect(result.current.isFetching || result.current.isError).toBe(true)
        },
        { timeout: 2000 }
      )

      // Wait for the error state (the query will retry up to 3 times, so this may take a moment)
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true)
        },
        { timeout: 10000 }
      )

      expect(result.current.error).toBeDefined()
      expect(chatService.getSessionDetails).toHaveBeenCalled()
    }, 15000)
  })

  describe('useSendChatMessage', () => {
    const mockResponse = {
      answer: 'Response from AI',
      session_id: 'session-1',
      message_id: 'msg-3',
      context_documents: [],
      used_documents: [],
      total_found: 0,
      model_info: { name: 'gpt', provider: 'openai' },
      search_metadata: {
        tool_used: null,
        search_params: {},
        total_documents_processed: 0,
      },
    }

    it('should send message successfully', async () => {
      vi.mocked(chatService.sendChatMessage).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useSendChatMessage(), { wrapper })

      result.current.mutate({
        query: 'What is the stock price?',
        session_id: 'session-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(chatService.sendChatMessage).toHaveBeenCalledWith({
        query: 'What is the stock price?',
        session_id: 'session-1',
      })
    })

    it('should handle send error', async () => {
      vi.mocked(chatService.sendChatMessage).mockRejectedValue(new Error('Send failed'))

      const { result } = renderHook(() => useSendChatMessage(), { wrapper })

      result.current.mutate({ query: 'Test message', session_id: 'session-1' })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })

    it('should invalidate queries after successful send', async () => {
      vi.mocked(chatService.sendChatMessage).mockResolvedValue(mockResponse)

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useSendChatMessage(), { wrapper })

      result.current.mutate({ query: 'Test', session_id: 'session-1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(invalidateSpy).toHaveBeenCalled()
    })
  })

  describe('useCreateSession', () => {
    const mockNewSession = {
      id: 'new-session',
      title: 'New Chat',
    }

    it('should create new session successfully', async () => {
      vi.mocked(chatService.createSession).mockResolvedValue(mockNewSession)

      const { result } = renderHook(() => useCreateSession(), { wrapper })

      result.current.mutate('New Chat')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(chatService.createSession).toHaveBeenCalledWith('New Chat')
      expect(result.current.data).toEqual(mockNewSession)
    })

    it('should handle create error', async () => {
      vi.mocked(chatService.createSession).mockRejectedValue(new Error('Create failed'))

      const { result } = renderHook(() => useCreateSession(), { wrapper })

      result.current.mutate('New Chat')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useDeleteChatSession', () => {
    it('should delete session successfully', async () => {
      vi.mocked(chatService.deleteSession).mockResolvedValue({ message: 'Deleted' })

      const { result } = renderHook(() => useDeleteChatSession(), { wrapper })

      result.current.mutate('session-to-delete')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(chatService.deleteSession).toHaveBeenCalledWith('session-to-delete')
    })

    it('should handle delete error', async () => {
      vi.mocked(chatService.deleteSession).mockRejectedValue(new Error('Delete failed'))

      const { result } = renderHook(() => useDeleteChatSession(), { wrapper })

      result.current.mutate('invalid-session')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })

    it('should invalidate chat sessions after delete', async () => {
      vi.mocked(chatService.deleteSession).mockResolvedValue({ message: 'Deleted' })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteChatSession(), { wrapper })

      result.current.mutate('session-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(invalidateSpy).toHaveBeenCalled()
    })
  })
})
