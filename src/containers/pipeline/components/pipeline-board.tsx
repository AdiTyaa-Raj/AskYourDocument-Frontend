'use client'

import { StageColumn } from './stage-column'
import type { PipelineBoardProps } from '../lib/types'

export function PipelineBoard({
  stages,
  data,
  onCardSelect,
  onEarlyTerminate,
  onCancelRequest,
  onDismissRequest,
  onViewRequest,
  onReactivate,
  currentUserId,
  stageStates = {},
  onLoadMoreStage,
}: PipelineBoardProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-3">
        {stages.map((stage) => (
          <StageColumn
            key={stage.slug}
            stage={stage}
            cards={data[stage.slug] ?? []}
            onCardSelect={onCardSelect}
            onEarlyTerminate={onEarlyTerminate}
            onCancelRequest={onCancelRequest}
            onDismissRequest={onDismissRequest}
            onViewRequest={onViewRequest}
            onReactivate={onReactivate}
            currentUserId={currentUserId}
            stageState={stageStates[stage.slug]}
            onLoadMore={onLoadMoreStage ? () => onLoadMoreStage(stage) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
