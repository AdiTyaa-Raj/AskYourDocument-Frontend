'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sparkles, AlertCircle, Plus } from 'lucide-react'
import type { Message, ChatSession } from '@/containers/ai-chat/lib/types'
import { getCurrentTimestamp } from '@/lib/date-utils'
import {
  useSessionDetails,
  useStreamingChat,
  useChatSessions,
  useDeleteChatSession,
  useUpdateChatSession,
} from '@/containers/ai-chat/lib'
import {
  MessageBubble,
  ChatInput,
  SuggestedPrompts,
  TypingIndicator,
  ChatListItem,
  ChatSkeleton,
  ChatListSkeleton,
} from '@/containers/ai-chat/components'
import { SUGGESTED_PROMPTS } from '@/containers/ai-chat/data/default-messages'
import { useAutoResizeTextarea } from '@/containers/ai-chat/lib/useAutoResizeTextarea'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

export function AIChatContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)

  // Ref to track the streaming message ID for updating
  const streamingMessageIdRef = useRef<string | null>(null)
  // Ref for auto-scrolling to latest message
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const landingTextareaRef = useAutoResizeTextarea(inputValue, 200)

  const {
    data: sessionData,
    isLoading: loadingSession,
    error: sessionError,
  } = useSessionDetails(currentSessionId)

  // Streaming chat hook
  const {
    isStreaming,
    streamedContent,
    sendStreamingMessage,
    error: streamingError,
  } = useStreamingChat()

  const deleteMutation = useDeleteChatSession()
  const updateMutation = useUpdateChatSession()
  const { data: allSessions = [], isLoading: loadingAllSessions } = useChatSessions(
    0,
    100,
    undefined,
    ''
  )

  useEffect(() => {
    if (sessionData?.messages && sessionData.messages.length > 0) {
      setMessages(sessionData.messages)
    }
  }, [sessionData])

  useEffect(() => {
    setCurrentSessionId(sessionId)

    if (!sessionId) {
      setMessages([])
    }
  }, [sessionId])

  // Update streaming message content as it arrives
  useEffect(() => {
    // Update content while streaming or when we have final content
    if (streamingMessageIdRef.current && streamedContent) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageIdRef.current ? { ...msg, content: streamedContent } : msg
        )
      )
    }
  }, [streamedContent])

  // Auto-scroll to latest message when messages or streaming state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streamedContent, isStreaming])

  // Handle streaming errors
  useEffect(() => {
    if (streamingError) {
      setError(streamingError)
    }
  }, [streamingError])

  // Check if it's a 404 error (session doesn't exist)
  const is404Error =
    sessionError &&
    ((sessionError as { response?: { status?: number } })?.response?.status === 404 ||
      (sessionError as { status?: number })?.status === 404 ||
      (sessionError instanceof Error && sessionError.message.includes('404')))

  // Handle session not found (404) - redirect to new chat
  useEffect(() => {
    if (is404Error && currentSessionId) {
      setCurrentSessionId(null)
      setMessages([])
      router.replace('/ai-chat')
    }
  }, [is404Error, currentSessionId, router])

  // Helper to check if a message is the currently streaming empty assistant message
  const isStreamingEmptyAssistantMessage = useCallback(
    (message: Message): boolean => {
      return (
        isStreaming &&
        message.sender === 'assistant' &&
        message.id === streamingMessageIdRef.current &&
        !message.content
      )
    },
    [isStreaming]
  )

  // Check if we should show the typing indicator (when there's a streaming empty message)
  const shouldShowTypingIndicator = messages.some(isStreamingEmptyAssistantMessage)

  const handleNewChat = useCallback(() => {
    setMessages([])
    setCurrentSessionId(null)
    router.push('/ai-chat')
  }, [router])

  const handleSessionSelect = useCallback(
    (selectedSessionId: string) => {
      setCurrentSessionId(selectedSessionId)
      router.push(`/ai-chat?session=${selectedSessionId}`)
    },
    [router]
  )

  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const textToSend = messageText || inputValue
      if (textToSend.trim() === '' || isStreaming) return

      // Add user message optimistically
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: textToSend,
        sender: 'user',
        timestamp: getCurrentTimestamp(),
      }

      // Create placeholder for streaming AI response
      const streamingMessageId = `assistant-${Date.now()}`
      streamingMessageIdRef.current = streamingMessageId

      const aiMessage: Message = {
        id: streamingMessageId,
        content: '', // Will be filled by streaming
        sender: 'assistant',
        timestamp: getCurrentTimestamp(),
      }

      setMessages((prev) => [...prev, userMessage, aiMessage])
      setInputValue('')
      setError(null)

      // Send streaming message
      // Don't use currentSessionId if the session doesn't exist (404 error)
      const validSessionId = is404Error ? undefined : currentSessionId
      sendStreamingMessage(
        {
          query: textToSend,
          session_id: validSessionId || undefined,
        },
        (data) => {
          // On complete callback
          if (data.sessionId && (!currentSessionId || is404Error)) {
            // Set session ID and update URL to prevent stale session issues
            setCurrentSessionId(data.sessionId)
            // Update URL to include the new session ID (use replace to not add to history)
            router.replace(`/ai-chat?session=${data.sessionId}`)
          }

          // Always update the message with final content when streaming completes
          // Use the server's message_id if available, otherwise keep the placeholder id
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? {
                    ...msg,
                    id: data.messageId || streamingMessageId,
                    content: data.content || msg.content,
                  }
                : msg
            )
          )

          // Clear the streaming ref
          streamingMessageIdRef.current = null
        }
      )
    },
    [inputValue, isStreaming, currentSessionId, is404Error, sendStreamingMessage, router]
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

  const handleDeleteChat = useCallback((sessionId: string) => {
    setDeleteSessionId(sessionId)
  }, [])

  const handleRenameChat = useCallback(
    async (sessionId: string, newTitle: string) => {
      try {
        await updateMutation.mutateAsync({ sessionId, title: newTitle })
      } catch (err) {
        console.error('Failed to rename chat:', err)
      }
    },
    [updateMutation]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteSessionId) return

    try {
      await deleteMutation.mutateAsync(deleteSessionId)

      // If we deleted the current session, navigate to new chat
      if (deleteSessionId === currentSessionId) {
        handleNewChat()
      }

      setDeleteSessionId(null)
    } catch (err) {
      console.error('Failed to delete chat:', err)
      setDeleteSessionId(null)
    }
  }, [deleteSessionId, deleteMutation, currentSessionId, handleNewChat])

  // Show loading state while loading session
  if (loadingSession && currentSessionId) {
    return (
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
                      Loading chat session...
                    </h1>
                  </div>
                </div>
              </div>

              {/* Loading Messages Area */}
              <div className="flex-1 overflow-y-auto p-6">
                <ChatSkeleton />
              </div>

              {/* Input Area (disabled) */}
              <ChatInput
                value=""
                onChange={() => {}}
                onSubmit={() => {}}
                disabled={true}
                loading={true}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if session failed to load (non-404 errors)
  // Note: 404 errors are handled by useEffect above which redirects to new chat
  if (sessionError && currentSessionId) {
    // Don't show error for 404 - we're redirecting via useEffect
    if (is404Error) {
      return null
    }

    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Failed to load chat session
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {sessionError instanceof Error ? sessionError.message : 'Please try again'}
          </p>
        </div>
      </div>
    )
  }

  // Show centered landing page when no session is active and no messages
  if (!currentSessionId && messages.length === 0) {
    return (
      <>
        <div className="bg-background flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6">
            {/* Arnie Branding */}
            <div className="mb-12 text-center">
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Arnie
              </h1>
            </div>

            {/* Main Input Box */}
            <div className="w-full max-w-3xl">
              <div className="border-border bg-card relative rounded-2xl border shadow-lg">
                <textarea
                  ref={landingTextareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleLandingTextareaKeyDown}
                  placeholder="Ask anything related to text in the available documents and notes."
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

              {/* Suggested Prompt Buttons */}
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

              {/* Recent Chats Section */}
              {!loadingAllSessions && allSessions.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-muted-foreground mb-4 text-center text-sm font-medium">
                    Recent chats
                  </h2>
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl">
                    {allSessions.slice(0, 5).map((session: ChatSession) => (
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

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={!!deleteSessionId}
          title="Delete Chat Session?"
          description="This action cannot be undone. This will permanently delete the chat session and all its messages."
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
                      {sessionData?.session?.title || 'Ask Arnie'}
                    </h1>
                    {error && <p className="text-destructive text-xs">{error}</p>}
                  </div>
                </div>
                {/* Show New Chat button only when a session is selected */}
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

              {/* Messages Area - Reduced height to accommodate chat list below */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
                  <div className="flex flex-col gap-8">
                    {messages.map((message) => {
                      // Don't render assistant message bubble while streaming and content is empty
                      // Only show TypingIndicator in this case
                      if (isStreamingEmptyAssistantMessage(message)) {
                        return null
                      }

                      return <MessageBubble key={message.id} message={message} />
                    })}

                    {/* Show typing indicator only when streaming and the streaming message has no content yet */}
                    {shouldShowTypingIndicator && <TypingIndicator />}
                    {/* Sentinel for auto-scroll to latest message */}
                    <div ref={messagesEndRef} aria-hidden="true" />
                  </div>

                  {/* Suggested Prompts - show only on empty conversation */}
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

          {/* Right Sidebar: All Chats (visible after conversation starts) */}
          {messages.length > 1 || currentSessionId ? (
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
                    allSessions.map((session: ChatSession) => (
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
          ) : null}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteSessionId}
        title="Delete Chat Session?"
        description="This action cannot be undone. This will permanently delete the chat session and all its messages."
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
