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

// SSE Streaming types matching backend format
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

export interface ChatSession {
  id: string
  title: string
  description: string | null
  user_id: string
  is_active: boolean
  message_count: number
  last_activity: string
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
}

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

export interface SessionDetails extends ChatSession {
  messages: SessionMessage[]
}

export interface SessionDetailsApiResponse {
  data: SessionDetails
  status: number
  message: string
}

export interface ChatMessageRequest {
  query: string
  session_id?: string
}

export interface ChatMessageResponse {
  answer: string
  session_id: string
  message_id: string
  context_documents: unknown[]
  used_documents: unknown[]
  total_found: number
  model_info: {
    name: string
    provider: string
  }
  search_metadata: {
    tool_used: string | null
    search_params: Record<string, unknown>
    total_documents_processed: number
  }
}

export interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: string
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
