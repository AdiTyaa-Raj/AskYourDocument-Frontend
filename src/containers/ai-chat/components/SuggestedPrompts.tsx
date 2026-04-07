import React from 'react'
import type { SuggestedPromptsProps } from '@/containers/ai-chat/lib/types'

export function SuggestedPrompts({ prompts, onPromptClick }: SuggestedPromptsProps) {
  return (
    <div className="mt-auto pt-8">
      <p className="text-muted-foreground mb-4 text-sm">Suggested prompts:</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onPromptClick(prompt)}
            className="border-border bg-background text-foreground hover:border-ring hover:bg-muted rounded-md border px-3 py-1.5 text-xs whitespace-nowrap transition"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
