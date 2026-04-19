'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, FileText } from 'lucide-react'
import type { Message, SourceInfo, ChatSession } from '@/containers/ai-chat/lib/types'
import { getCurrentTimestamp } from '@/lib/date-utils'
import {
  useStreamingChat,
  useDeleteChatSession,
  useUpdateChatSession,
} from '@/containers/ai-chat/lib'
import {
  MessageBubble,
  ChatInput,
  SuggestedPrompts,
  TypingIndicator,
  ChatListItem,
  ChatListSkeleton,
} from '@/containers/ai-chat/components'
import { SUGGESTED_PROMPTS } from '@/containers/ai-chat/data/default-messages'
import { useAutoResizeTextarea } from '@/containers/ai-chat/lib/useAutoResizeTextarea'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

// ─── Local session storage helpers ────────────────────────────────────────────

const LOCAL_SESSIONS_KEY = 'ayd_chat_sessions'

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSIONS_KEY)
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions))
}

function createNewSession(firstMessage?: string): ChatSession {
  const now = new Date().toISOString()
  return {
    id: `session-${Date.now()}`,
    title: firstMessage ? firstMessage.slice(0, 50) : 'New Chat',
    description: null,
    last_activity: now,
    created_at: now,
    updated_at: now,
    messages: [],
    is_active: true,
    message_count: 0,
    metadata: {},
  }
}

// ─── Sources Panel ────────────────────────────────────────────────────────────

function SourcesPanel({ sources }: { sources: SourceInfo[] }) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="border-border bg-muted/30 mt-2 rounded-lg border p-3">
      <p className="text-muted-foreground mb-2 flex items-center gap-1 text-xs font-medium">
        <FileText className="size-3" />
        Sources ({sources.length})
      </p>
      <div className="space-y-1">
        {sources.map((src, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
            <span className="text-foreground flex-1 truncate">
              {src.filename || `Document #${src.document_id}`}
            </span>
            <span className="text-muted-foreground shrink-0">
              {(src.similarity * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Container ───────────────────────────────────────────────────────────

export function AIChatContainer() {
  const router = useRouter()

  // Local session management (backend has no session API)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)

  const streamingMessageIdRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const landingTextareaRef = useAutoResizeTextarea(inputValue, 200)

  // Load sessions from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions())
  }, [])

  // Streaming chat hook (wraps POST /chat under the hood)
  const {
    isStreaming,
    streamedContent,
    sendStreamingMessage,
    error: streamingError,
  } = useStreamingChat()

  // Stubs – no-op for session list sidebar
  const deleteMutation = useDeleteChatSession()
  const updateMutation = useUpdateChatSession()
  const allSessions = sessions
  const loadingAllSessions = false

  // Sync messages from the active session
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([])
      return
    }
    const session = sessions.find((s) => s.id === currentSessionId)
    if (session) {
      setMessages(session.messages)
    }
  }, [currentSessionId, sessions])

  // Update streaming message content as it arrives
  useEffect(() => {
    if (streamingMessageIdRef.current && streamedContent) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageIdRef.current ? { ...msg, content: streamedContent } : msg
        )
      )
    }
  }, [streamedContent])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streamedContent, isStreaming])

  // Surface streaming errors
  useEffect(() => {
    if (streamingError) setError(streamingError)
  }, [streamingError])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const persistSessionMessages = useCallback((sessionId: string, newMessages: Message[]) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: newMessages,
              message_count: newMessages.length,
              last_activity: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : s
      )
      saveSessions(updated)
      return updated
    })
  }, [])

  const isStreamingEmptyAssistantMessage = useCallback(
    (message: Message): boolean =>
      isStreaming &&
      message.sender === 'assistant' &&
      message.id === streamingMessageIdRef.current &&
      !message.content,
    [isStreaming]
  )

  const shouldShowTypingIndicator = messages.some(isStreamingEmptyAssistantMessage)

  // ── Navigation ─────────────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    setMessages([])
    setCurrentSessionId(null)
    setError(null)
    router.push('/ai-chat')
  }, [router])

  const handleSessionSelect = useCallback(
    (selectedSessionId: string) => {
      setCurrentSessionId(selectedSessionId)
      const session = sessions.find((s) => s.id === selectedSessionId)
      if (session) setMessages(session.messages)
    },
    [sessions]
  )

  // ── Send message ────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const textToSend = messageText || inputValue
      if (textToSend.trim() === '' || isStreaming) return

      // Ensure a session exists
      let sessionId = currentSessionId
      if (!sessionId) {
        const newSession = createNewSession(textToSend)
        setSessions((prev) => {
          const updated = [newSession, ...prev]
          saveSessions(updated)
          return updated
        })
        sessionId = newSession.id
        setCurrentSessionId(sessionId)
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: textToSend,
        sender: 'user',
        timestamp: getCurrentTimestamp(),
      }

      const streamingMessageId = `assistant-${Date.now()}`
      streamingMessageIdRef.current = streamingMessageId

      const aiPlaceholder: Message = {
        id: streamingMessageId,
        content: '',
        sender: 'assistant',
        timestamp: getCurrentTimestamp(),
      }

      const nextMessages = [...messages, userMessage, aiPlaceholder]
      setMessages(nextMessages)
      setInputValue('')
      setError(null)

      const sid = sessionId

      sendStreamingMessage({ query: textToSend, top_k: 5 }, (data) => {
        // Replace placeholder with final content and sources
        setMessages((prev) => {
          const finalMessages = prev.map((msg) =>
            msg.id === streamingMessageId
              ? {
                  ...msg,
                  id: data.messageId || streamingMessageId,
                  content: data.content || msg.content,
                  sources: (data as { sources?: SourceInfo[] }).sources,
                  chunks_retrieved: (data as { chunks_retrieved?: number }).chunks_retrieved,
                }
              : msg
          )
          // Persist to localStorage
          persistSessionMessages(sid, finalMessages)
          return finalMessages
        })

        streamingMessageIdRef.current = null
      })
    },
    [
      inputValue,
      isStreaming,
      currentSessionId,
      messages,
      sendStreamingMessage,
      persistSessionMessages,
    ]
  )

  const handleLandingTextareaKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isStreaming && inputValue.trim()) {
        e.preventDefault()
        void handleSendMessage()
      }
    },
    [isStreaming, inputValue, handleSendMessage]
  )

  const handlePromptClick = useCallback(
    (prompt: string) => {
      handleSendMessage(prompt)
    },
    [handleSendMessage]
  )

  // ── Session management ─────────────────────────────────────────────────

  const handleDeleteChat = useCallback((sessionId: string) => {
    setDeleteSessionId(sessionId)
  }, [])

  const handleRenameChat = useCallback(
    async (sessionId: string, newTitle: string) => {
      setSessions((prev) => {
        const updated = prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
        saveSessions(updated)
        return updated
      })
      // Also call the stub mutation (no-op) for consistency
      try {
        await updateMutation.mutateAsync({ sessionId, title: newTitle })
      } catch {
        // Expected – no-op stub
      }
    },
    [updateMutation]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteSessionId) return

    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== deleteSessionId)
      saveSessions(updated)
      return updated
    })

    if (deleteSessionId === currentSessionId) {
      handleNewChat()
    }

    try {
      await deleteMutation.mutateAsync(deleteSessionId)
    } catch {
      // Expected – no-op stub
    }
    setDeleteSessionId(null)
  }, [deleteSessionId, deleteMutation, currentSessionId, handleNewChat])

  // ── Render: landing page (no session, no messages) ──────────────────────

  if (!currentSessionId && messages.length === 0) {
    return (
      <>
        <div className="bg-background flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6">
            <div className="mb-12 text-center">
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                AskYourDoc
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Ask questions about your uploaded documents
              </p>
            </div>

            <div className="w-full max-w-3xl">
              <div className="border-border bg-card relative rounded-2xl border shadow-lg">
                <textarea
                  ref={landingTextareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleLandingTextareaKeyDown}
                  placeholder="Ask anything related to your documents…"
                  disabled={isStreaming}
                  rows={1}
                  className="text-foreground placeholder:text-muted-foreground max-h-[200px] min-h-[48px] w-full resize-none rounded-2xl bg-transparent px-4 pt-4 pr-16 pb-4 text-base leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="border-border absolute right-3 bottom-3 flex items-center gap-2 border-l pl-3">
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isStreaming || !inputValue.trim()}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex size-10 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="size-5" />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt)}
                    disabled={isStreaming}
                    className="border-border bg-card hover:border-ring hover:bg-muted flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="size-4" />
                    {prompt}
                  </button>
                ))}
              </div>

              {!loadingAllSessions && allSessions.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-muted-foreground mb-4 text-center text-sm font-medium">
                    Recent chats
                  </h2>
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl">
                    {allSessions.slice(0, 5).map((session) => (
                      <ChatListItem
                        key={session.id}
                        id={session.id}
                        title={session.title}
                        messageCount={session.message_count}
                        lastActivity={session.last_activity}
                        isActive={session.is_active}
                        isSelected={false}
                        onClick={() => handleSessionSelect(session.id)}
                        onDelete={handleDeleteChat}
                        onRename={handleRenameChat}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={!!deleteSessionId}
          title="Delete Chat Session?"
          description="This will permanently delete the chat session and all its messages."
          confirmLabel="Delete"
          confirmVariant="destructive"
          isConfirming={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteSessionId(null)}
          onOpenChange={(open) => !open && setDeleteSessionId(null)}
        />
      </>
    )
  }

  // ── Render: active chat ──────────────────────────────────────────────────

  return (
    <>
      <div className="bg-background flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 overflow-hidden p-6">
          {/* Main Chat Area */}
          <div className="flex flex-1 flex-col">
            <div className="border-border bg-card flex h-full flex-col rounded-2xl border shadow-sm">
              {/* Header */}
              <div className="border-border flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5]">
                    <Sparkles className="size-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {sessions.find((s) => s.id === currentSessionId)?.title || 'AskYourDoc'}
                    </h1>
                    {error && <p className="text-destructive text-xs">{error}</p>}
                  </div>
                </div>
                {currentSessionId && (
                  <Button
                    onClick={handleNewChat}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="size-4" />
                    New Chat
                  </Button>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
                  <div className="flex flex-col gap-8">
                    {messages.map((message) => {
                      if (isStreamingEmptyAssistantMessage(message)) return null

                      return (
                        <div key={message.id}>
                          <MessageBubble message={message} />
                          {/* Show sources under assistant messages */}
                          {message.sender === 'assistant' && message.sources && (
                            <SourcesPanel sources={message.sources} />
                          )}
                        </div>
                      )
                    })}

                    {shouldShowTypingIndicator && <TypingIndicator />}
                    <div ref={messagesEndRef} aria-hidden="true" />
                  </div>

                  {messages.length === 0 && !isStreaming && (
                    <SuggestedPrompts
                      prompts={SUGGESTED_PROMPTS}
                      onPromptClick={handlePromptClick}
                    />
                  )}
                </div>
              </div>

              {/* Input Area */}
              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={() => handleSendMessage()}
                disabled={isStreaming}
                loading={isStreaming}
              />
            </div>
          </div>

          {/* Right Sidebar: Chat History */}
          {(messages.length > 1 || currentSessionId) && (
            <div className="hidden w-80 flex-col lg:flex">
              <div className="border-border bg-card flex h-full flex-col rounded-2xl border p-4 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    All Chats
                  </h2>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {loadingAllSessions ? (
                    <ChatListSkeleton />
                  ) : allSessions.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">No chats yet</p>
                    </div>
                  ) : (
                    allSessions.map((session) => (
                      <ChatListItem
                        key={session.id}
                        id={session.id}
                        title={session.title}
                        messageCount={session.message_count}
                        lastActivity={session.last_activity}
                        isActive={session.is_active}
                        isSelected={currentSessionId === session.id}
                        onClick={() => handleSessionSelect(session.id)}
                        onDelete={handleDeleteChat}
                        onRename={handleRenameChat}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteSessionId}
        title="Delete Chat Session?"
        description="This will permanently delete the chat session and all its messages."
        confirmLabel="Delete"
        confirmVariant="destructive"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteSessionId(null)}
        onOpenChange={(open) => !open && setDeleteSessionId(null)}
      />
    </>
  )
}
