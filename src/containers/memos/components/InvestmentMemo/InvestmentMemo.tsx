'use client'

import type { InvestmentMemoProps } from '@/containers/memos/lib/types'
import { CRITERIA_CHECKLIST_FIELD_CONFIGS, CriteriaField } from '@/containers/memos/lib/helpers'
import { MediaBlocksContainer } from '../shared/MediaBlock'
import { MemoSection, MEMO_SECTIONS, ALL_SECTION_KEYS } from './MemoSection'
import { useMediaBlocks } from '../shared/useMediaBlocks'
import { InvestmentMemoView } from './InvestmentMemoView'

export function InvestmentMemo({
  formValues,
  validationErrors: _validationErrors,
  onFieldChange,
  isViewOnly = false,
  templateImageUrls = {},
}: InvestmentMemoProps) {
  const { mediaBlocks, getHandlers } = useMediaBlocks(
    formValues,
    onFieldChange,
    ALL_SECTION_KEYS,
    templateImageUrls
  )

  // If view only, render the read-only view component
  if (isViewOnly) {
    return <InvestmentMemoView formValues={formValues} templateImageUrls={templateImageUrls} />
  }

  // Split sections: before and after criteria checklist
  const sectionsBeforeCriteria = MEMO_SECTIONS.slice(0, 2) // Introduction + Thesis
  const sectionsAfterCriteria = MEMO_SECTIONS.slice(2) // State of Industry onwards

  return (
    <div className="space-y-6">
      {/* Sections before Criteria Checklist */}
      {sectionsBeforeCriteria.map((config) => (
        <MemoSection
          key={config.key}
          config={config}
          formValues={formValues}
          onFieldChange={onFieldChange}
          mediaBlocks={mediaBlocks[config.key] || []}
          mediaHandlers={getHandlers(config.key)}
          isViewOnly={isViewOnly}
        />
      ))}

      {/* Section 3: Criteria Checklist (unique structure - handled separately) */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Criteria Checklist</h3>

        {CRITERIA_CHECKLIST_FIELD_CONFIGS.map((config) => (
          <CriteriaField
            key={config.fieldKey}
            config={config}
            formValues={formValues}
            onFieldChange={onFieldChange}
            isViewOnly={isViewOnly}
          />
        ))}

        <MediaBlocksContainer
          blocks={mediaBlocks['criteriaChecklist'] || []}
          onAdd={getHandlers('criteriaChecklist').onAdd}
          onUpdate={getHandlers('criteriaChecklist').onUpdate}
          onRemove={getHandlers('criteriaChecklist').onRemove}
          buttonLabel="Add Image/Chart"
          disabled={isViewOnly}
        />
      </div>

      {/* Sections after Criteria Checklist */}
      {sectionsAfterCriteria.map((config) => (
        <MemoSection
          key={config.key}
          config={config}
          formValues={formValues}
          onFieldChange={onFieldChange}
          mediaBlocks={mediaBlocks[config.key] || []}
          mediaHandlers={getHandlers(config.key)}
          isViewOnly={isViewOnly}
        />
      ))}
    </div>
  )
}
