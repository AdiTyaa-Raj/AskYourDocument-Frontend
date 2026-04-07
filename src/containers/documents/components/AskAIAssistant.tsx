import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import {
  Sparkles,
  ChevronDown,
  Download,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AskAIAssistantProps, ApiDocument } from '@/containers/documents/lib/types'
import { downloadChatAsMarkdown } from '@/containers/documents/lib/utils'
import { ChatHistory } from './ChatHistory'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { WelcomeMessage } from './WelcomeMessage'
import { getChatPlaceholder } from '../lib'

export function AskAIAssistant({
  rawApiDocument,
  chatStatus,
  isLoadingStatus = false,
  statusError,
  chatHistory,
  onSendMessage,
  onRetryAnalysis,
  isSendingMessage = false,
  isRetrying = false,
  disableInput = false,
}: AskAIAssistantProps) {
  const [question, setQuestion] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)
  const chatScrollContainerRef = useRef<HTMLDivElement>(null)

  // Check if error is a permission error (403)
  const isPermissionError =
    statusError && (statusError as { response?: { status?: number } })?.response?.status === 403

  // Check if document processing has failed
  const hasProcessingFailed = rawApiDocument
    ? ['chunking_status', 'embedding_status', 'analysis_status'].some(
        (statusKey) => rawApiDocument[statusKey as keyof ApiDocument] === 'FAILED'
      )
    : false

  const isReady = chatStatus?.ready ?? false
  const isFailed = hasProcessingFailed && !isLoadingStatus
  // Show processing state immediately when retry is clicked as the content reprocessing initiated from backend
  const isProcessing = isRetrying || (!isReady && !isLoadingStatus && !statusError && !isFailed)

  useEffect(() => {
    if (isReady && !isExpanded && !isPermissionError) {
      setIsExpanded(true)
    }
  }, [isReady, isExpanded, isPermissionError])

  // Auto-scroll to latest message when chat history or sending state changes
  useLayoutEffect(() => {
    const el = chatScrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatHistory, isSendingMessage])

  const handleSubmit = () => {
    if (!question.trim() || !isReady) return

    const currentQuestion = question
    setQuestion('')
    onSendMessage(currentQuestion)
  }

  const handleExportChat = () => {
    downloadChatAsMarkdown(chatHistory)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex flex-1 items-center gap-2 text-left hover:opacity-80"
        >
          <Sparkles className={'size-5 text-blue-600'} />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Ask AI Assistant
          </h2>
          <ChevronDown
            className={`ml-auto size-4 transition-transform ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
        {isFailed && !isRetrying && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetryAnalysis}
            disabled={isRetrying}
            className="ml-2 text-blue-600"
          >
            <RefreshCw className={`mr-1 size-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry AI Analysis
          </Button>
        )}

        {chatHistory.length > 0 && isReady && (
          <Button size="sm" variant="ghost" onClick={handleExportChat} className="ml-2">
            <Download className="mr-1 size-3.5" />
            Export Chat
          </Button>
        )}
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-4 p-4">
          {isPermissionError && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                AI chat is not available for this document due to permission restrictions.
              </AlertDescription>
            </Alert>
          )}

          {/* Failed state or processing - show warning box */}
          {(isFailed || isProcessing) && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex gap-4">
                  {/* Icon column */}
                  <div className="flex shrink-0 items-start pt-1">
                    {isProcessing ? (
                      <Loader2 size={30} className="animate-spin text-amber-600" />
                    ) : (
                      <AlertTriangle size={30} className="text-amber-600" />
                    )}
                  </div>

                  <div>
                    <h3 className="mb-1 text-sm font-bold text-amber-900">
                      {isProcessing ? 'AI Analysis in Progress' : 'AI Assistant Unavailable'}
                    </h3>
                    <p className="text-sm leading-relaxed text-amber-700">
                      {isProcessing
                        ? 'We are currently analyzing this document, and AI features will become available automatically as soon as processing is complete.'
                        : "We encountered an issue while analyzing this document's text. You can still view and download the file, but AI-powered search is disabled."}
                    </p>
                  </div>
                </div>
              </div>
              <ChatInput
                value=""
                onChange={() => {}}
                onSubmit={() => {}}
                disabled
                placeholder={
                  isProcessing
                    ? 'AI analysis in progress...'
                    : 'AI chat unavailable for this document'
                }
              />
            </div>
          )}

          {isReady && !isFailed && (
            <>
              <div
                ref={chatScrollContainerRef}
                className="max-h-[400px] min-h-[200px] space-y-4 overflow-y-auto"
              >
                {chatHistory.length === 0 && !isSendingMessage && <WelcomeMessage />}
                {chatHistory.length > 0 && <ChatHistory messages={chatHistory} />}
                {isSendingMessage && <TypingIndicator />}
              </div>
              <ChatInput
                value={question}
                onChange={setQuestion}
                onSubmit={handleSubmit}
                disabled={isSendingMessage || disableInput}
                placeholder={getChatPlaceholder(disableInput, isSendingMessage)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
