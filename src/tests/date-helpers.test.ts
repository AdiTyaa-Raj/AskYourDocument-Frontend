/**
 * Date Helpers Tests
 * Test suite for date formatting utilities
 */

import { describe, it, expect, vi } from 'vitest'
import { formatDate, formatTime, formatRelativeTime, getCurrentTimestamp } from '@/lib/date-utils'

describe('Date Helpers', () => {
  describe('formatDate', () => {
    it('should format a valid date string', () => {
      const date = '2024-10-16T10:30:00Z'
      const result = formatDate(date)
      expect(result).toBe('Oct 16, 2024')
    })

    it('should return "-" for null input', () => {
      expect(formatDate(null)).toBe('-')
    })

    it('should return "-" for undefined input', () => {
      expect(formatDate(undefined)).toBe('-')
    })

    it('should return "-" for invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('-')
    })

    it('should accept custom options', () => {
      const date = '2024-10-16T10:30:00Z'
      const result = formatDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      expect(result).toContain('October')
      expect(result).toContain('2024')
    })
  })

  describe('formatTime', () => {
    it('should format a Date object', () => {
      const date = new Date('2024-10-16T10:30:00Z')
      const result = formatTime(date)
      // Result will vary by timezone, just check format
      expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/)
    })

    it('should format a date string', () => {
      const date = '2024-10-16T10:30:00Z'
      const result = formatTime(date)
      expect(result).toMatch(/\d{1,2}:\d{2}\s[AP]M/)
    })

    it('should return "-" for invalid input', () => {
      expect(formatTime('invalid')).toBe('-')
    })
  })

  describe('formatRelativeTime', () => {
    it('should return "Just now" for very recent dates', () => {
      const now = new Date()
      const result = formatRelativeTime(now.toISOString())
      expect(result).toBe('Just now')
    })

    it('should return minutes ago for recent dates', () => {
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      const result = formatRelativeTime(fiveMinutesAgo.toISOString())
      expect(result).toContain('minutes ago')
    })

    it('should return hours ago for older dates', () => {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      const result = formatRelativeTime(twoHoursAgo.toISOString())
      expect(result).toContain('hours ago')
    })

    it('should return days ago for even older dates', () => {
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const result = formatRelativeTime(threeDaysAgo.toISOString())
      expect(result).toContain('days ago')
    })

    it('should return formatted date for very old dates', () => {
      const oldDate = '2020-01-01T00:00:00Z'
      const result = formatRelativeTime(oldDate)
      expect(result).toContain('2020')
    })

    it('should return "-" for invalid input', () => {
      expect(formatRelativeTime('invalid')).toBe('-')
    })

    it('should treat timezone-less timestamps as UTC', () => {
      vi.useFakeTimers()
      const base = new Date(Date.UTC(2025, 0, 1, 1, 0, 0))
      vi.setSystemTime(base)
      const result = formatRelativeTime('2025-01-01T00:00:00')
      expect(result).toBe('1 hours ago')
      vi.useRealTimers()
    })
  })

  describe('getCurrentTimestamp', () => {
    it('should return a valid ISO timestamp', () => {
      const timestamp = getCurrentTimestamp()
      expect(() => new Date(timestamp)).not.toThrow()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should return a recent timestamp', () => {
      const timestamp = getCurrentTimestamp()
      const date = new Date(timestamp)
      const now = new Date()
      const diffInSeconds = Math.abs(now.getTime() - date.getTime()) / 1000
      // Should be within 1 second of current time
      expect(diffInSeconds).toBeLessThan(1)
    })
  })
})
