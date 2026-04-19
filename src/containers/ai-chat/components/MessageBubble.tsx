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
        <div className="bg-primary flex size-8 flex-shrink-0 items-center justify-center rounded-full">
          <Sparkles className="size-4 text-white" />
        </div>
      ) : (
        <InitialsAvatar name="You" className="size-8" textClassName="text-[10px]" />
      )}
      <div className={`max-w-[80%] ${isAssistant ? 'text-left' : 'text-right'}`}>
        <div
          className={`mb-1 text-[11px] font-medium ${isAssistant ? 'text-primary/70' : 'text-muted-foreground'}`}
        >
          {isAssistant ? 'AYD Assistant' : 'You'}
        </div>
        <div
          className={`border px-5 py-4 ${
            isAssistant
              ? 'rounded-xl border-border bg-card text-card-foreground'
              : 'rounded-xl border-primary bg-primary text-left text-primary-foreground'
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
