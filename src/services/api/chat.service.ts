/**
 * Chat API Service
 * Handles AI chat with streaming support
 */

import { BaseApiService } from './base'
import { env } from '@/config/env'
import type {
  ChatMessage,
  ChatConversationSummary,
  ChatSessionsApiResponse,
  SessionDetailsApiResponse,
  ChatMessageRequest,
  ChatMessageResponse,
  StreamChunkData,
  StreamingChatCallbacks,
} from '@/containers/ai-chat/lib/types'

class ChatService extends BaseApiService {
  /**
   * Send a chat message and receive streaming response
   * Uses Server-Sent Events (SSE) or fetch streaming
   */
  async streamChat(
    message: string,
    conversationId?: string,
    onChunk?: (chunk: string) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${env.apiUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header here
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onComplete?.()
          break
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines (SSE format or newline-delimited JSON)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              onChunk?.(data.delta || data.content || '')

              if (data.done) {
                onComplete?.()
                return
              }
            } catch (error) {
              console.warn('Failed to parse SSE data:', line, error)
            }
          } else if (line.trim()) {
            // Handle newline-delimited JSON
            try {
              const data = JSON.parse(line)
              onChunk?.(data.delta || data.content || '')
            } catch (error) {
              // Not JSON, treat as plain text
              console.warn('Non-JSON streaming chunk received:', line, error)
              onChunk?.(line)
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat streaming error:', error)
      onError?.(error as Error)
    }
  }

  /**
   * Get chat history for a conversation
   */
  async getChatHistory(conversationId: string): Promise<ChatMessage[]> {
    return this.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`)
  }

  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<{ id: string; title: string }> {
    return this.post('/chat/conversations', { title })
  }

  /**
   * List all conversations
   */
  async getConversations(): Promise<ChatConversationSummary[]> {
    return this.get('/chat/conversations')
  }

  /**
   * Get all chat sessions with pagination and filters
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 20)
   * @param isActive - Filter by active status (optional)
   * @param searchTitle - Search in session titles (optional)
   */
  async getSessions(
    skip: number = 0,
    limit: number = 20,
    isActive?: boolean,
    searchTitle?: string
  ): Promise<ChatSessionsApiResponse> {
    const params = new URLSearchParams()
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())

    if (isActive !== undefined) {
      params.append('is_active', isActive.toString())
    }
    if (searchTitle) {
      params.append('search_title', searchTitle)
    }

    return this.get<ChatSessionsApiResponse>(`/sessions/?${params.toString()}`)
  }

  /**
   * Delete a chat session
   * @param sessionId - Session ID to delete
   */
  async deleteSession(sessionId: string): Promise<{ message: string }> {
    return this.put<{ message: string }>(`/sessions/${sessionId}/delete`)
  }

  /**
   * Update a chat session
   * @param sessionId - Session ID to update
   * @param title - New title for the session
   */
  async updateSession(sessionId: string, title: string): Promise<{ message: string }> {
    return this.put<{ message: string }>(`/sessions/${sessionId}`, { title })
  }

  /**
   * Get session details with messages
   * @param sessionId - Session ID
   * @param includeMessages - Whether to include messages (default: true)
   * @param messagesLimit - Maximum number of messages to return (default: 50)
   */
  async getSessionDetails(
    sessionId: string,
    includeMessages: boolean = true,
    messagesLimit: number = 50
  ): Promise<SessionDetailsApiResponse> {
    const params = new URLSearchParams()
    params.append('include_messages', includeMessages.toString())
    params.append('messages_limit', messagesLimit.toString())

    return this.get<SessionDetailsApiResponse>(`/sessions/${sessionId}?${params.toString()}`)
  }

  /**
   * Send a chat message
   * @param request - Chat message request with query and optional session_id
   */
  async sendChatMessage(request: ChatMessageRequest): Promise<ChatMessageResponse> {
    return this.post<ChatMessageResponse>('/llm/chat', request)
  }

  /**
   * Send a chat message with streaming response
   * Uses Server-Sent Events (SSE) for real-time streaming
   * @param request - Chat message request with query and optional session_id
   * @param callbacks - Callback functions for handling stream events
   * @param abortSignal - Optional AbortSignal for cancellation
   */
  //TODO: Revisit and revamp this as we start getting whole Markdown from BE and just render in the FE
  async streamMessage(
    request: ChatMessageRequest,
    callbacks: StreamingChatCallbacks,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const { onChunk, onSearchMetadata, onComplete, onError } = callbacks

    let buffer = ''
    let lastMessageId: string | null = null
    let lastSessionId: string | null = null
    let lastMetadata: StreamChunkData['metadata'] | undefined

    try {
      const response = await fetch(`${env.apiUrl}/agent/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        credentials: 'include',
        signal: abortSignal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          // Stream ended without termination chunk - still call onComplete
          onComplete?.({
            message_id: lastMessageId,
            session_id: lastSessionId,
            metadata: lastMetadata,
          })
          break
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines (SSE format: "data: {...}\n\n")
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim()

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6) // Remove "data: " prefix
              const data: StreamChunkData = JSON.parse(jsonStr)

              // Track session_id and message_id
              if (data.session_id) lastSessionId = data.session_id
              if (data.message_id) lastMessageId = data.message_id
              if (data.metadata) lastMetadata = data.metadata

              // Handle different stream types
              switch (data.stream_type) {
                case 'MESSAGE':
                  // Regular message chunk - accumulate text
                  if (data.chunk) {
                    onChunk?.(data.chunk, data)
                  }
                  break

                case 'SEARCH_RESULT':
                  // Search metadata received
                  if (data.metadata) {
                    onSearchMetadata?.(data.metadata)
                  }
                  break

                case 'ERROR':
                  // Error chunk
                  onError?.(data.chunk || 'An error occurred')
                  if (data.is_terminated) {
                    return
                  }
                  break

                case 'END':
                  // Stream terminated
                  onComplete?.({
                    message_id: data.message_id,
                    session_id: data.session_id,
                    metadata: data.metadata,
                  })
                  return

                default:
                  // Unknown type - still process chunk if present
                  if (data.chunk) {
                    onChunk?.(data.chunk, data)
                  }
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', trimmedLine, parseError)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Chat streaming error:', error)
      onError?.(error instanceof Error ? error.message : 'Unknown streaming error')
    }
  }

  /**
   * Create a new chat session
   * @param title - Optional title for the session
   */
  async createSession(title?: string): Promise<{ id: string; title: string }> {
    return this.post('/sessions/', { title })
  }
}

// Export singleton instance
export const chatService = new ChatService()
