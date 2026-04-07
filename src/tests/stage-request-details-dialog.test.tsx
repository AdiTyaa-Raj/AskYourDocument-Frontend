import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StageRequestDetailsDialog } from '@/containers/pipeline/components/stage-request-details-dialog'
import type { PipelineCard } from '@/containers/pipeline/lib/types'

const baseCard: PipelineCard = {
  id: 'crm',
  ticker: 'CRM',
  exchange: 'NYSE',
  company: 'Salesforce Inc.',
  analysts: { primary: 'Sarah Miller', secondary: 'Isaac Chen' },
  daysInStage: 10,
  status: 'pending',
  statusLabel: 'Pending',
  stageSlug: 'ACTIVE_DISCUSSION',
  currentApproval: {
    id: 7,
    status: 'pending',
    toStage: 'VCP',
    submittedAt: '2025-11-12T00:00:00Z',
    requestedBy: 1,
    requestedByName: 'Request Owner',
    payload: {
      documents: {
        'Going In Memo.pdf': 12,
        'VCP Going-In Note': 77,
      },
    },
  },
}

type CardOverrides = Partial<Omit<PipelineCard, 'currentApproval'>> & {
  currentApproval?: Partial<NonNullable<PipelineCard['currentApproval']>>
}

const renderDialog = (cardOverrides?: CardOverrides) => {
  const card: PipelineCard = {
    ...baseCard,
    ...cardOverrides,
    currentApproval: {
      ...baseCard.currentApproval!,
      ...(cardOverrides?.currentApproval ?? {}),
    },
  }

  return render(
    <StageRequestDetailsDialog open card={card} targetStageName="VCP" onClose={vi.fn()} />
  )
}

describe('StageRequestDetailsDialog', () => {
  it('renders pending request details with attachments', () => {
    renderDialog()

    expect(screen.getByText('Stage change request pending approval')).toBeInTheDocument()
    expect(screen.getByText('Requested by:')).toBeInTheDocument()
    expect(screen.getByText('Request Owner')).toBeInTheDocument()
    expect(screen.getByText('Going In Memo.pdf')).toBeInTheDocument()
    expect(screen.getByText('VCP Going-In Note')).toBeInTheDocument()
  })

  it('shows in-review copy when any approver has started the flow', () => {
    renderDialog({
      currentApproval: {
        status: 'in_progress',
      },
    })

    expect(screen.getByText('Stage change request pending approval')).toBeInTheDocument()
  })

  it('indicates early termination requests distinctly', () => {
    renderDialog({
      currentApproval: {
        toStage: 'EARLY_TERMINATED',
      },
    })

    expect(screen.getByText('Early termination request pending approval')).toBeInTheDocument()
    expect(screen.getByText('⚠️ Early Termination Request Pending')).toBeInTheDocument()
  })
})
