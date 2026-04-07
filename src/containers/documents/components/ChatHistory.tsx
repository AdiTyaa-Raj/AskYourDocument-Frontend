import { Sparkles } from 'lucide-react'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'
import { formatTime } from '@/lib/date-utils'
import type { ChatHistoryProps } from '@/containers/documents/lib/types'

export function ChatHistory({ messages }: ChatHistoryProps) {
  if (messages.length === 0) {
    return null
  }

  return (
    <div className="mb-4 space-y-6">
      {messages.map((msg, index) => {
        const isAssistant = msg.role === 'assistant'

        return (
          <div
            key={index}
            className={`flex items-start gap-3 ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}
          >
            {isAssistant ? (
              <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
                <Sparkles className="size-4 text-white" />
              </div>
            ) : (
              <InitialsAvatar name="You" className="size-8" textClassName="text-[10px]" />
            )}
            <div className={`max-w-[80%] ${isAssistant ? 'text-left' : 'text-right'}`}>
              {!isAssistant && (
                <div className="mb-1 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                  You
                </div>
              )}
              <div
                className={`border px-5 py-4 ${
                  isAssistant
                    ? 'rounded-xl border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
                    : 'rounded-xl border-[#2563EB] bg-[#2563EB] text-left text-white dark:border-[#1E40AF] dark:bg-[#1E40AF]'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`mt-2 text-xs ${isAssistant ? 'text-gray-500 dark:text-gray-400' : 'text-left text-white/80'}`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
