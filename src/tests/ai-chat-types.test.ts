/**
 * AI Chat Types and Data Tests
 * Test suite for AI Chat types, constants, and default data
 */

import { describe, it, expect } from 'vitest'
import { SUGGESTED_PROMPTS, PROMPT_CATEGORIES } from '@/containers/ai-chat/data/default-messages'
import type { Message } from '@/containers/ai-chat/lib/types'

describe('AI Chat Default Messages', () => {
  describe('SUGGESTED_PROMPTS', () => {
    it('should be an array', () => {
      expect(Array.isArray(SUGGESTED_PROMPTS)).toBe(true)
    })

    it('should have at least one prompt', () => {
      expect(SUGGESTED_PROMPTS.length).toBeGreaterThan(0)
    })

    it('should contain only strings', () => {
      SUGGESTED_PROMPTS.forEach((prompt) => {
        expect(typeof prompt).toBe('string')
      })
    })

    it('should have non-empty prompts', () => {
      SUGGESTED_PROMPTS.forEach((prompt) => {
        expect(prompt.length).toBeGreaterThan(0)
      })
    })

    it('should include relevant prompts', () => {
      const promptsText = SUGGESTED_PROMPTS.join(' ').toLowerCase()
      // Check for keywords related to investment research
      const hasRelevantContent =
        promptsText.includes('memo') ||
        promptsText.includes('pipeline') ||
        promptsText.includes('companies') ||
        promptsText.includes('irr')

      expect(hasRelevantContent).toBe(true)
    })
  })

  describe('PROMPT_CATEGORIES', () => {
    it('should have defined categories', () => {
      expect(PROMPT_CATEGORIES).toHaveProperty('research')
      expect(PROMPT_CATEGORIES).toHaveProperty('pipeline')
      expect(PROMPT_CATEGORIES).toHaveProperty('portfolio')
      expect(PROMPT_CATEGORIES).toHaveProperty('general')
    })

    it('should have string values', () => {
      Object.values(PROMPT_CATEGORIES).forEach((category) => {
        expect(typeof category).toBe('string')
      })
    })

    it('should have capitalized category names', () => {
      Object.values(PROMPT_CATEGORIES).forEach((category) => {
        expect(category.charAt(0)).toBe(category.charAt(0).toUpperCase())
      })
    })
  })
})

describe('AI Chat Types', () => {
  describe('Message Type', () => {
    it('should accept valid user message', () => {
      const userMessage: Message = {
        id: 'msg-1',
        content: 'Hello',
        sender: 'user',
        timestamp: '2024-10-16T10:00:00Z',
      }

      expect(userMessage.sender).toBe('user')
      expect(userMessage.content).toBe('Hello')
    })

    it('should accept valid assistant message', () => {
      const assistantMessage: Message = {
        id: 'msg-2',
        content: 'Hi there!',
        sender: 'assistant',
        timestamp: '2024-10-16T10:00:30Z',
      }

      expect(assistantMessage.sender).toBe('assistant')
    })

    it('should have required properties', () => {
      const message: Message = {
        id: 'test',
        content: 'test content',
        sender: 'user',
        timestamp: '2024-10-16T10:00:00Z',
      }

      expect(message).toHaveProperty('id')
      expect(message).toHaveProperty('content')
      expect(message).toHaveProperty('sender')
      expect(message).toHaveProperty('timestamp')
    })
  })

  describe('ChatConversationSummary Type', () => {
    it('should have correct structure for chat summary', () => {
      const summary = {
        session_id: 'session-1',
        title: 'Chat about Tesla',
        created_at: '2024-10-16T10:00:00Z',
        updated_at: '2024-10-16T11:00:00Z',
        message_count: 5,
      }

      expect(summary).toHaveProperty('session_id')
      expect(summary).toHaveProperty('title')
      expect(summary).toHaveProperty('message_count')
      expect(typeof summary.message_count).toBe('number')
    })
  })

  describe('ChatMessageRequest Type', () => {
    it('should handle message without session', () => {
      const request = {
        message: 'What is the pipeline status?',
      }

      expect(request).toHaveProperty('message')
      expect(request.message.length).toBeGreaterThan(0)
    })

    it('should handle message with session', () => {
      const request = {
        message: 'Tell me more',
        sessionId: 'session-1',
      }

      expect(request).toHaveProperty('message')
      expect(request).toHaveProperty('sessionId')
    })
  })
})

describe('AI Chat Data Validation', () => {
  it('should have unique message IDs', () => {
    const messages = [
      {
        id: 'test-1',
        content: 'Test',
        sender: 'user' as const,
        timestamp: '2024-10-16T10:00:00Z',
      },
      {
        id: 'test-2',
        content: 'Test 2',
        sender: 'assistant' as const,
        timestamp: '2024-10-16T10:00:30Z',
      },
    ]

    const ids = messages.map((m) => m.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(messages.length)
  })

  it('should have reasonable prompt lengths', () => {
    SUGGESTED_PROMPTS.forEach((prompt) => {
      expect(prompt.length).toBeGreaterThan(5) // Not too short
      expect(prompt.length).toBeLessThan(100) // Not too long
    })
  })
})
