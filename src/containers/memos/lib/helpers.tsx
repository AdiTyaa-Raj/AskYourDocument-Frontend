import { Loader2, AlertTriangle, CheckCircle, FileText } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { templateFields } from '@/containers/memos/lib/templates'
import {
  TEMPLATE_USER_MULTI_FIELD_IDS,
  userMultiFormStringToApiPayload,
} from '@/containers/memos/lib/user-multi-field'
import { EXCHANGE_TO_COUNTRY } from '@/containers/memos/lib/constants'
import type {
  MemoFieldDefinition,
  MemoFormValues,
  MemoTemplateId,
  UploadedFile,
  ApiTemplateType,
  MemoStatus,
  MediaBlockData,
  TemplateDataUploadUrlResponse,
  MemoAttachmentJsonStrings,
  PresignedUploadInfo,
  ImageToUpload,
  MediaFieldKey,
  CriteriaFieldConfig,
  CriteriaFieldProps,
  Chart,
  ImageData,
  SectionData,
} from '@/containers/memos/lib/types'

export function getCountryFromExchange(exchange: string | null | undefined): string {
  if (!exchange) return ''

  const upperExchange = exchange.toUpperCase().trim()
  return EXCHANGE_TO_COUNTRY[upperExchange] || ''
}

export const CRITERIA_CHECKLIST_FIELD_CONFIGS: CriteriaFieldConfig[] = [
  {
    label: '3.1 Returns on Capital (ROIC / ROE)',
    placeholder:
      'Describe capital efficiency. (e.g., High due to IP, or low due to capital intensity?)',
    fieldKey: 'returnsOnCapitalRoicRoe',
  },
  {
    label: '3.2 Cash Conversion',
    placeholder: 'Relationship between Earnings and Free Cash Flow...',
    fieldKey: 'cashConversion',
  },
  {
    label: '3.3 Reinvestment Rate',
    placeholder: 'Opportunities to deploy capital? (e.g., R&D, Capex, Store openings, M&A)...',
    fieldKey: 'reinvestmentRate',
  },
  {
    label: '3.4 FCF Margins',
    placeholder: 'Profitability profile vs Peers...',
    fieldKey: 'fcfMargins',
  },
  {
    label: '3.5 Balance Sheet Strength',
    placeholder: 'Net Debt/EBITDA, Cash position, Leverage risks...',
    fieldKey: 'balanceSheetStrength',
  },
  {
    label: '3.6 Management Quality',
    placeholder: 'Tenure, Alignment, Track record...',
    fieldKey: 'managementQuality',
  },
  {
    label: '3.7 Valuation Margin of Safety',
    placeholder: 'Historical range, Peer comparison, DCF logic...',
    fieldKey: 'valuationMarginOfSafety',
  },
]

export function CriteriaField({
  config,
  formValues,
  onFieldChange,
  isViewOnly,
}: CriteriaFieldProps) {
  // Get the text value from the nested criteriaChecklist structure
  // formValues.criteriaChecklist[fieldKey].text
  const criteriaChecklist = formValues.criteriaChecklist as
    | Record<string, { text?: string; images?: unknown[] }>
    | undefined
  const fieldData = criteriaChecklist?.[config.fieldKey]
  const textValue = typeof fieldData === 'object' && fieldData !== null ? fieldData.text || '' : ''

  const handleTextChange = (newText: string) => {
    // Create updated criteriaChecklist with the new text value, preserving images
    const updatedCriteriaChecklist = {
      ...criteriaChecklist,
      [config.fieldKey]: {
        text: newText,
        images: fieldData?.images || [],
      },
    }
    // Update the entire criteriaChecklist object
    onFieldChange('criteriaChecklist', updatedCriteriaChecklist as unknown as string)
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-900">{config.label}</Label>
      <Textarea
        placeholder={config.placeholder}
        value={textValue}
        onChange={(e) => handleTextChange(e.target.value)}
        className="min-h-20 resize-y text-xs"
        disabled={isViewOnly}
      />
    </div>
  )
}

export function countWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length
}

export function truncateToWordLimit(
  value: string,
  maxWords: number
): { value: string; wasTruncated: boolean } {
  const words = value.trim().split(/\s+/u).filter(Boolean)

  if (words.length > maxWords) {
    const truncatedWords = words.slice(0, maxWords)
    return {
      value: truncatedWords.join(' '),
      wasTruncated: true,
    }
  }

  return { value, wasTruncated: false }
}

export function countBullets(value: string): number {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length
}

export function getTemplateFields(templateId?: MemoTemplateId): MemoFieldDefinition[] {
  if (!templateId) return []
  return templateFields[templateId] ?? []
}

export function getRequiredFieldIds(templateId?: MemoTemplateId): string[] {
  return getTemplateFields(templateId)
    .filter((field) => field.required)
    .map((field) => field.id)
}

export function hasValidationError(fieldId: string, validationErrors: Set<string>): boolean {
  return validationErrors.has(fieldId)
}

const SCREEN_NUMERIC_FIELD_IDS = new Set<string>([
  'growthLastYear',
  'expectedGrowth',
  'cagr',
  'marketShare',
  'impliedShare',
])

export function isScreenNumericFieldInvalid(fieldId: string, rawValue: unknown): boolean {
  if (!SCREEN_NUMERIC_FIELD_IDS.has(fieldId)) return false
  if (typeof rawValue !== 'string') return false

  const trimmed = rawValue.trim()
  if (trimmed.length === 0) return false

  const numericPattern = /^-?\d+(\.\d+)?%?$/
  if (!numericPattern.test(trimmed)) return true

  const num = parseFloat(trimmed.replace('%', ''))
  if (Number.isNaN(num)) return true
  if (num < 0) return true // disallow negative values (e.g. GROWTH LAST YEAR, EXPECTED GROWTH, CAGR, etc.)
  return false
}

const NON_UPPERCASE_LABEL_IDS = new Set<string>(['tamUnit', 'salesUnit'])

export function shouldUseUppercaseScreenLabel(fieldId: string): boolean {
  return !NON_UPPERCASE_LABEL_IDS.has(fieldId)
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2, 11)
}

export function buildUploadedFile(file: File): UploadedFile {
  const sizeInKb = file.size / 1024
  const sizeLabel =
    sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb.toFixed(1)} KB`
  return {
    id: generateId(),
    name: file.name,
    size: sizeLabel,
    type: 'Misc', // Default type
    file, // Store the actual file object
  }
}

export function getFileStatusText(file: UploadedFile): string {
  if (file.isUploading) return 'Uploading...'
  return file.uploadError || (file.s3_key ? `Uploaded • ${file.size}` : file.size)
}

export function getFileIcon(file: UploadedFile): React.ReactNode {
  const baseClass = 'mt-0.5 size-4 shrink-0'

  const iconConfig = {
    uploading: { Icon: Loader2, className: `${baseClass} animate-spin text-blue-500` },
    error: { Icon: AlertTriangle, className: `${baseClass} text-red-500` },
    uploaded: { Icon: CheckCircle, className: `${baseClass} text-green-500` },
    default: { Icon: FileText, className: `${baseClass} text-muted-foreground` },
  }

  const status = file.isUploading
    ? 'uploading'
    : file.uploadError
      ? 'error'
      : file.s3_key
        ? 'uploaded'
        : 'default'

  const { Icon, className } = iconConfig[status]
  return <Icon className={className} />
}

export function clearFormValues(): MemoFormValues {
  return {}
}

const TEMPLATE_ID_TO_API_TYPE_MAP: Record<MemoTemplateId, ApiTemplateType> = {
  'vcp-screen': 'GOING_IN_VALUE_CREATION_PLAN',
  'earnings-preview': 'EARNINGS_PREVIEW',
  'earnings-summary': 'EARNINGS_SUMMARY',
  'target-weight-change': 'TARGET_WEIGHT_CHANGE',
  'meeting-owned': 'MEETING_OWNED',
  'meeting-watchlist': 'MEETING_WATCHLIST',
  'meeting-first': 'MEETING_FIRST',
  'meeting-lesser': 'MEETING_LESSER',
  'drawdown-40': 'DRAWDOWN_40',
  screen: 'SCREEN',
  'investment-memo': 'INVESTMENT_MEMO',
}

const API_TYPE_TO_TEMPLATE_ID_MAP: Record<ApiTemplateType, MemoTemplateId> = {
  GOING_IN_VALUE_CREATION_PLAN: 'vcp-screen',
  EARNINGS_PREVIEW: 'earnings-preview',
  EARNINGS_SUMMARY: 'earnings-summary',
  TARGET_WEIGHT_CHANGE: 'target-weight-change',
  MEETING_OWNED: 'meeting-owned',
  MEETING_WATCHLIST: 'meeting-watchlist',
  MEETING_FIRST: 'meeting-first',
  MEETING_LESSER: 'meeting-lesser',
  DRAWDOWN_40: 'drawdown-40',
  SCREEN: 'screen',
  INVESTMENT_MEMO: 'investment-memo',
}

export function templateIdToApiType(templateId: MemoTemplateId): ApiTemplateType {
  return TEMPLATE_ID_TO_API_TYPE_MAP[templateId]
}

export function apiTypeToTemplateId(apiType: ApiTemplateType): MemoTemplateId | null {
  return API_TYPE_TO_TEMPLATE_ID_MAP[apiType] || null
}

const INVESTMENT_MEMO_CONTENT_TO_MEDIA_MAP: Record<string, string> = {
  introductionOriginStory: 'introductionOriginStoryMedia',
  thesisRecommendation: 'thesisRecommendationMedia',
  returnsOnCapitalRoicRoe: 'criteriaChecklistMedia', // Criteria fields share one media section
  cashConversion: 'criteriaChecklistMedia',
  reinvestmentRate: 'criteriaChecklistMedia',
  fcfMargins: 'criteriaChecklistMedia',
  balanceSheetStrength: 'criteriaChecklistMedia',
  managementQuality: 'criteriaChecklistMedia',
  valuationMarginOfSafety: 'criteriaChecklistMedia',
  stateOfTheIndustry: 'stateOfTheIndustryMedia',
  howWeLoseDollarRisks: 'howWeLoseDollarRisksMedia',
  keyOperationalPriorities: 'keyOperationalPrioritiesMedia',
  fundamentalGapValueDrivers: 'fundamentalGapValueDriversMedia',
  furtherAreasToExplore: 'furtherAreasToExploreMedia',
}

const CRITERIA_CHECKLIST_FIELDS = [
  'returnsOnCapitalRoicRoe',
  'cashConversion',
  'reinvestmentRate',
  'fcfMargins',
  'balanceSheetStrength',
  'managementQuality',
  'valuationMarginOfSafety',
]

function parseMediaBlocks(
  mediaJson: string | undefined
): Array<{ s3Key: string; caption: string }> {
  if (!mediaJson) return []

  try {
    const blocks: MediaBlockData[] = JSON.parse(mediaJson)
    return blocks
      .filter((block) => {
        // Only include blocks with images that have S3 keys (not base64 data URLs)
        return block.imageUrl && !isBase64DataUrl(block.imageUrl)
      })
      .map((block) => {
        // Prefer block.s3Key (set when loading from API/edit). Otherwise use block.imageUrl
        // only when it's the raw S3 key (new uploads set imageUrl to s3_key). Never send
        // presigned URLs (imageUrl in edit mode is presigned URL for display).
        const isHttpUrl = typeof block.imageUrl === 'string' && /^https?:\/\//i.test(block.imageUrl)
        const s3Key = block.s3Key ?? (block.imageUrl && !isHttpUrl ? block.imageUrl : '')
        return { s3Key, caption: block.caption || '' }
      })
      .filter((item) => item.s3Key.length > 0)
  } catch (error) {
    console.error('Failed to parse media blocks JSON:', error)
    return []
  }
}

export function formValuesToApiData(formValues: MemoFormValues): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  // Check if this is an Investment Memo by checking for Investment Memo specific fields OR media fields
  // This ensures proper handling when only media is provided without text
  const isInvestmentMemo =
    'introductionOriginStory' in formValues ||
    'thesisRecommendation' in formValues ||
    'howWeLoseDollarRisks' in formValues ||
    (INVESTMENT_MEMO_MEDIA_FIELDS as readonly string[]).some((field) => field in formValues)

  // Check if this is a GoingInVCP by checking for VCP specific fields OR media fields
  const isGoingInVCP =
    'sourcing' in formValues ||
    'situationOverview' in formValues ||
    'nonObviousCompChecklistItems' in formValues ||
    (VCP_MEDIA_FIELDS as readonly string[]).some((field) => field in formValues)

  if (isInvestmentMemo) {
    // Process Investment Memo with nested text/images structure

    // Process main sections (non-criteria)
    const mainSections = [
      'introductionOriginStory',
      'thesisRecommendation',
      'stateOfTheIndustry',
      'howWeLoseDollarRisks',
      'keyOperationalPriorities',
      'fundamentalGapValueDrivers',
      'furtherAreasToExplore',
    ]

    for (const sectionKey of mainSections) {
      const fieldValue = formValues[sectionKey]
      // Extract text value - handles both string and SectionData object formats
      const textValue = extractTextValue(fieldValue)
      // Get existing images from the SectionData object (if any)
      // Map to ensure caption is always a string (not undefined)
      const existingImages = extractImages(fieldValue).map((img) => ({
        s3Key: img.s3Key,
        caption: img.caption || '',
      }))
      // Also check for new images from media blocks
      const mediaKey = INVESTMENT_MEMO_CONTENT_TO_MEDIA_MAP[sectionKey]
      const mediaJson = formValues[mediaKey] as string | undefined
      const mediaBlockImages = parseMediaBlocks(mediaJson)
      // Prefer media block images if they exist (new uploads), otherwise use existing images
      const images = mediaBlockImages.length > 0 ? mediaBlockImages : existingImages

      data[sectionKey] = {
        text: textValue || null,
        images: images,
      }
    }

    // Process Criteria Checklist section with all sub-fields
    // CriteriaField component stores all criteria in formValues.criteriaChecklist as a nested object
    const criteriaChecklist = formValues.criteriaChecklist as
      | Record<string, { text?: string; images?: ImageData[] }>
      | undefined
    const criteriaData: Record<
      string,
      { text: string | null; images: Array<{ s3Key: string; caption: string }> }
    > = {}

    for (const criteriaField of CRITERIA_CHECKLIST_FIELDS) {
      // Read from the nested criteriaChecklist object, not directly from formValues
      const fieldData = criteriaChecklist?.[criteriaField]
      const textValue =
        typeof fieldData === 'object' && fieldData !== null ? fieldData.text || null : null
      criteriaData[criteriaField] = {
        text: textValue || null,
        images: [], // Individual criteria fields don't have their own images
      }
    }

    // Add the shared media for criteria checklist
    const criteriaMediaJson = formValues.criteriaChecklistMedia as string | undefined
    const criteriaImages = parseMediaBlocks(criteriaMediaJson)
    // Get existing images from criteriaChecklist if they exist at top level

    data.criteriaChecklist = {
      ...criteriaData,
      images: criteriaImages, // Shared images for the entire criteria section
    }

    // Copy non-content fields (like primaryCompany, company, createMaintenanceTask)
    Object.entries(formValues).forEach(([key, value]) => {
      // Skip content fields, media fields, criteriaChecklist (already processed), and company array
      if (
        key === 'company' ||
        key === 'criteriaChecklist' ||
        mainSections.includes(key) ||
        CRITERIA_CHECKLIST_FIELDS.includes(key) ||
        (INVESTMENT_MEMO_MEDIA_FIELDS as readonly string[]).includes(key)
      ) {
        return
      }
      data[key] = value === '' ? null : value
    })
  } else if (isGoingInVCP) {
    // Process GoingInVCP with nested text/images structure (same as Investment Memo)

    for (const sectionKey of VCP_SECTION_KEYS) {
      const fieldValue = formValues[sectionKey]
      // Extract text value - handles both string and SectionData object formats
      const textValue = extractTextValue(fieldValue)
      // Get existing images from the SectionData object (if any)
      // Map to ensure caption is always a string (not undefined)
      const existingImages = extractImages(fieldValue).map((img) => ({
        s3Key: img.s3Key,
        caption: img.caption || '',
      }))
      // Also check for new images from media blocks
      const mediaKey = `${sectionKey}Media`
      const mediaJson = formValues[mediaKey] as string | undefined
      const mediaBlockImages = parseMediaBlocks(mediaJson)
      // Prefer media block images if they exist (new uploads), otherwise use existing images
      const images = mediaBlockImages.length > 0 ? mediaBlockImages : existingImages

      data[sectionKey] = {
        text: textValue || null,
        images: images,
      }
    }

    // Copy non-content fields (like primaryCompany, company, createMaintenanceTask)
    Object.entries(formValues).forEach(([key, value]) => {
      // Skip content fields, media fields, and company array
      if (
        key === 'company' ||
        (VCP_SECTION_KEYS as readonly string[]).includes(key) ||
        (VCP_MEDIA_FIELDS as readonly string[]).includes(key)
      ) {
        return
      }
      data[key] = value === '' ? null : value
    })
  } else {
    // For non-Investment Memo templates, use original simple format
    for (const fid of TEMPLATE_USER_MULTI_FIELD_IDS) {
      if (!(fid in formValues)) continue
      const v = formValues[fid]
      if (typeof v === 'string') {
        data[fid] = userMultiFormStringToApiPayload(v)
      } else {
        data[fid] = null
      }
    }
    Object.entries(formValues).forEach(([key, value]) => {
      if (key === 'company' || TEMPLATE_USER_MULTI_FIELD_IDS.has(key)) {
        return
      }
      data[key] = value === '' ? null : value
    })
  }

  return data
}

export function canViewMemo(status: MemoStatus): boolean {
  return status === 'APPROVED' || status === 'SUBMITTED'
}

export function canEditMemo(status: MemoStatus): boolean {
  return status === 'DRAFT' || status === 'REJECTED'
}

export function canSubmitMemo(status: MemoStatus): boolean {
  return status === 'DRAFT'
}

export function canResubmitMemo(status: MemoStatus): boolean {
  return status === 'REJECTED'
}

export function canDeleteMemo(_status: MemoStatus): boolean {
  return true
}

export function handleWordLimitKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  field: MemoFieldDefinition,
  value: string,
  isViewOnly: boolean,
  allowedKeys: readonly string[]
): void {
  if (!field.maxWords || isViewOnly) return

  const currentWords = countWords(value)

  // Allow navigation and editing keys
  if (allowedKeys.includes(e.key)) {
    return
  }

  // If we're at the limit and trying to add more, prevent it
  if (currentWords >= field.maxWords && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
  }
}

export function handleWordLimitPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  field: MemoFieldDefinition,
  value: string,
  onChange: (value: string) => void,
  isViewOnly: boolean
): void {
  if (!field.maxWords || isViewOnly) return

  e.preventDefault()
  const pastedText = e.clipboardData.getData('text')
  const currentWords = countWords(value)
  const pastedWords = countWords(pastedText)
  const totalWords = currentWords + pastedWords

  if (totalWords <= field.maxWords) {
    // Paste is within limit
    const newValue = value + pastedText
    onChange(newValue)
  } else {
    // Truncate pasted text to fit within limit
    const remainingWords = field.maxWords - currentWords
    if (remainingWords > 0) {
      const words = pastedText.trim().split(/\s+/u).filter(Boolean)
      const truncatedWords = words.slice(0, remainingWords)
      const truncatedPaste = truncatedWords.join(' ')
      const newValue = value + truncatedPaste
      onChange(newValue)
    }
  }
}

export const INVESTMENT_MEMO_MEDIA_FIELDS = [
  'introductionOriginStoryMedia',
  'thesisRecommendationMedia',
  'criteriaChecklistMedia',
  'stateOfTheIndustryMedia',
  'howWeLoseDollarRisksMedia',
  'keyOperationalPrioritiesMedia',
  'fundamentalGapValueDriversMedia',
  'furtherAreasToExploreMedia',
] as const

export const VCP_MEDIA_FIELDS = [
  'sourcingMedia',
  'situationOverviewMedia',
  'nonObviousCompChecklistItemsMedia',
  'mistakeAvoidanceChecklistItemsMedia',
  'trustBankMedia',
  'historyInNumbersMedia',
  'valueDriversMedia',
  'verificationStepsMedia',
  'thesisInChartsMedia',
  'currentMultipleMedia',
  'historicalRangeMedia',
  'peerComparisonMedia',
  'outstandingQuestionsMedia',
] as const

export const VCP_SECTION_KEYS = [
  'sourcing',
  'situationOverview',
  'nonObviousCompChecklistItems',
  'mistakeAvoidanceChecklistItems',
  'trustBank',
  'historyInNumbers',
  'valueDrivers',
  'verificationSteps',
  'thesisInCharts',
  'currentMultiple',
  'historicalRange',
  'peerComparison',
  'outstandingQuestions',
] as const

export function isBase64DataUrl(url: string): boolean {
  return url.startsWith('data:image/')
}

export function getContentTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/)
  return match ? match[1] : 'image/png'
}

export function getExtensionFromContentType(contentType: string): string {
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/gif': 'gif',
  }
  return extensionMap[contentType] || 'png'
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const base64 = parts[1]
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

export function extractImagesToUpload(
  formValues: MemoFormValues,
  mediaFields: readonly string[] = INVESTMENT_MEMO_MEDIA_FIELDS
): ImageToUpload[] {
  const imagesToUpload: ImageToUpload[] = []

  for (const fieldKey of mediaFields) {
    const mediaJson = formValues[fieldKey] as string | undefined
    if (!mediaJson) continue

    try {
      const mediaBlocks: MediaBlockData[] = JSON.parse(mediaJson)
      for (const block of mediaBlocks) {
        if (block.imageUrl && isBase64DataUrl(block.imageUrl)) {
          const contentType = getContentTypeFromDataUrl(block.imageUrl)
          const extension = getExtensionFromContentType(contentType)
          const filename = `${fieldKey}_${block.id}.${extension}`

          imagesToUpload.push({
            fieldKey: fieldKey as MediaFieldKey,
            blockId: block.id,
            dataUrl: block.imageUrl,
            contentType,
            filename,
          })
        }
      }
    } catch (error) {
      console.error(`Failed to parse JSON for field ${fieldKey}:`, error)
      continue
    }
  }

  return imagesToUpload
}

export async function uploadImageToS3(
  imageData: ImageToUpload,
  uploadInfo: TemplateDataUploadUrlResponse,
  uploadFn: (url: string, data: Blob, contentType: string) => Promise<void>
): Promise<void> {
  const blob = dataUrlToBlob(imageData.dataUrl)
  await uploadFn(uploadInfo.upload_url, blob, uploadInfo.content_type)
}

export function replaceImageUrlsWithS3Keys(
  formValues: MemoFormValues,
  uploadResults: Map<string, string>, // Map of "fieldKey_blockId" -> s3_key
  mediaFields: readonly string[] = INVESTMENT_MEMO_MEDIA_FIELDS
): MemoFormValues {
  const updatedValues = { ...formValues }

  for (const fieldKey of mediaFields) {
    const mediaJson = formValues[fieldKey] as string | undefined
    if (!mediaJson) continue

    try {
      const mediaBlocks: MediaBlockData[] = JSON.parse(mediaJson)
      let hasChanges = false

      const updatedBlocks = mediaBlocks.map((block) => {
        const key = `${fieldKey}_${block.id}`
        const s3KeyFromUpload = uploadResults.get(key)

        if (s3KeyFromUpload && isBase64DataUrl(block.imageUrl)) {
          hasChanges = true
          // Set both imageUrl and s3Key so that formValuesToApiData can correctly identify the S3 key
          return { ...block, imageUrl: s3KeyFromUpload, s3Key: s3KeyFromUpload }
        }
        return block
      })

      if (hasChanges) {
        updatedValues[fieldKey] = JSON.stringify(updatedBlocks)
      }
    } catch (error) {
      console.error(`Failed to replace image URLs for field ${fieldKey}:`, error)
      continue
    }
  }

  return updatedValues
}

export async function processInvestmentMemoImages(
  formValues: MemoFormValues,
  generateUploadUrls: (
    files: Array<{ filename: string; content_type: string }>
  ) => Promise<TemplateDataUploadUrlResponse[]>,
  uploadToS3: (url: string, data: Blob, contentType: string) => Promise<void>,
  mediaFields: readonly string[] = INVESTMENT_MEMO_MEDIA_FIELDS
): Promise<MemoFormValues> {
  // Step 1: Extract all images that need to be uploaded
  const imagesToUpload = extractImagesToUpload(formValues, mediaFields)

  if (imagesToUpload.length === 0) {
    // No images to upload, return original form values
    return formValues
  }

  // Step 2: Generate presigned upload URLs
  const fileRequests = imagesToUpload.map((img) => ({
    filename: img.filename,
    content_type: img.contentType,
  }))

  const uploadUrls = await generateUploadUrls(fileRequests)

  // Step 3: Upload all images to S3 in parallel
  const uploadResults = new Map<string, string>()
  const uploadPromises = imagesToUpload.map(async (imageData, index) => {
    const uploadInfo = uploadUrls[index]
    await uploadImageToS3(imageData, uploadInfo, uploadToS3)

    // Store the S3 key for later replacement
    const key = `${imageData.fieldKey}_${imageData.blockId}`
    uploadResults.set(key, uploadInfo.s3_key)
  })

  await Promise.all(uploadPromises)

  // Step 4: Replace base64 URLs with S3 keys in form values
  return replaceImageUrlsWithS3Keys(formValues, uploadResults, mediaFields)
}

export function buildMemoAttachmentStrings(files: UploadedFile[]): MemoAttachmentJsonStrings {
  const uploaded = (f: UploadedFile) => Boolean(f.s3_key && !f.isUploading && !f.uploadError)

  const supporting = files.filter((f) => uploaded(f) && f.type !== 'Model')
  const models = files.filter((f) => uploaded(f) && f.type === 'Model')

  const toSupportingMeta = (f: UploadedFile) => ({
    filename: f.file?.name || f.name,
    s3_key: f.s3_key!,
  })

  const toModelMeta = (f: UploadedFile) => {
    const filename = f.file?.name || f.name
    return {
      filename,
      s3_key: f.s3_key!,
      title: filename,
      type: 'Model',
    }
  }

  const stringifyList = <M,>(items: UploadedFile[], map: (f: UploadedFile) => M) => {
    if (items.length === 0) return null
    const mapped = items.map(map)
    return JSON.stringify(mapped.length === 1 ? mapped[0] : mapped)
  }

  return {
    document_data: stringifyList(supporting, toSupportingMeta),
    model_document: stringifyList(models, toModelMeta),
  }
}

export interface MemoAttachmentPresignedUrlDeps {
  /** Batch presigned URLs for supporting documents (not model) */
  generateAttachedDocumentsUploadUrls: (
    files: Array<{ filename: string; content_type: string }>
  ) => Promise<TemplateDataUploadUrlResponse[]>
  /** Single presigned URL per file for model documents */
  generateModelDocumentUploadUrl: (
    filename: string,
    content_type: string
  ) => Promise<PresignedUploadInfo>
}

export async function uploadPendingFiles(
  files: UploadedFile[],
  presignedUrlDeps: MemoAttachmentPresignedUrlDeps,
  uploadToS3: (url: string, data: Blob | File, contentType: string) => Promise<void>
): Promise<UploadedFile[]> {
  const pendingFiles = files.filter((f) => f.file && !f.s3_key)
  if (pendingFiles.length === 0) return files

  const modelPending = pendingFiles.filter((f) => f.type === 'Model')
  const attachedPending = pendingFiles.filter((f) => f.type !== 'Model')

  const s3KeyMap = new Map<string, { s3_key: string; content_type: string }>()

  if (modelPending.length > 0) {
    const modelResults = await Promise.all(
      modelPending.map(async (file) => {
        const uploadInfo = await presignedUrlDeps.generateModelDocumentUploadUrl(
          file.file!.name,
          file.file!.type || 'application/octet-stream'
        )
        await uploadToS3(uploadInfo.upload_url, file.file!, uploadInfo.content_type)
        return { fileId: file.id, s3_key: uploadInfo.s3_key, content_type: uploadInfo.content_type }
      })
    )
    modelResults.forEach((r) =>
      s3KeyMap.set(r.fileId, { s3_key: r.s3_key, content_type: r.content_type })
    )
  }

  if (attachedPending.length > 0) {
    const fileRequests = attachedPending.map((f) => ({
      filename: f.file!.name,
      content_type: f.file!.type || 'application/octet-stream',
    }))
    const uploadUrls = await presignedUrlDeps.generateAttachedDocumentsUploadUrls(fileRequests)
    const attachedResults = await Promise.all(
      attachedPending.map(async (file, index) => {
        const uploadInfo = uploadUrls[index]
        await uploadToS3(uploadInfo.upload_url, file.file!, uploadInfo.content_type)
        return { fileId: file.id, s3_key: uploadInfo.s3_key, content_type: uploadInfo.content_type }
      })
    )
    attachedResults.forEach((r) =>
      s3KeyMap.set(r.fileId, { s3_key: r.s3_key, content_type: r.content_type })
    )
  }

  return files.map((f) => {
    const result = s3KeyMap.get(f.id)
    if (result) {
      return { ...f, s3_key: result.s3_key, content_type: result.content_type }
    }
    return f
  })
}

export function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function addCompanyToCache<T extends { id: string }>(cache: T[], companyData: T): T[] {
  const exists = cache.some((c) => c.id === companyData.id)
  if (exists) {
    return cache
  }
  return [...cache, companyData]
}

/**
 * Extract text value from form field - handles both string and SectionData object formats, also handles nested { text: { text, images }
 * This handles the API response format where investment memo fields are stored as { text, images } objects
 */
export function getTextValue(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  // Handle the { text, images } object format from API
  if (typeof value === 'object' && value !== null) {
    const sectionData = value as SectionData
    const textValue = sectionData.text
    // If text is a string, return it directly
    if (typeof textValue === 'string') {
      return textValue
    }
    // Handle nested { text: { text, images } } structure - API may return doubly nested objects
    if (typeof textValue === 'object' && textValue !== null) {
      const nestedText = (textValue as SectionData).text
      return typeof nestedText === 'string' ? nestedText : ''
    }
    return ''
  }
  return ''
}

/**
 * Extract text value from form field that may be a string or {text, images} object Also handles nested { text: { text, images } } also This handles the API response format where investment memo fields are stored as objectsre
 */
export function extractTextValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object' && 'text' in value) {
    const textValue = (value as { text: unknown }).text
    // If text is a string, return it directly
    if (typeof textValue === 'string') {
      return textValue
    }
    // Handle nested { text: { text, images } } structure - API may return doubly nested objects
    if (textValue && typeof textValue === 'object' && 'text' in textValue) {
      const nestedText = (textValue as { text: string | null }).text
      return nestedText ?? undefined
    }
    return undefined
  }
  return undefined
}

/**
 * Extract images array from form field that may have {text, images} structure
 */
export function extractImages(value: unknown): ImageData[] {
  if (value && typeof value === 'object') {
    const valueObj = value as { images?: ImageData[]; text?: unknown }
    // Prefer top-level images
    if ('images' in valueObj && Array.isArray(valueObj.images) && valueObj.images.length > 0) {
      return valueObj.images
    }
    // Check for images nested within text (for doubly nested structures)
    if ('text' in valueObj && valueObj.text && typeof valueObj.text === 'object') {
      const nestedObj = valueObj.text as { images?: ImageData[] }
      if ('images' in nestedObj && Array.isArray(nestedObj.images)) {
        return nestedObj.images
      }
    }
    // Return empty top-level images array if it exists but is empty
    if ('images' in valueObj && Array.isArray(valueObj.images)) {
      return valueObj.images
    }
  }
  return []
}

/**
 * Extract all S3 keys from formValues for the given section keys.
 * Used to build a stable string for dependency tracking (e.g. when templateImageUrls load).
 */
export function getImageS3KeysFromFormValues(
  formValues: Record<string, unknown>,
  sectionKeys: readonly string[]
): string {
  const keys = sectionKeys.flatMap((key) =>
    extractImages(formValues[key])
      .map((img) => img.s3Key)
      .filter((k): k is string => Boolean(k))
  )
  return keys.sort().join(',')
}

/**
 * Convert ImageData (from API) to MediaBlockData (for edit form)
 */
export function imageDataToMediaBlock(
  image: ImageData,
  templateImageUrls: Record<string, string>
): MediaBlockData {
  const imageUrl =
    image.s3Key && templateImageUrls[image.s3Key] ? templateImageUrls[image.s3Key] : ''
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: '',
    imageUrl,
    caption: image.caption || '',
    s3Key: image.s3Key,
  }
}

/**
 * Build media blocks from form values (section images only).
 * Used when formValues.images loads after initial render.
 */
export function buildMediaBlocksFromFormValues(
  formValues: Record<string, unknown>,
  sectionKeys: readonly string[],
  templateImageUrls: Record<string, string>
): Record<string, MediaBlockData[]> {
  const newBlocks: Record<string, MediaBlockData[]> = {}
  sectionKeys.forEach((key) => {
    const sectionData = formValues[key] as SectionData | undefined
    if (sectionData?.images && sectionData.images.length > 0) {
      newBlocks[key] = sectionData.images.map((img) =>
        imageDataToMediaBlock(img, templateImageUrls)
      )
    } else {
      newBlocks[key] = []
    }
  })
  return newBlocks
}

/**
 * Apply template URLs to existing media blocks (fill imageUrl from s3Key).
 * Returns updated state or prev if no changes. Used when templateImageUrls loads after initial render.
 */
export function applyTemplateUrlsToMediaBlocks(
  prev: Record<string, MediaBlockData[]>,
  templateImageUrls: Record<string, string>,
  sectionKeys: readonly string[]
): Record<string, MediaBlockData[]> {
  const updated: Record<string, MediaBlockData[]> = {}
  let hasChanges = false

  sectionKeys.forEach((key) => {
    const blocks = prev[key] || []
    const updatedBlocks = blocks.map((block) => {
      if (block.s3Key && !block.imageUrl && templateImageUrls[block.s3Key]) {
        hasChanges = true
        return {
          ...block,
          imageUrl: templateImageUrls[block.s3Key],
        }
      }
      return block
    })
    updated[key] = updatedBlocks
  })

  return hasChanges ? updated : prev
}

/**
 * Resolve image URL - prefer presigned URL from templateImageUrls
 */
export function resolveImageUrl(
  image: ImageData,
  templateImageUrls: Record<string, string>
): string | undefined {
  if (image.s3Key && templateImageUrls[image.s3Key]) {
    return templateImageUrls[image.s3Key]
  }
  return undefined
}

export function resolveChartImageUrl(
  chart: { s3Key?: string; imageUrl?: string },
  templateImageUrls: Record<string, string> = {}
): string | undefined {
  if (chart.s3Key && templateImageUrls[chart.s3Key]) {
    return templateImageUrls[chart.s3Key]
  }
  return chart.imageUrl
}

export function shouldUpdateChartsForUrls(
  charts: Array<{ s3Key?: string; imageUrl?: string }>,
  templateImageUrls: Record<string, string>
): boolean {
  return charts.some((chart) => chart.s3Key && !chart.imageUrl && templateImageUrls[chart.s3Key])
}

export function updateChartsWhenUrlsLoad<T extends { s3Key?: string; imageUrl?: string }>(
  prevCharts: T[],
  currentTemplateUrlKeys: string,
  prevTemplateUrlKeysRef: { current: string },
  currentTemplateImageUrls: Record<string, string>
): T[] | null {
  if (
    currentTemplateUrlKeys !== prevTemplateUrlKeysRef.current &&
    Object.keys(currentTemplateImageUrls).length > 0
  ) {
    prevTemplateUrlKeysRef.current = currentTemplateUrlKeys
    if (shouldUpdateChartsForUrls(prevCharts, currentTemplateImageUrls)) {
      return [...prevCharts]
    }
  }
  return null
}

export function parseCharts(value: string | undefined): Array<{
  id: string
  title: string
  caption: string
  imageUrl?: string
  imageFile?: File
  s3Key?: string
  isUploading?: boolean
}> {
  if (!value) return []

  try {
    return JSON.parse(value)
  } catch (error) {
    console.error('Failed to parse charts:', error)
    return []
  }
}

export function calculateCircularProgressOffset(
  radius: number,
  percentage: number
): { circumference: number; offset: number } {
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percentage / 100)
  return { circumference, offset }
}

export function calculateCompletionStats(
  formValues: Record<string, unknown>,
  fieldIds: readonly string[]
): {
  completedFields: number
  totalFields: number
  completionPercentage: number
} {
  const total = fieldIds.length
  const completed = fieldIds.filter((fieldId) => {
    const value = formValues[fieldId]
    if (value === undefined || value === null || value === '') return false
    if (typeof value === 'string') return value.trim().length > 0
    return true
  }).length

  return {
    completedFields: completed,
    totalFields: total,
    completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

/**
 * Process screen template charts - upload base64 images to S3
 * Used for both POST (create) and PATCH (update) operations
 */
export async function processScreenTemplateCharts(
  formValues: MemoFormValues,
  generateUploadUrls: (
    files: Array<{ filename: string; content_type: string }>
  ) => Promise<TemplateDataUploadUrlResponse[]>,
  uploadToS3: (url: string, data: Blob, contentType: string) => Promise<void>
): Promise<MemoFormValues> {
  const chartsJson = formValues.supportingCharts as string | undefined
  if (!chartsJson) return formValues

  let charts: Chart[]
  try {
    charts = JSON.parse(chartsJson)
  } catch (error) {
    console.error('Failed to parse supportingCharts JSON:', error)
    return formValues
  }

  // Filter charts that have base64 data URLs (need to be uploaded)
  const chartsToUpload = charts.filter(
    (chart) => chart.imageUrl && chart.imageUrl.startsWith('data:')
  )
  if (chartsToUpload.length === 0) return formValues

  // Generate upload URLs for each image
  const fileRequests = chartsToUpload.map((chart, index) => {
    const mimeMatch = chart.imageUrl?.match(/data:([^;]+);/)
    const contentType = mimeMatch ? mimeMatch[1] : 'image/png'
    const extension = contentType.split('/')[1] || 'png'
    return {
      filename: `chart_${chart.id || index}.${extension}`,
      content_type: contentType,
    }
  })

  const uploadUrls = await generateUploadUrls(fileRequests)
  const s3KeyMap = new Map<string, string>()

  // Upload images to S3
  await Promise.all(
    chartsToUpload.map(async (chart, index) => {
      const uploadInfo = uploadUrls[index]
      const blob = dataUrlToBlob(chart.imageUrl!)
      await uploadToS3(uploadInfo.upload_url, blob, uploadInfo.content_type)
      s3KeyMap.set(chart.id, uploadInfo.s3_key)
    })
  )

  // Replace base64 URLs with S3 keys
  const updatedCharts = charts.map((chart) => {
    const s3Key = s3KeyMap.get(chart.id)
    if (s3Key) {
      return { id: chart.id, title: chart.title, caption: chart.caption, s3Key }
    }
    return chart
  })

  return { ...formValues, supportingCharts: JSON.stringify(updatedCharts) }
}
