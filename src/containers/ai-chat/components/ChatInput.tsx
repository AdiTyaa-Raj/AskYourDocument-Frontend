import type { KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { ChatInputProps } from '@/containers/ai-chat/lib/types'
import { useAutoResizeTextarea } from '@/containers/ai-chat/lib/useAutoResizeTextarea'

const CHAT_INPUT_MAX_HEIGHT = 200

export function ChatInput({ value, onChange, onSubmit, disabled, loading }: ChatInputProps) {
  const textareaRef = useAutoResizeTextarea(value, CHAT_INPUT_MAX_HEIGHT)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled && !loading) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="border-border bg-background border-t px-6 py-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about companies, memos, or pipeline..."
            disabled={disabled || loading}
            rows={1}
            className="border-input bg-muted text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-background max-h-[200px] min-h-11 flex-1 resize-none rounded-lg border px-4 py-3 text-sm leading-relaxed focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            onClick={onSubmit}
            disabled={disabled || loading || !value.trim()}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex size-11 flex-shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-5" />
          </button>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
