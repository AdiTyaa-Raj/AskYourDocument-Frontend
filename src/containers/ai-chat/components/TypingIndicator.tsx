/**
 * TypingIndicator Component
 * Shows when the AI is generating a response
 */

import React from 'react'

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="border-border bg-background max-w-[80%] rounded-2xl border px-4 py-3">
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
  )
}
