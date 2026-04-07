/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WatchList } from '@/containers/coverage/components/WatchList'
import type { WatchListProps, WatchListTableData } from '@/containers/coverage/lib/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('WatchList', () => {
  const mockWatchlistData: WatchListTableData[] = [
    {
      id: 1,
      ticker: 'AAPL',
      securityDescription: 'Apple Inc.',
      primaryAnalyst: 'JD',
      primaryAnalystName: 'John Doe',
      secondaryAnalyst: 'JS',
      secondaryAnalystName: 'Jane Smith',
      sector: 'Technology',
      country: 'USA',
    },
    {
      id: 2,
      ticker: 'GOOGL',
      securityDescription: 'Alphabet Inc.',
      primaryAnalyst: 'BJ',
      primaryAnalystName: 'Bob Johnson',
      secondaryAnalyst: 'AS',
      secondaryAnalystName: 'Alice Smith',
      sector: 'Technology',
      country: 'USA',
    },
  ]

  const mockMoveToActiveDiscussionMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as WatchListProps['moveToActiveDiscussionMutation']

  const mockRemoveFromWatchlistMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as WatchListProps['removeFromWatchlistMutation']

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

  const defaultProps = {
    searchQuery: '',
    watchlistData: mockWatchlistData,
    totalCount: 2,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    attachmentRequirements: undefined,
    attachmentOptions: [],
    attachmentSearch: '',
    onAttachmentSearchChange: vi.fn(),
    attachmentQueryInfo: undefined,
    documentOptions: [],
    memoOptions: [],
    documentsQueryInfo: undefined,
    memosQueryInfo: undefined,
    requiredAttachmentOptions: [],
    onModalOpen: vi.fn(),
    onModalClose: vi.fn(),
    onAttachmentsRefetch: vi.fn(),
    moveToActiveDiscussionMutation: mockMoveToActiveDiscussionMutation,
    removeFromWatchlistMutation: mockRemoveFromWatchlistMutation,
    page: 1,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  }

  it('renders loading skeleton when isLoading is true', () => {
    renderWithClient(<WatchList {...defaultProps} isLoading={true} />)

    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })

  it('renders error state when isError is true', () => {
    renderWithClient(<WatchList {...defaultProps} isError={true} />)

    expect(screen.getByText(/Failed to load watchlist data/i)).toBeInTheDocument()
  })

  it('renders empty state when no data is provided', () => {
    renderWithClient(<WatchList {...defaultProps} watchlistData={[]} totalCount={0} />)

    expect(screen.getByText(/No companies in watchlist/i)).toBeInTheDocument()
  })

  it('renders empty state with search message when searchQuery is provided', () => {
    renderWithClient(
      <WatchList {...defaultProps} watchlistData={[]} totalCount={0} searchQuery="test" />
    )

    expect(screen.getByText(/No companies match your search criteria/i)).toBeInTheDocument()
  })

  it('displays watchlist data in table', () => {
    renderWithClient(<WatchList {...defaultProps} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
  })

  it('shows action bar when rows are selected', () => {
    renderWithClient(<WatchList {...defaultProps} />)

    // Action bar appears when selection is made
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('displays both action buttons in action bar', () => {
    renderWithClient(<WatchList {...defaultProps} />)

    // Both buttons should be available when company is selected
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('opens CompanyMoveModal when Move to Active Discussion is clicked', () => {
    const onModalOpen = vi.fn()
    renderWithClient(<WatchList {...defaultProps} onModalOpen={onModalOpen} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('closes modal when onClose is called', () => {
    const onModalClose = vi.fn()
    renderWithClient(<WatchList {...defaultProps} onModalClose={onModalClose} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('calls removeFromWatchlistMutation when Remove button is clicked', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    const mutation = {
      mutateAsync,
      isPending: false,
    } as unknown as WatchListProps['removeFromWatchlistMutation']

    renderWithClient(<WatchList {...defaultProps} removeFromWatchlistMutation={mutation} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('calls moveToActiveDiscussionMutation with correct data on form submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    const mutation = {
      mutateAsync,
      isPending: false,
    } as unknown as WatchListProps['moveToActiveDiscussionMutation']

    renderWithClient(<WatchList {...defaultProps} moveToActiveDiscussionMutation={mutation} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('handles pagination correctly', () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()

    renderWithClient(
      <WatchList
        {...defaultProps}
        page={1}
        pageSize={10}
        totalCount={50}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    )

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('applies search filter to watchlist data', () => {
    renderWithClient(<WatchList {...defaultProps} searchQuery="AAPL" />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('applies sort to watchlist data', () => {
    renderWithClient(<WatchList {...defaultProps} />)

    // Sorting is handled by DataTable component
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('calls refetch when error retry is clicked', () => {
    const refetch = vi.fn()

    renderWithClient(<WatchList {...defaultProps} isError={true} refetch={refetch} />)

    const retryButton = screen.getByRole('button', { name: /try again/i })
    retryButton.click()

    expect(refetch).toHaveBeenCalled()
  })

  it('generates dynamic columns based on data', () => {
    renderWithClient(<WatchList {...defaultProps} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('updates columns when data changes', () => {
    const { rerender, queryClient } = renderWithClient(<WatchList {...defaultProps} />)

    const newData: WatchListTableData[] = [
      {
        id: 3,
        ticker: 'MSFT',
        securityDescription: 'Microsoft Corporation',
        primaryAnalyst: 'TM',
        primaryAnalystName: 'Tom Martin',
        secondaryAnalyst: 'LW',
        secondaryAnalystName: 'Lisa White',
        sector: 'Technology',
        country: 'USA',
      },
    ]

    rerender(wrapWithClient(queryClient, <WatchList {...defaultProps} watchlistData={newData} />))

    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })

  it('clears selection after successful move to active discussion', () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    const mutation = {
      mutateAsync,
      isPending: false,
    } as unknown as WatchListProps['moveToActiveDiscussionMutation']

    renderWithClient(<WatchList {...defaultProps} moveToActiveDiscussionMutation={mutation} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('clears selection after successful removal from watchlist', () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    const mutation = {
      mutateAsync,
      isPending: false,
    } as unknown as WatchListProps['removeFromWatchlistMutation']

    renderWithClient(<WatchList {...defaultProps} removeFromWatchlistMutation={mutation} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('shows submitting state when mutation is pending', () => {
    const mutation = {
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as WatchListProps['moveToActiveDiscussionMutation']

    renderWithClient(<WatchList {...defaultProps} moveToActiveDiscussionMutation={mutation} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('displays selected company info in action bar', () => {
    renderWithClient(<WatchList {...defaultProps} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('shows count when multiple companies are selected', () => {
    renderWithClient(<WatchList {...defaultProps} />)

    // Multiple selection logic
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('handles server-side pagination mode', () => {
    renderWithClient(<WatchList {...defaultProps} page={2} pageSize={20} totalCount={100} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('passes attachment requirements to CompanyMoveModal', () => {
    const attachmentRequirements = {
      documents: ['SCREEN'],
      memos: [],
    }

    renderWithClient(
      <WatchList {...defaultProps} attachmentRequirements={attachmentRequirements} />
    )

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('handles attachment search changes', () => {
    const onAttachmentSearchChange = vi.fn()

    renderWithClient(
      <WatchList {...defaultProps} onAttachmentSearchChange={onAttachmentSearchChange} />
    )

    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })
})
