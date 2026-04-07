import { useQuery } from '@tanstack/react-query'

import { pipelineService, type PipelineStageApi } from '@/services/api/pipeline.service'

export type PipelineStageMap = Record<string, PipelineStageApi>

export function usePipelineStages() {
  return useQuery({
    queryKey: ['pipeline', 'stages', 'map'],
    queryFn: async () => pipelineService.getStages(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  })
}
