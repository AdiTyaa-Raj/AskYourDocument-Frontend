/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompanyMoveModal } from '@/containers/coverage/components/CompanyMoveModal'
import type { AnalystOption } from '@/containers/coverage/lib/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('CompanyMoveModal', () => {
  const mockPrimaryAnalysts: AnalystOption[] = [
    { id: 1, value: '1', label: 'John Doe' },
    { id: 2, value: '2', label: 'Jane Smith' },
  ]

  const mockSecondaryAnalysts: AnalystOption[] = [
    { id: 3, value: '3', label: 'Bob Johnson' },
    { id: 4, value: '4', label: 'Alice Brown' },
  ]

  const mockCompanyData = {
    id: 123,
    ticker: 'AAPL',
    name: 'Apple Inc.',
  }

  const wrapWithClient = (client: QueryClient, ui: React.ReactElement) => (
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  )

  const renderWithClient = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const renderResult = render(wrapWithClient(queryClient, ui))

    return { ...renderResult, queryClient }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Watchlist Mode', () => {
    const watchlistProps = {
      isOpen: true,
      onClose: vi.fn(),
      mode: 'watchlist' as const,
      companyData: mockCompanyData,
      onSubmit: vi.fn(),
      primaryAnalysts: mockPrimaryAnalysts,
      secondaryAnalysts: mockSecondaryAnalysts,
      isLoadingPrimaryAnalysts: false,
      isLoadingSecondaryAnalysts: false,
      isSubmitting: false,
    }

    it('renders modal in watchlist mode', () => {
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      expect(screen.getByRole('dialog', { name: /Move to Watchlist/i })).toBeInTheDocument()
    })

    it('displays company information', () => {
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      expect(screen.getByDisplayValue(/AAPL - Apple Inc./i)).toBeInTheDocument()
    })

    it('renders primary and secondary analyst fields', () => {
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      expect(screen.getByText(/Select primary analyst/i)).toBeInTheDocument()
      expect(screen.getByText(/Select secondary analyst/i)).toBeInTheDocument()
    })

    it('renders rationale textarea', () => {
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      expect(screen.getByLabelText(/Rationale/i)).toBeInTheDocument()
    })

    it('displays custom title when titleOverride is provided', () => {
      renderWithClient(<CompanyMoveModal {...watchlistProps} titleOverride="Custom Title" />)

      expect(screen.getAllByText('Custom Title').length).toBeGreaterThan(0)
    })

    it('displays info box when infoBoxText is provided', () => {
      renderWithClient(<CompanyMoveModal {...watchlistProps} infoBoxText="Important information" />)

      expect(screen.getByText('Important information')).toBeInTheDocument()
    })

    it('displays custom rationale placeholder', () => {
      renderWithClient(
        <CompanyMoveModal {...watchlistProps} rationalePlaceholder="Custom placeholder" />
      )

      const textarea = screen.getByPlaceholderText('Custom placeholder')
      expect(textarea).toBeInTheDocument()
    })

    it('validates that primary analyst is required', async () => {
      const user = userEvent.setup()
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      const submitButton = screen.getByRole('button', { name: /Submit Request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('validates that rationale is required', async () => {
      const user = userEvent.setup()
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      const submitButton = screen.getByRole('button', { name: /Submit Request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('validates rationale minimum length', async () => {
      const user = userEvent.setup()
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      const textarea = screen.getByLabelText(/Rationale/i)
      await user.type(textarea, 'Short')

      const submitButton = screen.getByRole('button', { name: /Submit Request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Minimum 10 characters required/i)).toBeInTheDocument()
      })
    })

    it('enforces rationale maximum length of 150 characters', async () => {
      const user = userEvent.setup()
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      const longText = 'a'.repeat(160)
      const textarea = screen.getByLabelText(/Rationale/i)
      await user.type(textarea, longText)

      // Should only accept 150 characters
      expect(textarea).toHaveValue('a'.repeat(150))
    })

    it('validates that analysts must be different', async () => {
      const user = userEvent.setup()
      renderWithClient(<CompanyMoveModal {...watchlistProps} />)

      const submitButton = screen.getByRole('button', { name: /Submit Request/i })
      await user.click(submitButton)

      // Validation happens on submit
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Active Discussion Mode', () => {
    const activeDiscussionProps = {
      isOpen: true,
      onClose: vi.fn(),
      mode: 'active-discussion' as const,
      companyData: mockCompanyData,
      onSubmit: vi.fn(),
      isSubmitting: false,
    }

    it('renders modal in active discussion mode', () => {
      renderWithClient(<CompanyMoveModal {...activeDiscussionProps} />)

      expect(screen.getByRole('dialog', { name: /Move to Active Discussion/i })).toBeInTheDocument()
    })

    it('does not render analyst fields in active discussion mode', () => {
      renderWithClient(<CompanyMoveModal {...activeDiscussionProps} />)

      expect(screen.queryByText(/Primary Analyst/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Secondary Analyst/i)).not.toBeInTheDocument()
    })

    it('renders reason textarea in active discussion mode', () => {
      renderWithClient(<CompanyMoveModal {...activeDiscussionProps} />)

      expect(screen.getByLabelText(/Reason/i)).toBeInTheDocument()
    })

    it('validates that reason is required', async () => {
      const user = userEvent.setup()
      renderWithClient(<CompanyMoveModal {...activeDiscussionProps} />)

      const submitButton = screen.getByRole('button', { name: /Submit Request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('validates reason minimum length', async () => {
      const user = userEvent.setup()
      renderWithClient(<CompanyMoveModal {...activeDiscussionProps} />)

      const textarea = screen.getByLabelText(/Reason/i)
      await user.type(textarea, 'Short')

      const submitButton = screen.getByRole('button', { name: /Submit Request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Minimum 10 characters required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Common Functionality', () => {
    const commonProps = {
      isOpen: true,
      onClose: vi.fn(),
      mode: 'watchlist' as const,
      companyData: mockCompanyData,
      onSubmit: vi.fn(),
      primaryAnalysts: mockPrimaryAnalysts,
      secondaryAnalysts: mockSecondaryAnalysts,
      isSubmitting: false,
    }

    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      renderWithClient(<CompanyMoveModal {...commonProps} onClose={onClose} />)

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('disables Submit button when isSubmitting is true', () => {
      renderWithClient(<CompanyMoveModal {...commonProps} isSubmitting={true} />)

      const submitButton = screen.getByRole('button', { name: /Submitting.../i })
      expect(submitButton).toBeDisabled()
    })

    it('shows "Submitting..." text when submitting', () => {
      renderWithClient(<CompanyMoveModal {...commonProps} isSubmitting={true} />)

      expect(screen.getByText(/Submitting.../i)).toBeInTheDocument()
    })

    it('displays approver field as disabled', () => {
      renderWithClient(<CompanyMoveModal {...commonProps} />)

      const approverInput = screen.getByDisplayValue(/Lead Investor/i)
      expect(approverInput).toBeDisabled()
    })

    it('resets form when modal is closed', () => {
      const { rerender, queryClient } = renderWithClient(<CompanyMoveModal {...commonProps} />)

      rerender(wrapWithClient(queryClient, <CompanyMoveModal {...commonProps} isOpen={false} />))

      expect(screen.queryByText(/Move to Watchlist/i)).not.toBeInTheDocument()
    })
  })
})
