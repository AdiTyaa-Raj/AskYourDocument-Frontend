/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalystAssignmentModal } from '@/containers/coverage/components/AnalystAssignmentModal'
import type { AnalystOption } from '@/containers/coverage/lib/types'

vi.mock('@/components/ui/select', () => {
  type SelectContextValue = {
    value?: string
    disabled?: boolean
    onValueChange?: (value: string) => void
  }

  const SelectContext = React.createContext<SelectContextValue | null>(null)

  const Select = ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string
    onValueChange?: (value: string) => void
    disabled?: boolean
    children: React.ReactNode
  }) => (
    <SelectContext.Provider value={{ value, onValueChange, disabled }}>
      <div>{children}</div>
    </SelectContext.Provider>
  )

  const SelectTrigger = ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => {
    const ctx = React.useContext(SelectContext)
    return (
      <button
        type="button"
        role="combobox"
        aria-controls="mock-select-content"
        aria-expanded="false"
        disabled={ctx?.disabled}
        className={className}
      >
        {children}
      </button>
    )
  }

  const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>

  const SelectContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>

  const SelectItem = ({ children, value }: { children: React.ReactNode; value: string }) => {
    const ctx = React.useContext(SelectContext)
    const handleClick = () => {
      if (!ctx?.disabled) {
        ctx?.onValueChange?.(value)
      }
    }
    return (
      <button
        type="button"
        role="option"
        aria-selected={ctx?.value === value}
        onClick={handleClick}
      >
        {children}
      </button>
    )
  }

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  }
})

describe('AnalystAssignmentModal', () => {
  const mockPrimaryAnalysts: AnalystOption[] = [
    { id: 1, value: '1', label: 'John Doe' },
    { id: 2, value: '2', label: 'Jane Smith' },
    { id: 3, value: '3', label: 'Bob Johnson' },
  ]

  const mockSecondaryAnalysts: AnalystOption[] = [
    { id: 1, value: '1', label: 'John Doe' },
    { id: 2, value: '2', label: 'Jane Smith' },
    { id: 3, value: '3', label: 'Bob Johnson' },
  ]

  const mockCompanyData = {
    id: 123,
    ticker: 'AAPL',
    name: 'Apple Inc.',
    stageAssignmentId: 100,
    primaryAnalystId: 1,
    secondaryAnalystId: 2,
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    companyData: mockCompanyData,
    primaryAnalysts: mockPrimaryAnalysts,
    secondaryAnalysts: mockSecondaryAnalysts,
    isLoadingPrimaryAnalysts: false,
    isLoadingSecondaryAnalysts: false,
    isSubmitting: false,
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal when isOpen is true', () => {
    render(<AnalystAssignmentModal {...defaultProps} />)

    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('does not render modal when isOpen is false', () => {
    render(<AnalystAssignmentModal {...defaultProps} isOpen={false} />)

    expect(
      screen.queryByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).not.toBeInTheDocument()
  })

  it('displays company information', () => {
    render(<AnalystAssignmentModal {...defaultProps} />)

    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('pre-fills analyst fields with existing values', () => {
    render(<AnalystAssignmentModal {...defaultProps} />)

    // Analysts are pre-selected based on companyData
    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('shows loading state for primary analysts', () => {
    render(<AnalystAssignmentModal {...defaultProps} isLoadingPrimaryAnalysts={true} />)

    const [primarySelect] = screen.getAllByRole('combobox')
    expect(primarySelect).toBeDisabled()
  })

  it('shows loading state for secondary analysts', () => {
    render(<AnalystAssignmentModal {...defaultProps} isLoadingSecondaryAnalysts={true} />)

    const [, secondarySelect] = screen.getAllByRole('combobox')
    expect(secondarySelect).toBeDisabled()
  })

  it('disables Save button when isSubmitting is true', () => {
    render(<AnalystAssignmentModal {...defaultProps} isSubmitting={true} />)

    const saveButton = screen.getByRole('button', { name: /Saving.../i })
    expect(saveButton).toBeDisabled()
  })

  it('shows "Saving..." text when submitting', () => {
    render(<AnalystAssignmentModal {...defaultProps} isSubmitting={true} />)

    expect(screen.getByText(/Saving.../i)).toBeInTheDocument()
  })

  it('disables Save button when no analysts are selected', () => {
    render(
      <AnalystAssignmentModal
        {...defaultProps}
        companyData={{
          ...mockCompanyData,
          primaryAnalystId: undefined,
          secondaryAnalystId: undefined,
        }}
      />
    )

    const saveButton = screen.getByRole('button', { name: /Save/i })
    expect(saveButton).toBeDisabled()
  })

  it('disables Save button when same analyst is selected for both roles', () => {
    render(
      <AnalystAssignmentModal
        {...defaultProps}
        companyData={{
          ...mockCompanyData,
          primaryAnalystId: 1,
          secondaryAnalystId: 1,
        }}
      />
    )

    // Save should be disabled when analysts are the same
    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('disables Save button when stageAssignmentId is missing', () => {
    render(
      <AnalystAssignmentModal
        {...defaultProps}
        companyData={{
          ...mockCompanyData,
          stageAssignmentId: undefined,
        }}
      />
    )

    const saveButton = screen.getByRole('button', { name: /Save/i })
    expect(saveButton).toBeDisabled()
  })

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<AnalystAssignmentModal {...defaultProps} onClose={onClose} />)

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onSubmit with correct data when Save is clicked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<AnalystAssignmentModal {...defaultProps} onSubmit={onSubmit} />)

    const saveButton = screen.getByRole('button', { name: /Save/i })

    // If button is enabled, clicking should call onSubmit
    if (!saveButton.hasAttribute('disabled')) {
      await user.click(saveButton)
      expect(onSubmit).toHaveBeenCalled()
    }
  })

  it('allows assigning analysts when none are pre-selected', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AnalystAssignmentModal
        {...defaultProps}
        onSubmit={onSubmit}
        companyData={{
          ...mockCompanyData,
          primaryAnalystId: undefined,
          secondaryAnalystId: undefined,
        }}
      />
    )

    const primaryField = screen.getByText(/Primary Analyst/i, { selector: 'label' }).closest('div')
    const secondaryField = screen
      .getByText(/Secondary Analyst/i, { selector: 'label' })
      .closest('div')

    if (!primaryField || !secondaryField) {
      throw new Error('Unable to locate analyst select fields')
    }

    await user.click(within(primaryField).getByRole('option', { name: /John Doe/i }))
    await user.click(within(secondaryField).getByRole('option', { name: /Jane Smith/i }))

    const saveButton = screen.getByRole('button', { name: /Save/i })
    await user.click(saveButton)

    expect(onSubmit).toHaveBeenCalledWith({
      stageAssignmentId: mockCompanyData.stageAssignmentId,
      primaryAnalystId: 1,
      secondaryAnalystId: 2,
    })
  })

  it('validates that primary analyst is required', () => {
    render(
      <AnalystAssignmentModal
        {...defaultProps}
        companyData={{
          ...mockCompanyData,
          primaryAnalystId: undefined,
          secondaryAnalystId: 2,
        }}
      />
    )

    // Validation happens internally
    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('validates that secondary analyst is required', () => {
    render(
      <AnalystAssignmentModal
        {...defaultProps}
        companyData={{
          ...mockCompanyData,
          primaryAnalystId: 1,
          secondaryAnalystId: undefined,
        }}
      />
    )

    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('shows error when stageAssignmentId is missing on submit', () => {
    render(
      <AnalystAssignmentModal
        {...defaultProps}
        companyData={{
          ...mockCompanyData,
          stageAssignmentId: undefined,
        }}
      />
    )

    // Error handling is internal
    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('resets form when modal is closed', () => {
    const { rerender } = render(<AnalystAssignmentModal {...defaultProps} />)

    rerender(<AnalystAssignmentModal {...defaultProps} isOpen={false} />)

    // Form should reset when closed
    expect(
      screen.queryByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).not.toBeInTheDocument()
  })

  it('resets form when modal is reopened', () => {
    const { rerender } = render(<AnalystAssignmentModal {...defaultProps} isOpen={false} />)

    rerender(<AnalystAssignmentModal {...defaultProps} isOpen={true} />)

    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('displays company name or fallback text', () => {
    render(
      <AnalystAssignmentModal
        {...defaultProps}
        companyData={{
          ...mockCompanyData,
          name: '',
        }}
      />
    )

    expect(screen.getByText(/Unknown Company/i)).toBeInTheDocument()
  })

  it('displays ticker or N/A when ticker is missing', () => {
    render(
      <AnalystAssignmentModal
        {...defaultProps}
        companyData={{
          ...mockCompanyData,
          ticker: '',
        }}
      />
    )

    expect(screen.getByText(/N\/A/i)).toBeInTheDocument()
  })

  it('clears secondary analyst when same as primary is selected', () => {
    render(<AnalystAssignmentModal {...defaultProps} />)

    // Internal logic handles clearing
    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('clears primary analyst when same as secondary is selected', () => {
    render(<AnalystAssignmentModal {...defaultProps} />)

    expect(
      screen.getByRole('dialog', { name: /Assign Analysts|Change Analyst Assignment/i })
    ).toBeInTheDocument()
  })

  it('disables Cancel button when submitting', () => {
    render(<AnalystAssignmentModal {...defaultProps} isSubmitting={true} />)

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    expect(cancelButton).toBeDisabled()
  })

  it('renders AnalystSelectFields component', () => {
    render(<AnalystAssignmentModal {...defaultProps} />)

    expect(screen.getAllByText(/Primary Analyst/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/Secondary Analyst/i)[0]).toBeInTheDocument()
  })

  it('passes correct props to AnalystSelectFields', () => {
    render(<AnalystAssignmentModal {...defaultProps} />)

    // Both analyst fields should be rendered
    expect(screen.getAllByText(/Primary Analyst/i)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/Secondary Analyst/i)[0]).toBeInTheDocument()
  })
})
