/**
 * TypingIndicator Component
 * Shows when the AI is generating a response
 */

import React from 'react'
import { Sparkles } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
        <Sparkles className="size-4 text-white" />
      </div>
      <div className="max-w-[80%]">
        <div className="border-border bg-background rounded-2xl border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-muted-foreground size-2 animate-bounce rounded-full"></div>
            <div
              className="bg-muted-foreground size-2 animate-bounce rounded-full"
              style={{ animationDelay: '0.2s' }}
            ></div>
            <div
              className="bg-muted-foreground size-2 animate-bounce rounded-full"
              style={{ animationDelay: '0.4s' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}
