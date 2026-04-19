/**
 * Chat Queries
 * TanStack Query hooks for chat-related data fetching
 *
 * NOTE: The backend (POST /chat) has no session management.
 * Chat history is maintained entirely in local React state inside the container.
 * These hooks only wrap the single chat endpoint.
 */

import { useCallback, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chatService } from '@/services/api/chat.service'
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  Message,
  ChatSession,
  StreamingChatState,
} from '@/containers/ai-chat/lib/types'

// Query keys – kept for cache-invalidation compatibility even though sessions
// are managed locally.
export const chatSessionKeys = {
  all: ['chat-sessions'] as const,
  lists: () => [...chatSessionKeys.all, 'list'] as const,
  list: (skip: number, limit: number, isActive?: boolean, searchTitle?: string) =>
    [...chatSessionKeys.lists(), { skip, limit, isActive, searchTitle }] as const,
  details: () => [...chatSessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatSessionKeys.details(), id] as const,
}

/**
 * Hook to send a non-streaming chat message via POST /chat.
 */
export function useSendChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: ChatMessageRequest): Promise<ChatMessageResponse> => {
      return await chatService.sendChatMessage(request)
    },
    onSuccess: () => {
      // No session invalidation needed – sessions are client-side only
      queryClient.invalidateQueries({ queryKey: chatSessionKeys.lists() })
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Stub hooks – kept so that container imports don't break.
// These hooks return empty/no-op data because the backend has no session API.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Stub: The backend has no session list endpoint.
 * Returns an empty array so the UI renders gracefully.
 */
export function useChatSessions(
  _skip?: number,
  _limit?: number,
  _isActive?: boolean,
  _searchTitle?: string
) {
  return {
    data: [] as ChatSession[],
    isLoading: false,
    error: null,
  }
}

/**
 * Stub: The backend has no session-detail endpoint.
 * Returns null so the container falls through to its local-state path.
 */
export function useSessionDetails(
  _sessionId: string | null,
  _includeMessages?: boolean,
  _messagesLimit?: number
) {
  return {
    data: null as { session: ChatSession; messages: Message[] } | null,
    isLoading: false,
    error: null,
  }
}

/** Stub – no-op delete */
export function useDeleteChatSession() {
  return useMutation({
    mutationFn: async (_sessionId: string) => ({ message: 'Not supported' }),
  })
}

/** Stub – no-op update */
export function useUpdateChatSession() {
  return useMutation({
    mutationFn: async (_vars: { sessionId: string; title: string }) => ({
      message: 'Not supported',
    }),
  })
}

/** Stub – no-op create */
export function useCreateSession() {
  return useMutation({
    mutationFn: async (_title?: string) => ({ id: '', title: _title || 'New Chat' }),
  })
}

/** Stub – no-op prefetch */
export function usePrefetchChatSessions() {
  return () => {}
}

// ──────────────────────────────────────────────────────────────────────────────
// useStreamingChat
//
// The backend does not stream. This hook wraps the regular sendChatMessage call
// but exposes the same streaming-state interface so AIChatContainer can work
// without changes to its streaming-state logic.
// ──────────────────────────────────────────────────────────────────────────────

const INITIAL_STREAMING_STATE: StreamingChatState = {
  isStreaming: false,
  streamedContent: '',
  sessionId: null,
  messageId: null,
  searchMetadata: null,
  error: null,
}

/**
 * Simulates a "streaming" chat by calling POST /chat and populating the state
 * once the response arrives, mimicking the streaming interface so that
 * AIChatContainer's existing callbacks work unchanged.
 */
export function useStreamingChat() {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [streamingState, setStreamingState] = useState<StreamingChatState>(INITIAL_STREAMING_STATE)

  const resetStreamingState = useCallback(() => {
    setStreamingState(INITIAL_STREAMING_STATE)
  }, [])

  const sendStreamingMessage = useCallback(
    async (
      request: ChatMessageRequest,
      onComplete?: (data: {
        messageId: string | null
        sessionId: string | null
        content: string
        sources?: ChatMessageResponse['sources']
        chunks_retrieved?: number
      }) => void
    ) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      setStreamingState({
        ...INITIAL_STREAMING_STATE,
        isStreaming: true,
        sessionId: null,
      })

      try {
        const response = await chatService.sendChatMessage(request)

        setStreamingState((prev) => ({
          ...prev,
          isStreaming: false,
          streamedContent: response.answer,
        }))

        onComplete?.({
          messageId: null,
          sessionId: null,
          content: response.answer,
          sources: response.sources,
          chunks_retrieved: response.chunks_retrieved,
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setStreamingState((prev) => ({ ...prev, isStreaming: false }))
          return
        }
        const msg = error instanceof Error ? error.message : 'Unknown error occurred'
        setStreamingState((prev) => ({
          ...prev,
          isStreaming: false,
          error: msg,
        }))
      }
    },
    []
  )

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStreamingState((prev) => ({ ...prev, isStreaming: false }))
  }, [])

  return {
    ...streamingState,
    sendStreamingMessage,
    cancelStream,
    resetStreamingState,
  }
}
