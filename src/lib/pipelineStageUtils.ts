import type { AttachmentRequirementMap } from '@/lib/attachments'
import { normaliseAttachmentRequirements } from '@/lib/attachments'
import type { PipelineStageApi } from '@/services/api/pipeline.service'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getStageWorkflowConfig = (
  stage?: PipelineStageApi | null
): Record<string, unknown> | null => {
  if (!stage || !isRecord(stage.meta)) {
    return null
  }
  const workflowConfig = stage.meta['workflow_config']
  if (!isRecord(workflowConfig)) {
    return null
  }
  const config = workflowConfig['config']
  if (!isRecord(config)) {
    return null
  }
  return config
}

export const getStageRequiredAttachments = (
  stage?: PipelineStageApi | null
): AttachmentRequirementMap | undefined => {
  const config = getStageWorkflowConfig(stage)
  if (!config) return undefined
  const requiredDocuments = config['required_documents']
  return normaliseAttachmentRequirements(requiredDocuments)
}
