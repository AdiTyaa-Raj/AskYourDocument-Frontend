'use client'

import type {
  InvestmentMemoViewProps,
  MemoFormValues,
  SectionData,
  CriteriaChecklistData,
} from '@/containers/memos/lib/types'
import { CRITERIA_CHECKLIST_VIEW_FIELDS } from '@/containers/memos/lib/constants'
import { extractTextValue, extractImages } from '@/containers/memos/lib/helpers'
import {
  Section,
  SubSection,
  TextContent,
} from '@/containers/memos/components/shared/ViewComponents'
import { ImageCards } from '@/containers/memos/components/shared/ImageCards'

/**
 * Component to render a memo section with text and images
 */
function MemoSectionView({
  title,
  sectionKey,
  formValues,
  containerClassName,
  templateImageUrls = {},
}: {
  title: string
  sectionKey: string
  formValues: MemoFormValues
  containerClassName?: string
  templateImageUrls?: Record<string, string>
}) {
  const sectionData = formValues[sectionKey] as SectionData | string | undefined
  const text = extractTextValue(sectionData)
  const images = extractImages(sectionData)

  return (
    <Section title={title}>
      <div className={containerClassName}>
        <TextContent value={text} />
        <ImageCards images={images} templateImageUrls={templateImageUrls} />
      </div>
    </Section>
  )
}

/**
 * Component to render the criteria checklist with nested fields
 */
function CriteriaChecklistView({
  criteriaChecklist,
  templateImageUrls = {},
}: {
  criteriaChecklist: CriteriaChecklistData | undefined
  templateImageUrls?: Record<string, string>
}) {
  if (!criteriaChecklist) return null

  // Get top-level images if any
  const topLevelImages = criteriaChecklist.images || []

  // Build checklist items from the criteria checklist data
  const checklistItems = CRITERIA_CHECKLIST_VIEW_FIELDS.map((field) => {
    const fieldData = criteriaChecklist[field.key as keyof CriteriaChecklistData]
    return {
      key: field.key,
      label: field.label,
      text: extractTextValue(fieldData),
      images: extractImages(fieldData),
    }
  })

  return (
    <Section title="Criteria Checklist">
      <div className="space-y-4">
        {checklistItems.map((item) => (
          <SubSection key={item.key} title={item.label}>
            <TextContent value={item.text} />
            <ImageCards images={item.images} templateImageUrls={templateImageUrls} />
          </SubSection>
        ))}
        {/* Top-level criteria checklist images */}
        <ImageCards images={topLevelImages} templateImageUrls={templateImageUrls} />
      </div>
    </Section>
  )
}

/**
 * Investment Memo View Component
 * Read-only view of an Investment Memo with proper formatting
 */
export function InvestmentMemoView({
  formValues,
  templateImageUrls = {},
}: InvestmentMemoViewProps) {
  const criteriaChecklist = formValues.criteriaChecklist as CriteriaChecklistData | undefined

  return (
    <div className="space-y-8 bg-white p-8">
      {/* Section 1: Introduction + Origin Story */}
      <MemoSectionView
        title="Introduction + Origin Story"
        sectionKey="introductionOriginStory"
        formValues={formValues}
        templateImageUrls={templateImageUrls}
      />

      {/* Section 2: Thesis + Recommendation */}
      <MemoSectionView
        title="Thesis + Recommendation"
        sectionKey="thesisRecommendation"
        formValues={formValues}
        templateImageUrls={templateImageUrls}
      />

      {/* Section 3: Criteria Checklist */}
      <CriteriaChecklistView
        criteriaChecklist={criteriaChecklist}
        templateImageUrls={templateImageUrls}
      />

      {/* Section 4: State of the Industry */}
      <MemoSectionView
        title="State of the Industry"
        sectionKey="stateOfTheIndustry"
        formValues={formValues}
        templateImageUrls={templateImageUrls}
      />

      {/* Section 5: How We Lose $ (RISKS) */}
      <MemoSectionView
        title="How We Lose $ (RISKS)"
        sectionKey="howWeLoseDollarRisks"
        formValues={formValues}
        templateImageUrls={templateImageUrls}
      />

      {/* Section 6: Key Operational Priorities */}
      <MemoSectionView
        title="Key Operational Priorities"
        sectionKey="keyOperationalPriorities"
        formValues={formValues}
        templateImageUrls={templateImageUrls}
      />

      {/* Section 7: Fundamental Gap & Value Drivers */}
      <MemoSectionView
        title="Fundamental Gap & Value Drivers"
        sectionKey="fundamentalGapValueDrivers"
        formValues={formValues}
        templateImageUrls={templateImageUrls}
      />

      {/* Section 8: Further Areas to Explore */}
      <MemoSectionView
        title="Further Areas to Explore"
        sectionKey="furtherAreasToExplore"
        formValues={formValues}
        templateImageUrls={templateImageUrls}
      />
    </div>
  )
}
