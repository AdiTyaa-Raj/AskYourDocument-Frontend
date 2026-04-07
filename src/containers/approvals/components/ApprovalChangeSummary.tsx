'use client'

import { ArrowRight } from 'lucide-react'
import {
  applyApprovalWorkflowUiTransforms,
  workflowLineStatusLabel,
  type ChangeSummaryResult,
} from '../lib/helpers'
import type { StageApprovalRequest } from '../lib/types'

export function ApprovalChangeSummaryLine({ summary }: { summary: ChangeSummaryResult }) {
  if (summary.kind === 'memo') {
    return (
      <p className="text-muted-foreground text-xs leading-snug">
        <span className="text-foreground font-semibold">{summary.templateLabel}</span>
        <span className="text-muted-foreground"> · </span>
        <span>{summary.companyLine}</span>
      </p>
    )
  }

  if (summary.kind === 'stage') {
    return (
      <p className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs leading-snug">
        <span className="text-foreground font-medium">{summary.from}</span>
        <ArrowRight className="size-3 shrink-0 opacity-70" aria-hidden />
        <span className="text-foreground font-semibold">{summary.to}</span>
      </p>
    )
  }

  const label =
    summary.role === 'primary'
      ? 'Primary Analyst:'
      : summary.role === 'secondary'
        ? 'Secondary Analyst:'
        : 'Both Analysts:'
  const oldPart = summary.from?.trim()
  const newPart = summary.to.trim()

  return (
    <p className="text-muted-foreground text-xs leading-snug">
      <span className="text-foreground font-semibold">{label}</span>{' '}
      {oldPart ? (
        <>
          <span>{oldPart}</span>
          <span className="text-muted-foreground mx-0.5">→</span>
        </>
      ) : null}
      <span className="text-foreground font-medium">{newPart}</span>
    </p>
  )
}

export function ApprovalWorkflowListStrip({ approval }: { approval: StageApprovalRequest }) {
  const sections = approval.workflowSections
  if (!sections?.length) return null

  const sectionsForUi = applyApprovalWorkflowUiTransforms(sections, approval)

  return (
    <div className="border-border/80 mt-2 space-y-1.5 border-t pt-2">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        Workflow
      </p>
      <div className="max-h-28 space-y-2 overflow-y-auto pr-0.5">
        {sectionsForUi.map((section) => (
          <div key={section.level} className="space-y-1">
            <p className="text-[10px] font-medium text-neutral-500">{section.title}</p>
            {section.lines.map((line) => (
              <div
                key={line.id}
                className="text-muted-foreground flex items-start justify-between gap-2 text-[11px] leading-tight"
              >
                <span className="min-w-0 flex-1 truncate">{line.displayName}</span>
                <span className="shrink-0 text-neutral-600">
                  {workflowLineStatusLabel(line.status)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
