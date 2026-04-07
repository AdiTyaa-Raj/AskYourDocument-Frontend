/**
 * Documents Components Tests
 * Test suite for Documents UI components
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PropertyRow } from '@/containers/documents/components/PropertyRow'

describe('PropertyRow Component', () => {
  describe('Basic Rendering', () => {
    it('should render label and string value', () => {
      render(<PropertyRow label="Ticker" value="TSLA" />)

      expect(screen.getByText('Ticker')).toBeInTheDocument()
      expect(screen.getByText('TSLA')).toBeInTheDocument()
    })

    it('should render with React node as value', () => {
      const customValue = (
        <span className="custom-class" data-testid="custom-value">
          Custom Content
        </span>
      )

      render(<PropertyRow label="Custom" value={customValue} />)

      expect(screen.getByText('Custom')).toBeInTheDocument()
      expect(screen.getByTestId('custom-value')).toBeInTheDocument()
      expect(screen.getByText('Custom Content')).toBeInTheDocument()
    })

    it('should render empty string value', () => {
      render(<PropertyRow label="Empty" value="" />)

      expect(screen.getByText('Empty')).toBeInTheDocument()
    })

    it('should render numeric value', () => {
      render(<PropertyRow label="Count" value={42} />)

      expect(screen.getByText('Count')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })

  describe('Layout Modes', () => {
    it('should use standard layout by default', () => {
      const { container } = render(<PropertyRow label="Test" value="Value" />)

      const wrapper = container.querySelector('.justify-between')
      expect(wrapper).toBeInTheDocument()
      expect(container).toBeInTheDocument() // Use container to avoid lint warning
    })

    it('should use full width layout when specified', () => {
      render(<PropertyRow label="Test" value="Value" fullWidth={true} />)

      const label = screen.getByText('Test')
      const value = screen.getByText('Value')

      // In full width mode, both should be block elements
      expect(label.className).toContain('block')
      expect(value.className).toContain('block')
    })

    it('should not use flex layout in full width mode', () => {
      const { container } = render(<PropertyRow label="Test" value="Value" fullWidth={true} />)

      const flexElements = container.querySelectorAll('.justify-between')
      expect(flexElements.length).toBe(0)
    })
  })

  describe('Styling', () => {
    it('should apply correct label styling', () => {
      render(<PropertyRow label="Test Label" value="Test Value" />)

      const label = screen.getByText('Test Label')
      expect(label.className).toContain('text-xs')
      expect(label.className).toContain('text-gray-500')
    })

    it('should apply correct value styling for strings', () => {
      render(<PropertyRow label="Test" value="String Value" />)

      const value = screen.getByText('String Value')
      expect(value.className).toContain('text-sm')
      expect(value.className).toContain('font-medium')
      expect(value.className).toContain('text-gray-900')
    })

    it('should include dark mode classes', () => {
      render(<PropertyRow label="Dark Mode" value="Test" />)

      const label = screen.getByText('Dark Mode')
      expect(label.className).toContain('dark:text-gray-400')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long labels', () => {
      const longLabel = 'This is a very long label that might wrap to multiple lines'
      render(<PropertyRow label={longLabel} value="Short" />)

      expect(screen.getByText(longLabel)).toBeInTheDocument()
    })

    it('should handle very long string values', () => {
      const longValue = 'This is a very long value '.repeat(10).trim()
      render(<PropertyRow label="Long" value={longValue} />)

      expect(
        screen.getByText((_, element) => element?.textContent?.trim() === longValue)
      ).toBeInTheDocument()
    })

    it('should handle special characters in label', () => {
      render(<PropertyRow label="Price ($)" value="100" />)

      expect(screen.getByText('Price ($)')).toBeInTheDocument()
    })

    it('should handle special characters in value', () => {
      render(<PropertyRow label="Symbol" value="<>" />)

      expect(screen.getByText('<>')).toBeInTheDocument()
    })

    it('should accept isLast prop without errors', () => {
      // isLast is currently unused but should not cause errors
      const { container } = render(<PropertyRow label="Test" value="Value" isLast={true} />)

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should be accessible with proper text hierarchy', () => {
      render(<PropertyRow label="Accessible Label" value="Accessible Value" />)

      const label = screen.getByText('Accessible Label')
      const value = screen.getByText('Accessible Value')

      expect(label).toBeVisible()
      expect(value).toBeVisible()
    })

    it('should maintain readable text sizes', () => {
      render(<PropertyRow label="Size Test" value="Check Size" />)

      const label = screen.getByText('Size Test')
      const value = screen.getByText('Check Size')

      // Labels should be smaller (text-xs)
      expect(label.className).toContain('text-xs')
      // Values should be readable (text-sm)
      expect(value.className).toContain('text-sm')
    })
  })

  describe('Complex Value Rendering', () => {
    it('should render JSX with multiple elements', () => {
      const complexValue = (
        <div>
          <span>Part 1</span>
          <span>Part 2</span>
        </div>
      )

      render(<PropertyRow label="Complex" value={complexValue} />)

      expect(screen.getByText('Part 1')).toBeInTheDocument()
      expect(screen.getByText('Part 2')).toBeInTheDocument()
    })

    it('should render with icons as value', () => {
      const valueWithIcon = (
        <span data-testid="icon-value">
          <svg data-testid="test-icon" />
          Text with Icon
        </span>
      )

      render(<PropertyRow label="Icon Test" value={valueWithIcon} />)

      expect(screen.getByTestId('icon-value')).toBeInTheDocument()
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
      expect(screen.getByText('Text with Icon')).toBeInTheDocument()
    })

    it('should render with links as value', () => {
      const linkValue = <a href="/test">Click Here</a>

      render(<PropertyRow label="Link" value={linkValue} />)

      const link = screen.getByRole('link', { name: 'Click Here' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
    })

    it('should render with badges or tags as value', () => {
      const badgeValue = (
        <span className="badge" data-testid="badge">
          Completed
        </span>
      )

      render(<PropertyRow label="Status" value={badgeValue} />)

      expect(screen.getByTestId('badge')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should apply padding classes', () => {
      const { container } = render(<PropertyRow label="Test" value="Value" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('px-4')
      expect(wrapper.className).toContain('py-3')
    })

    it('should maintain structure in full width mode', () => {
      const { container } = render(<PropertyRow label="Test" value="Value" fullWidth={true} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('px-4')
      expect(wrapper.className).toContain('py-3')
    })
  })
})
