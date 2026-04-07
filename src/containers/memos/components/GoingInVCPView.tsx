'use client'

import type { GoingInVCPViewProps, ImageData, VCPSectionConfig } from '@/containers/memos/lib/types'
import { PRE_VALUATION_SECTIONS } from '@/containers/memos/lib/constants'
import {
  Section,
  SubSection,
  TextContent,
} from '@/containers/memos/components/shared/ViewComponents'
import { ImageCards } from '@/containers/memos/components/shared/ImageCards'
import { extractTextValue, extractImages } from '@/containers/memos/lib/helpers'

/**
 * Component to render a VCP section with text and images
 */
function VCPSectionView({
  title,
  sectionKey,
  formValues,
  containerClassName,
  templateImageUrls = {},
}: {
  title: string
  sectionKey: string
  formValues: GoingInVCPViewProps['formValues']
  containerClassName?: string
  templateImageUrls?: Record<string, string>
}) {
  const sectionData = formValues[sectionKey]
  const text = extractTextValue(sectionData)
  const images = extractImages(sectionData)

  // Also check for media blocks stored separately (e.g., sourcingMedia)
  const mediaKey = `${sectionKey}Media`
  const mediaBlocks = formValues[mediaKey] as string | undefined
  let parsedMedia: ImageData[] = []
  if (mediaBlocks) {
    try {
      const parsed = JSON.parse(mediaBlocks)
      if (Array.isArray(parsed)) {
        parsedMedia = parsed.map(
          (block: { imageUrl?: string; caption?: string; title?: string }) => ({
            s3Key: block.imageUrl || '',
            caption: block.caption || block.title,
          })
        )
      }
    } catch (error) {
      console.log('Error parsing media blocks', error)
    }
  }

  const allImages = [...images, ...parsedMedia]

  return (
    <Section title={title}>
      <div className={containerClassName}>
        <TextContent value={text} />
        <ImageCards images={allImages} templateImageUrls={templateImageUrls} />
      </div>
    </Section>
  )
}

/** Sections rendered after valuation */
const POST_VALUATION_SECTIONS: VCPSectionConfig[] = [
  { title: 'Outstanding Questions', sectionKey: 'outstandingQuestions' },
]

/** Renders VCP sections from a config array */
function renderVCPSections(
  sections: VCPSectionConfig[],
  formValues: GoingInVCPViewProps['formValues'],
  templateImageUrls: Record<string, string>
) {
  return sections.map(({ title, sectionKey, containerClassName }) => (
    <VCPSectionView
      key={sectionKey}
      title={title}
      sectionKey={sectionKey}
      formValues={formValues}
      containerClassName={containerClassName}
      templateImageUrls={templateImageUrls}
    />
  ))
}

/**
 * Going-in Value Creation Plan View Component
 * Read-only view of a VCP with proper formatting
 */
export function GoingInVCPView({ formValues, templateImageUrls = {} }: GoingInVCPViewProps) {
  return (
    <div className="space-y-8 bg-white p-8">
      {renderVCPSections(PRE_VALUATION_SECTIONS, formValues, templateImageUrls)}

      {/* Valuation Section */}
      <Section title="Valuation">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SubSection title="Current Valuation Multiple">
            <TextContent value={extractTextValue(formValues.currentMultiple)} />
          </SubSection>
          <SubSection title="Historical Valuation Range">
            <TextContent value={extractTextValue(formValues.historicalRange)} />
          </SubSection>
        </div>
        <div className="mt-6">
          <SubSection title="Peer Valuation Comparison">
            <TextContent value={extractTextValue(formValues.peerComparison)} />
          </SubSection>
        </div>
      </Section>

      {renderVCPSections(POST_VALUATION_SECTIONS, formValues, templateImageUrls)}
    </div>
  )
}
