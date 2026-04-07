import React from 'react'
import Link from 'next/link'

/**
 * Parses message content and converts document/note references into clickable links
 * Supports: [doc:1] -> /documents/1 and [note:5] -> /research-updates?viewMemo=5
 * @param content - The raw message content with potential [doc:X] or [note:X] references
 * @returns JSX elements with parsed text and links
 */
export function parseMessageContent(content: string): React.ReactNode {
  // Combined pattern to match both [doc:X] and [note:X] and multiple references within a single block
  const refPattern = /\[((?:(?:doc|note):\d+)(?:,\s*(?:doc|note):\d+)*)\]/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let hasMatches = false

  // Find all matches and build the array of text and link elements
  while ((match = refPattern.exec(content)) !== null) {
    hasMatches = true
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index))
    }

    const references = match[1].split(', ').map((ref) => {
      const [type, id] = ref.split(':')
      return { type, id }
    })

    const matchIndex = match.index
    parts.push('[')
    references.forEach((ref, index) => {
      const { type, id } = ref
      // Determine the URL and styling based on type
      const href = type === 'doc' ? `/documents/${id}` : `/research-updates?viewMemo=${id}`

      const colorClass =
        type === 'doc'
          ? 'text-blue-600 decoration-blue-600/30 hover:text-blue-700 hover:decoration-blue-700 dark:text-blue-400 dark:decoration-blue-400/30 dark:hover:text-blue-300 dark:hover:decoration-blue-300'
          : 'text-purple-600 decoration-purple-600/30 hover:text-purple-700 hover:decoration-purple-700 dark:text-purple-400 dark:decoration-purple-400/30 dark:hover:text-purple-300 dark:hover:decoration-purple-300'

      parts.push(
        <Link
          key={`${type}-${id}-${matchIndex}-${index}`}
          href={href}
          className={`font-medium underline underline-offset-2 transition-colors ${colorClass}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {type.toUpperCase()}:{id}
        </Link>
      )
      if (index < references.length - 1) {
        parts.push(', ')
      }
    })
    parts.push(']')

    lastIndex = match.index + match[0].length
  }

  // If no matches were found, return the original content
  if (!hasMatches) {
    return content
  }

  // Add remaining text after the last match
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return parts
}
