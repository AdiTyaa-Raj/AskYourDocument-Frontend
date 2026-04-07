/**
 * Chat Queries
 * TanStack Query hooks for chat-related data fetching
 */

import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatService } from '@/services/api/chat.service'
import type {
  ChatMessageRequest,
  Message,
  StreamChunkData,
  StreamingChatState,
} from '@/containers/ai-chat/lib/types'

// Query keys for better cache management
export const chatSessionKeys = {
  all: ['chat-sessions'] as const,
  lists: () => [...chatSessionKeys.all, 'list'] as const,
  list: (skip: number, limit: number, isActive?: boolean, searchTitle?: string) =>
    [...chatSessionKeys.lists(), { skip, limit, isActive, searchTitle }] as const,
  details: () => [...chatSessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatSessionKeys.details(), id] as const,
}

/**
 * Hook to fetch chat sessions with pagination and filters
 */
export function useChatSessions(
  skip: number = 0,
  limit: number = 20,
  isActive?: boolean,
  searchTitle?: string
) {
  return useQuery({
    queryKey: chatSessionKeys.list(skip, limit, isActive, searchTitle),
    queryFn: async () => {
      const response = await chatService.getSessions(skip, limit, isActive, searchTitle)
      return response.data || []
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch session details with messages
 */
export function useSessionDetails(
  sessionId: string | null,
  includeMessages: boolean = true,
  messagesLimit: number = 50
) {
  return useQuery({
    queryKey: chatSessionKeys.detail(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) return null
      const response = await chatService.getSessionDetails(
        sessionId,
        includeMessages,
        messagesLimit
      )

      // Transform messages to UI format
      const messages: Message[] = response.data.messages.map((msg, index) => {
        // Check if role field exists and is valid
        let sender: 'user' | 'assistant' = 'assistant'

        if (msg.role === 'user') {
          sender = 'user'
        } else if (msg.role === 'assistant') {
          sender = 'assistant'
        } else {
          // FALLBACK: If role is undefined or invalid, alternate messages
          // Typically first message is from user, so:
          // Index 0 = user, Index 1 = assistant, Index 2 = user, etc.
          sender = index % 2 === 0 ? 'user' : 'assistant'
        }

        return {
          id: msg.id,
          content: msg.content,
          sender,
          timestamp: msg.created_at,
        }
      })

      return {
        session: response.data,
        messages,
      }
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 errors (session not found)
      const is404 = (error as { response?: { status?: number } })?.response?.status === 404
      if (is404) return false
      // Default: retry up to 3 times for other errors
      return failureCount < 3
    },
  })
}

/**
 * Hook to delete a chat session
 */
export function useDeleteChatSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      return await chatService.deleteSession(sessionId)
    },
    onSuccess: (_, sessionId) => {
      // Invalidate all chat sessions lists
      queryClient.invalidateQueries({ queryKey: chatSessionKeys.lists() })

      // Remove the specific session from cache
      queryClient.removeQueries({ queryKey: chatSessionKeys.detail(sessionId) })
    },
  })
}

/**
 * Hook to update a chat session
 */
export function useUpdateChatSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sessionId, title }: { sessionId: string; title: string }) => {
      return await chatService.updateSession(sessionId, title)
    },
    onSuccess: (_, variables) => {
      // Invalidate all chat sessions lists
      queryClient.invalidateQueries({ queryKey: chatSessionKeys.lists() })

      // Invalidate the specific session details
      queryClient.invalidateQueries({ queryKey: chatSessionKeys.detail(variables.sessionId) })
    },
  })
}

/**
 * Hook to send a chat message
 */
export function useSendChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: ChatMessageRequest) => {
      return await chatService.sendChatMessage(request)
    },
    onSuccess: (data, variables) => {
      if (variables.session_id) {
        // Update existing session details
        queryClient.invalidateQueries({ queryKey: chatSessionKeys.detail(variables.session_id) })
      } else if (data.session_id) {
        // New session created - invalidate sessions list to show it in "All Chats"
        queryClient.invalidateQueries({ queryKey: chatSessionKeys.lists() })
        // Also invalidate the new session details
        queryClient.invalidateQueries({ queryKey: chatSessionKeys.detail(data.session_id) })
      }
    },
  })
}

/**
 * Hook to create a new chat session
 */
export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (title?: string) => {
      return await chatService.createSession(title)
    },
    onSuccess: () => {
      // Invalidate sessions list to show new session
      queryClient.invalidateQueries({ queryKey: chatSessionKeys.lists() })
    },
  })
}

/**
 * Hook to prefetch chat sessions
 * Useful for optimistic loading
 */
export function usePrefetchChatSessions() {
  const queryClient = useQueryClient()

  return (skip: number = 0, limit: number = 20, isActive?: boolean, searchTitle?: string) => {
    queryClient.prefetchQuery({
      queryKey: chatSessionKeys.list(skip, limit, isActive, searchTitle),
      queryFn: async () => {
        const response = await chatService.getSessions(skip, limit, isActive, searchTitle)
        return response.data || []
      },
    })
  }
}

const INITIAL_STREAMING_STATE: StreamingChatState = {
  isStreaming: false,
  streamedContent: '',
  sessionId: null,
  messageId: null,
  searchMetadata: null,
  error: null,
}

/**
 * Hook to send a chat message with streaming response
 * Returns accumulated content as it streams in word by word
 */
export function useStreamingChat() {
  const queryClient = useQueryClient()
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
      }) => void
    ) => {
      let accumulatedContent = ''
      let finalSessionId: string | null = request.session_id || null
      let finalMessageId: string | null = null

      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      // Reset state and start streaming
      setStreamingState({
        ...INITIAL_STREAMING_STATE,
        isStreaming: true,
        sessionId: request.session_id || null,
      })

      try {
        await chatService.streamMessage(
          request,
          {
            onChunk: (chunk: string, data: StreamChunkData) => {
              accumulatedContent += chunk
              setStreamingState((prev) => ({
                ...prev,
                streamedContent: accumulatedContent,
                sessionId: data.session_id || prev.sessionId,
              }))

              if (data.session_id) {
                finalSessionId = data.session_id
              }
            },
            onSearchMetadata: (metadata) => {
              setStreamingState((prev) => ({
                ...prev,
                searchMetadata: metadata || null,
              }))
            },
            onComplete: (data) => {
              finalMessageId = data.message_id
              finalSessionId = data.session_id || finalSessionId

              setStreamingState((prev) => ({
                ...prev,
                isStreaming: false,
                messageId: data.message_id,
                sessionId: data.session_id || prev.sessionId,
                searchMetadata: data.metadata || prev.searchMetadata,
              }))

              // Invalidate queries to refresh chat lists
              if (request.session_id) {
                queryClient.invalidateQueries({
                  queryKey: chatSessionKeys.detail(request.session_id),
                })
              } else if (finalSessionId) {
                // New session created
                queryClient.invalidateQueries({ queryKey: chatSessionKeys.lists() })
                queryClient.invalidateQueries({ queryKey: chatSessionKeys.detail(finalSessionId) })
              }

              // Call completion callback
              onComplete?.({
                messageId: finalMessageId,
                sessionId: finalSessionId,
                content: accumulatedContent,
              })
            },
            onError: (error) => {
              setStreamingState((prev) => ({
                ...prev,
                isStreaming: false,
                error,
              }))
            },
          },
          abortControllerRef.current.signal
        )
      } catch (error) {
        setStreamingState((prev) => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }))
      }
    },
    [queryClient]
  )

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStreamingState((prev) => ({
      ...prev,
      isStreaming: false,
    }))
  }, [])

  return {
    ...streamingState,
    sendStreamingMessage,
    cancelStream,
    resetStreamingState,
  }
}
