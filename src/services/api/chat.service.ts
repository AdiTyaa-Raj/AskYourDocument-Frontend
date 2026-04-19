/**
 * Chat API Service
 * Wraps the backend RAG chat endpoint: POST /chat
 *
 * Backend contract:
 *   Request:  { query: string, top_k?: number (1-20, default 5) }
 *   Response: { answer: string, sources: SourceInfo[], chunks_retrieved: number }
 *
 * Note: The backend has no session or conversation management.
 * Conversation history is maintained entirely on the client side.
 */

import { BaseApiService } from './base'
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  // Legacy / unused types kept for backward compatibility with container imports
  ChatConversationSummary,
  ChatSessionsApiResponse,
  SessionDetailsApiResponse,
} from '@/containers/ai-chat/lib/types'

class ChatService extends BaseApiService {
  /**
   * Send a question and receive an AI-generated answer grounded in tenant documents.
   * Backend: POST /chat
   */
  async sendChatMessage(request: ChatMessageRequest): Promise<ChatMessageResponse> {
    return this.post<ChatMessageResponse, ChatMessageRequest>('/chat', request)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // The following methods are stubs kept so that existing imports in containers
  // do not break at compile time. They throw at runtime to make it clear that
  // the corresponding backend endpoints do not exist.
  // ──────────────────────────────────────────────────────────────────────────

  /** @deprecated Backend has no streaming endpoint. Use sendChatMessage instead. */
  async streamChat(
    _message: string,
    _conversationId?: string,
    _onChunk?: (chunk: string) => void,
    _onComplete?: () => void,
    _onError?: (error: Error) => void
  ): Promise<void> {
    throw new Error('Streaming is not supported by this backend. Use sendChatMessage.')
  }

  /** @deprecated Backend has no streaming agent endpoint. Use sendChatMessage instead. */
  async streamMessage(
    _request: ChatMessageRequest,
    _callbacks: unknown,
    _abortSignal?: AbortSignal
  ): Promise<void> {
    throw new Error('Streaming is not supported by this backend. Use sendChatMessage.')
  }

  /** @deprecated Backend has no session management. Use client-side state instead. */
  async getSessions(
    _skip?: number,
    _limit?: number,
    _isActive?: boolean,
    _searchTitle?: string
  ): Promise<ChatSessionsApiResponse> {
    // Return empty result rather than throwing to avoid crashing list renders
    return { data: [], status: 200, message: 'Sessions not supported by this backend.' }
  }

  /** @deprecated Backend has no session management. */
  async createSession(_title?: string): Promise<{ id: string; title: string }> {
    throw new Error('Session management is not supported by this backend.')
  }

  /** @deprecated Backend has no session management. */
  async getSessionDetails(
    _sessionId: string,
    _includeMessages?: boolean,
    _messagesLimit?: number
  ): Promise<SessionDetailsApiResponse> {
    throw new Error('Session management is not supported by this backend.')
  }

  /** @deprecated Backend has no session management. */
  async deleteSession(_sessionId: string): Promise<{ message: string }> {
    throw new Error('Session management is not supported by this backend.')
  }

  /** @deprecated Backend has no session management. */
  async updateSession(_sessionId: string, _title: string): Promise<{ message: string }> {
    throw new Error('Session management is not supported by this backend.')
  }

  /** @deprecated Legacy method. Use sendChatMessage. */
  async getChatHistory(_conversationId: string): Promise<unknown[]> {
    return []
  }

  /** @deprecated Legacy method. Use sendChatMessage. */
  async createConversation(_title?: string): Promise<{ id: string; title: string }> {
    throw new Error('Conversation management is not supported by this backend.')
  }

  /** @deprecated Legacy method. Use getSessions. */
  async getConversations(): Promise<ChatConversationSummary[]> {
    return []
  }
}

// Export singleton instance
export const chatService = new ChatService()
