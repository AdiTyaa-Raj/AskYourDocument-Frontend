import React from 'react'

export function WelcomeMessage() {
  return (
    <div className="flex items-start gap-3">
      <div className="max-w-[100%] text-left">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
          <p className="text-sm leading-relaxed">
            Welcome to Document AI Assistant! 👋 I&apos;m here to help you understand and explore
            your document. Feel free to ask me any questions about the content, key points, or
            insights you&apos;d like to discover.
          </p>
        </div>
      </div>
    </div>
  )
}
