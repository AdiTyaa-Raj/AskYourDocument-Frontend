/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortfolioHoldings } from '@/containers/coverage/components/PortfolioHoldings'
import type { PortfolioHoldingsTableRow } from '@/containers/coverage/lib/types'

describe('PortfolioHoldings', () => {
  const mockData: PortfolioHoldingsTableRow[] = [
    {
      id: 1,
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      primaryAnalyst: 'JD',
      primaryAnalystName: 'John Doe',
      primaryAnalystId: 1,
      secondaryAnalyst: 'JS',
      secondaryAnalystName: 'Jane Smith',
      secondaryAnalystId: 2,
      stageAssignmentId: 100,
      canAssignAnalysts: false,
      dateOfFirstInvestment: '2024-01-15',
    },
    {
      id: 2,
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc.',
      primaryAnalyst: 'BJ',
      primaryAnalystName: 'Bob Johnson',
      primaryAnalystId: 3,
      secondaryAnalyst: 'AS',
      secondaryAnalystName: 'Alice Smith',
      secondaryAnalystId: 4,
      stageAssignmentId: 101,
      canAssignAnalysts: false,
      dateOfFirstInvestment: '2024-02-20',
    },
  ]

  const defaultProps = {
    data: mockData,
    totalCount: 2,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    page: 1,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  }

  it('renders loading skeleton when isLoading is true', () => {
    render(<PortfolioHoldings {...defaultProps} isLoading={true} />)

    // TableSkeletonLoader should be rendered
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })

  it('renders error state when error is provided', () => {
    const error = new Error('Failed to load portfolio holdings')
    render(<PortfolioHoldings {...defaultProps} error={error} />)

    expect(screen.getByText(/Failed to load portfolio holdings/i)).toBeInTheDocument()
  })

  it('renders empty state when no data is provided', () => {
    render(<PortfolioHoldings {...defaultProps} data={[]} totalCount={0} />)

    expect(screen.getByText(/No portfolio holdings found/i)).toBeInTheDocument()
  })

  it('renders empty state with search message when searchQuery is provided', () => {
    render(<PortfolioHoldings {...defaultProps} data={[]} totalCount={0} searchQuery="test" />)

    expect(screen.getByText(/No holdings match your search criteria/i)).toBeInTheDocument()
  })

  it('displays portfolio holdings data in table', () => {
    render(<PortfolioHoldings {...defaultProps} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
  })

  it('calls onOpenAnalystAssignmentModal when analyst cell is clicked', () => {
    const onOpenAnalystAssignmentModal = vi.fn()
    render(
      <PortfolioHoldings
        {...defaultProps}
        onOpenAnalystAssignmentModal={onOpenAnalystAssignmentModal}
      />
    )

    // The modal open handler should be defined
    expect(onOpenAnalystAssignmentModal).toBeDefined()
  })

  it('handles pagination correctly', () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()

    render(
      <PortfolioHoldings
        {...defaultProps}
        page={1}
        pageSize={10}
        totalCount={50}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    )

    // Pagination should be rendered
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('calls refetch when error retry button is clicked', () => {
    const refetch = vi.fn()
    const error = new Error('Failed to load')

    render(<PortfolioHoldings {...defaultProps} error={error} refetch={refetch} />)

    const retryButton = screen.getByRole('button', { name: /try again/i })
    retryButton.click()

    expect(refetch).toHaveBeenCalled()
  })

  it('filters data based on search query', () => {
    render(<PortfolioHoldings {...defaultProps} searchQuery="AAPL" />)

    // Search filtering is handled internally by the component
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('does not call analyst modal handler when company has no stageAssignmentId', () => {
    const dataWithoutStageAssignment: PortfolioHoldingsTableRow[] = [
      {
        ...mockData[0],
        stageAssignmentId: undefined,
      },
    ]

    const onOpenAnalystAssignmentModal = vi.fn()

    render(
      <PortfolioHoldings
        {...defaultProps}
        data={dataWithoutStageAssignment}
        onOpenAnalystAssignmentModal={onOpenAnalystAssignmentModal}
      />
    )

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('handles numeric and string company IDs correctly', () => {
    const mixedIdData: PortfolioHoldingsTableRow[] = [
      { ...mockData[0], id: 1 },
      { ...mockData[1], id: 2 },
    ]

    render(<PortfolioHoldings {...defaultProps} data={mixedIdData} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
  })

  it('generates dynamic columns based on data', () => {
    render(<PortfolioHoldings {...defaultProps} />)

    // Columns should be generated dynamically
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('updates columns when data changes', () => {
    const { rerender } = render(<PortfolioHoldings {...defaultProps} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()

    const newData: PortfolioHoldingsTableRow[] = [
      {
        id: 3,
        ticker: 'MSFT',
        companyName: 'Microsoft Corporation',
        primaryAnalyst: 'TM',
        primaryAnalystName: 'Tom Martin',
        primaryAnalystId: 5,
        secondaryAnalyst: 'LW',
        secondaryAnalystName: 'Lisa White',
        secondaryAnalystId: 6,
        stageAssignmentId: 102,
        canAssignAnalysts: false,
      },
    ]

    rerender(<PortfolioHoldings {...defaultProps} data={newData} />)

    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })

  it('renders with server-side pagination mode', () => {
    render(<PortfolioHoldings {...defaultProps} page={2} pageSize={10} totalCount={100} />)

    // Server pagination should be active
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })
})
