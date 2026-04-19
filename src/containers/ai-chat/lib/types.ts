// ──────────────────────────────────────────────────────────────────────────────
// Backend-aligned types
// Backend: POST /chat → { answer, sources, chunks_retrieved }
// ──────────────────────────────────────────────────────────────────────────────

/** A single document chunk that contributed to the answer */
export interface SourceInfo {
  document_id: number
  filename: string | null
  similarity: number
}

/** Request body for POST /chat */
export interface ChatMessageRequest {
  query: string
  /** Number of chunks to retrieve (1-20). Defaults to 5. */
  top_k?: number
}

/** Response from POST /chat */
export interface ChatMessageResponse {
  answer: string
  sources: SourceInfo[]
  chunks_retrieved: number
}

// ──────────────────────────────────────────────────────────────────────────────
// Client-side conversation / session types
// The backend has no session management; sessions are managed in the browser.
// ──────────────────────────────────────────────────────────────────────────────

/** A single chat message displayed in the UI */
export interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: string
  /** Sources returned by the backend for assistant messages */
  sources?: SourceInfo[]
  chunks_retrieved?: number
}

/** A client-side chat session (stored in browser state / localStorage) */
export interface ChatSession {
  id: string
  title: string
  description: string | null
  /** ISO timestamp of last activity */
  last_activity: string
  created_at: string
  updated_at: string
  messages: Message[]
  is_active: boolean
  message_count: number
  metadata: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────────────────────
// Legacy types kept for backward-compatibility with container imports
// ──────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface ChatStreamChunk {
  delta: string
  done: boolean
}

// SSE Streaming types – not used with this backend but kept so imports resolve
export type StreamType = 'MESSAGE' | 'TOOL_USE' | 'SEARCH_RESULT' | 'ERROR' | 'END'

export interface StreamChunkData {
  chunk: string
  index: number
  is_terminated: boolean
  message_id: string | null
  session_id: string | null
  stream_type: StreamType
  metadata?: {
    total_found?: number
    tool_used?: string | null
    search_params?: Record<string, unknown>
    model_info?: {
      name: string
      provider: string
    }
  }
  error?: boolean
}

export interface StreamingChatCallbacks {
  onChunk?: (chunk: string, data: StreamChunkData) => void
  onSearchMetadata?: (metadata: StreamChunkData['metadata']) => void
  onComplete?: (data: {
    message_id: string | null
    session_id: string | null
    metadata?: StreamChunkData['metadata']
  }) => void
  onError?: (error: string) => void
}

export interface ChatConversationSummary {
  id: string
  title: string
  updated_at: string
}

/** Shape returned by the stub getSessions() on ChatService */
export interface ChatSessionsApiResponse {
  data: ChatSession[]
  status: number
  message: string
}

export interface SessionMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata: Record<string, unknown>
}

export interface SessionDetails extends Omit<ChatSession, 'messages'> {
  /** Legacy session-detail payload; not supported by this backend. */
  messages: Message[]
}

export interface SessionDetailsApiResponse {
  data: SessionDetails
  status: number
  message: string
}

export interface SuggestedPrompt {
  id: string
  text: string
  category?: 'research' | 'pipeline' | 'portfolio' | 'general'
}

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  loading?: boolean
}

export interface MessageBubbleProps {
  message: Message
  isLatest?: boolean
}

export interface SuggestedPromptsProps {
  prompts: string[]
  onPromptClick: (prompt: string) => void
}

export interface TypingIndicatorProps {
  show: boolean
}

export interface ChatListItemProps {
  id: string
  title: string
  messageCount: number
  lastActivity: string
  isActive: boolean
  isSelected?: boolean
  onClick: () => void
  onDelete?: (id: string) => void
  onRename?: (id: string, newTitle: string) => void
}

export interface StreamingChatState {
  isStreaming: boolean
  streamedContent: string
  sessionId: string | null
  messageId: string | null
  searchMetadata: StreamChunkData['metadata'] | null
  error: string | null
}
