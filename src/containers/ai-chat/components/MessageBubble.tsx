import { Sparkles } from 'lucide-react'
import { InitialsAvatar } from '@/components/shared/InitialsAvatar'
import { formatTime } from '@/lib/date-utils'
import type { MessageBubbleProps } from '@/containers/ai-chat/lib/types'
import { parseMessageContent } from '@/containers/ai-chat/lib/message-utils'

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.sender === 'assistant'

  return (
    <div className={`flex items-start gap-3 ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
      {isAssistant ? (
        <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5]">
          <Sparkles className="size-4 text-white" />
        </div>
      ) : (
        <InitialsAvatar name="You" className="size-8" textClassName="text-[10px]" />
      )}
      <div className={`max-w-[80%] ${isAssistant ? 'text-left' : 'text-right'}`}>
        <div
          className={`mb-1 text-[11px] font-medium ${isAssistant ? 'text-purple-700 dark:text-purple-400' : 'text-blue-700 dark:text-blue-400'}`}
        >
          {isAssistant ? 'Arnie' : 'You'}
        </div>
        <div
          className={`border px-5 py-4 ${
            isAssistant
              ? 'rounded-xl border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
              : 'rounded-xl border-[#2563EB] bg-[#2563EB] text-left text-white dark:border-[#1E40AF] dark:bg-[#1E40AF]'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {parseMessageContent(message.content)}
          </p>
          <p
            className={`mt-2 text-xs ${isAssistant ? 'text-gray-500 dark:text-gray-400' : 'text-left text-white/80'}`}
          >
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  )
}
