'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, Download, FileText, AlertCircle, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import notify from '@/lib/notifications'
import {
  AskAIAssistant,
  DocumentProperties,
  DocumentSidebarSkeleton,
  DocumentPreviewSkeleton,
  SupportingDocumentsCard,
  DocumentViewer,
  DocumentDraftForm,
  MaintenanceTaskForm,
} from '@/containers/documents/components'
import { Badge } from '@/components/ui/badge'
import {
  useDocument,
  useDocumentFileUrl,
  extractCompanyIdFromDocument,
  getDocumentScenario,
  getDocumentStatus,
  getDocumentSource,
  extractFormData,
  canCreateMaintenanceTask,
  DEFAULT_MAINTENANCE_TASK,
  mapCategoryToTemplateId,
  isDraftEnabledTemplate,
  normalizeTemplateDataForForm,
  downloadDocumentById,
  downloadParentAttachedDocument,
  saveOrPublishDocument,
  normalizeDoc,
  normalizeAttachedDocument,
  generateUniqueId,
  isInvalidSelectValue,
  uploadSupportingFilesToS3,
  partitionS3UploadResults,
  buildContentPatchAttachmentStrings,
  fetchUploadUrlsForSupportingFiles,
  applyPendingUploadsStateAfterS3,
} from '@/containers/documents/lib'
import type {
  DocumentDetailContainerProps,
  ApiDocument,
  TearsheetDataForDocument,
  ChatMessage,
  RelatedDocument,
  UploadedFileItem,
  PendingSupportingUpload,
} from '@/containers/documents/lib/types'
import {
  useDocumentChatStatus,
  useSendChatMessage,
  useReprocessDocument,
  useMemoTemplateUrls,
  useUpdateContent,
  useGetDocumentFileUrl,
  useInvalidateDocumentDetail,
  useDocuments,
} from '@/containers/documents/lib/queries'
import { useTearsheetData } from '@/containers/tearsheet/lib/queries'
import type {
  KeyMetricsData,
  InvestmentThesis,
  TearsheetApiResponse,
} from '@/containers/tearsheet/lib/type'
import type {
  MemoFormValues,
  MaintenanceTaskData,
  MemoUserMultiFieldResources,
  TemplateUserMentionPickerData,
} from '@/containers/memos/lib/types'
import {
  processScreenTemplateCharts,
  processInvestmentMemoImages,
  VCP_MEDIA_FIELDS,
} from '@/containers/memos/lib/helpers'
import { getRequiredFieldIds, getTemplateFields } from '@/containers/memos/lib/helpers'
import { isUserMultiValueFilled } from '@/containers/memos/lib/user-multi-field'
import { useCompaniesById } from '@/lib/hooks/useCompaniesById'
import { useOrgUsersInfinite } from '@/lib/hooks/useOrgUsersInfinite'
import { usersService } from '@/services/api/users.service'
import {
  useMaintenanceAnalysts,
  useGenerateTemplateDataUploadUrls,
  useGenerateAttachedDocumentsUploadUrls,
  useUploadToS3,
} from '@/containers/memos/lib/queries'
import { useMaintenanceMutations } from '@/containers/pipeline/lib/maintenance-queries'
import { downloadElementAsPdf } from '@/components/shared/DownloadElementAsPdf'

/** Tearsheet-shaped props for DocumentProperties (financials_ratios parity with Tearsheet page). */
function prepareTearsheetData(
  companyId: number | null,
  isLoadingTearsheet: boolean,
  keyMetrics: KeyMetricsData | null,
  investmentThesis: InvestmentThesis | null,
  rawApiData: TearsheetApiResponse | undefined
): TearsheetDataForDocument | null {
  if (!companyId || isLoadingTearsheet || !rawApiData) {
    return null
  }

  const thesisText = investmentThesis?.text?.trim()
  const normalizedInvestmentThesis: InvestmentThesis | null = thesisText
    ? { text: thesisText }
    : null

  return {
    keyMetrics: keyMetrics || null,
    investmentThesis: normalizedInvestmentThesis,
    financialsRatios: rawApiData.tearsheet_meta?.meta?.financials_ratios ?? null,
    yfinance: rawApiData.yfinance,
  }
}

export function DocumentDetailContainer({ documentId, onClose }: DocumentDetailContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invalidateDocumentDetail = useInvalidateDocumentDetail()
  const [thesisExpanded, setThesisExpanded] = useState(false)
  const [internalMetricsExpanded, setInternalMetricsExpanded] = useState(true)
  const [consensusExpanded, setConsensusExpanded] = useState(false)
  const [formValues, setFormValues] = useState<MemoFormValues>({})
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showMaintenanceTaskForm, setShowMaintenanceTaskForm] = useState(false)
  const [maintenanceTask, setMaintenanceTask] =
    useState<MaintenanceTaskData>(DEFAULT_MAINTENANCE_TASK)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatId, setChatId] = useState<number | undefined>(undefined)
  // Supporting documents: local state (like Research Update), sent on Save/Publish only
  const [selectedSupportingDocumentIds, setSelectedSupportingDocumentIds] = useState<string[]>([])
  const [newlyUploadedDocSummaries, setNewlyUploadedDocSummaries] = useState<
    { id: string; title: string }[]
  >([])
  const [pendingSupportingUploads, setPendingSupportingUploads] = useState<
    PendingSupportingUpload[]
  >([])

  // TanStack Query hooks
  const { data: documentData, isLoading, error } = useDocument(documentId)
  const document = documentData?.document
  const rawApiDocument = documentData?.rawApiDocument as ApiDocument | undefined

  // Determine document scenario
  const scenario = useMemo(() => {
    if (!rawApiDocument) return null
    return getDocumentScenario(rawApiDocument)
  }, [rawApiDocument])

  const documentStatus = useMemo(() => {
    if (!rawApiDocument) return null
    return getDocumentStatus(rawApiDocument)
  }, [rawApiDocument])

  // Extract company_id from document metadata
  const companyId = rawApiDocument
    ? extractCompanyIdFromDocument(
        rawApiDocument.doc_metadata || null,
        rawApiDocument.schema_data || null,
        rawApiDocument.primary_company_id
      )
    : null

  // Fetch company details to get stage
  const { data: companyData = [] } = useCompaniesById(
    companyId ? [String(companyId)] : [],
    !!companyId
  )
  const companyStageSlug = companyData[0]?.stage?.slug || null
  const companyTicker = document?.ticker || companyData[0]?.ticker || ''

  // Fetch analysts for maintenance task (only when form is shown)
  const { data: analysts = [] } = useMaintenanceAnalysts(showMaintenanceTaskForm)

  // Maintenance task mutations
  const { createTask } = useMaintenanceMutations()

  // Fetch document chat status
  const {
    data: chatStatus,
    isLoading: isLoadingStatus,
    error: statusError,
  } = useDocumentChatStatus(documentId)

  // Send chat message mutation
  const { mutate: sendMessage, isPending: isSendingMessage } = useSendChatMessage()

  // Reprocess document mutation
  const { mutate: reprocessDocument, isPending: isRetrying } = useReprocessDocument()

  // Update content mutation (for save draft and publish)
  const { mutateAsync: updateContent } = useUpdateContent()

  // Get document file URL mutation (for download)
  const getDocumentFileUrlMutation = useGetDocumentFileUrl()

  // Generate upload URLs for template data images (inline charts / media)
  const generateUploadUrlsMutation = useGenerateTemplateDataUploadUrls()
  const generateAttachedDocumentsUploadUrlsMutation = useGenerateAttachedDocumentsUploadUrls()

  // Upload to S3 mutation
  const uploadToS3Mutation = useUploadToS3()

  // Wrapper function for uploadToS3 that matches the signature expected by helpers
  const uploadToS3 = useCallback(
    async (presignedUrl: string, data: Blob, contentType: string) => {
      await uploadToS3Mutation.mutateAsync({ presignedUrl, data, contentType })
    },
    [uploadToS3Mutation]
  )

  const draftTemplateIdForUserMulti = useMemo(
    () => (rawApiDocument ? mapCategoryToTemplateId(rawApiDocument.category) : null),
    [rawApiDocument]
  )
  const draftFieldsForUserMulti = useMemo(
    () => getTemplateFields(draftTemplateIdForUserMulti ?? undefined),
    [draftTemplateIdForUserMulti]
  )
  const documentTemplateHasUserMulti = useMemo(
    () => draftFieldsForUserMulti.some((f) => f.type === 'user_multi'),
    [draftFieldsForUserMulti]
  )
  const enableDocUserMentionQuery = scenario === 'draft-template' && documentTemplateHasUserMulti
  const {
    data: docOrgUserPages,
    isLoading: docOrgUsersLoading,
    isFetchingNextPage: docOrgUsersFetchingNext,
    hasNextPage: docOrgUsersHasNext,
    fetchNextPage: docOrgUsersFetchNext,
    isError: docOrgUsersError,
  } = useOrgUsersInfinite(enableDocUserMentionQuery)

  const docMentionUsersFlat = useMemo(() => {
    const pages = docOrgUserPages?.pages ?? []
    const seen = new Set<number>()
    const out: TemplateUserMentionPickerData['users'] = []
    for (const p of pages) {
      for (const u of p.users) {
        if (!seen.has(u.id)) {
          seen.add(u.id)
          out.push({ id: u.id, displayName: u.displayName })
        }
      }
    }
    return out
  }, [docOrgUserPages?.pages])

  const docUserMentionPicker = useMemo<TemplateUserMentionPickerData>(() => {
    if (enableDocUserMentionQuery) {
      return {
        users: docMentionUsersFlat,
        isLoading: docOrgUsersLoading,
        isError: docOrgUsersError,
        isFetchingNextPage: docOrgUsersFetchingNext,
        hasNextPage: docOrgUsersHasNext,
        fetchNextPage: docOrgUsersFetchNext,
      }
    }
    return {
      users: [],
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: () => {},
    }
  }, [
    enableDocUserMentionQuery,
    docMentionUsersFlat,
    docOrgUsersLoading,
    docOrgUsersError,
    docOrgUsersFetchingNext,
    docOrgUsersHasNext,
    docOrgUsersFetchNext,
  ])

  const docFetchUsersByIds = useCallback((ids: number[]) => usersService.getUsersByIds(ids), [])

  const documentUserMultiFieldResources = useMemo<MemoUserMultiFieldResources>(
    () => ({
      fetchUsersByIds: docFetchUsersByIds,
      mentionPicker: docUserMentionPicker,
    }),
    [docFetchUsersByIds, docUserMentionPicker]
  )

  // Sync supporting document IDs from API (on load and after save/refetch)
  const apiRelevantIdsKey = useMemo(
    () =>
      (rawApiDocument?.relevant_documents_details ?? [])
        .map((d) => d.id)
        .sort((a, b) => a - b)
        .join(','),
    [rawApiDocument?.relevant_documents_details]
  )
  useEffect(() => {
    const details = rawApiDocument?.relevant_documents_details ?? []
    setSelectedSupportingDocumentIds(details.map((d) => String(d.id)))
    setNewlyUploadedDocSummaries([])
  }, [apiRelevantIdsKey, rawApiDocument?.relevant_documents_details])

  // Same API as Research Update: useDocuments for "Select from Archive" (drafts only)
  const currentDocIdStr = typeof documentId === 'string' ? documentId : String(documentId)
  const isDraftForArchive = scenario === 'draft-template' || documentStatus === 'DRAFT'
  const { data: documentsData } = useDocuments(0, 100, {
    enabled: !!documentId && !!rawApiDocument && !!isDraftForArchive,
  })
  const allArchiveDocuments = useMemo(
    () => documentsData?.documents ?? [],
    [documentsData?.documents]
  )

  const attachedIds = useMemo(
    () => new Set(selectedSupportingDocumentIds),
    [selectedSupportingDocumentIds]
  )
  const archiveDocumentsForDetail = useMemo(() => {
    return allArchiveDocuments
      .filter((d) => d.id !== currentDocIdStr && !attachedIds.has(d.id))
      .map((d) => ({
        id: d.id,
        title: d.title,
        ticker: d.ticker,
        exchange: d.exchange,
        type: d.type,
        date: d.date,
      }))
  }, [allArchiveDocuments, currentDocIdStr, attachedIds])

  const attachedDocumentsForDisplay = useMemo((): RelatedDocument[] => {
    const list = rawApiDocument?.attached_documents
    if (!Array.isArray(list) || list.length === 0) return []
    return list.map((att, index) => normalizeAttachedDocument(att, index))
  }, [rawApiDocument?.attached_documents])

  const modelDocumentsForDisplay = useMemo((): RelatedDocument[] => {
    if (!selectedSupportingDocumentIds.length) return []

    const apiDocs =
      rawApiDocument?.relevant_documents_details?.map((d) => normalizeDoc(d, 'api')) ?? []

    const uploadedDocs = newlyUploadedDocSummaries.map((d) => normalizeDoc(d, 'upload'))

    const archiveDocs = allArchiveDocuments.map((d) =>
      normalizeDoc(
        {
          id: d.id,
          title: d.title,
          filename: d.file_name ?? d.filename ?? null,
          type: d.type,
        },
        'archive'
      )
    )

    // Priority: API > Upload > Archive
    const docMap = new Map<string, RelatedDocument>()
    ;[...archiveDocs, ...uploadedDocs, ...apiDocs].forEach((doc) => {
      docMap.set(doc.id, doc)
    })

    return selectedSupportingDocumentIds
      .map((id) => docMap.get(id))
      .filter(Boolean) as RelatedDocument[]
  }, [
    selectedSupportingDocumentIds,
    rawApiDocument?.relevant_documents_details,
    newlyUploadedDocSummaries,
    allArchiveDocuments,
  ])

  // Fetch tearsheet data if company_id is available
  // Note: useTearsheetData handles the case when companyId is 0/null by returning null data
  const tearsheetData = useTearsheetData(companyId || 0)

  // Safely extract data with fallbacks to prevent crashes from malformed API responses
  const keyMetrics = tearsheetData?.keyMetrics || null
  const investmentThesis = tearsheetData?.investmentThesis || null
  const isLoadingTearsheet = tearsheetData?.isLoading || false
  const rawApiData =
    tearsheetData && 'rawApiData' in tearsheetData ? tearsheetData.rawApiData : undefined

  // Fetch memo template URLs for S3 images (supporting charts) in both view and edit mode
  const numericDocumentId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId
  const isTemplateScenario = scenario === 'published-template' || scenario === 'draft-template'
  const { data: memoTemplateUrlsData } = useMemoTemplateUrls(
    isTemplateScenario ? numericDocumentId : null,
    { enabled: isTemplateScenario }
  )
  const templateImageUrls = memoTemplateUrlsData?.urls || {}

  // Initialize form values from document data (for draft and published templates)
  useEffect(() => {
    if (rawApiDocument && (scenario === 'draft-template' || scenario === 'published-template')) {
      const templateId = mapCategoryToTemplateId(rawApiDocument.category)
      let extractedData: Record<string, unknown> = {}

      if (rawApiDocument.template_data) {
        let templateData = rawApiDocument.template_data
        if (typeof templateData === 'string') {
          try {
            templateData = JSON.parse(templateData) as Record<string, unknown>
          } catch {
            templateData = {}
          }
        }
        if (typeof templateData === 'object' && templateData !== null) {
          for (const [key, value] of Object.entries(templateData)) {
            const lowerKey = key.toLowerCase()
            if (!lowerKey.includes('maintenance_task')) {
              extractedData[key] = value
            }
          }
        }
      } else {
        // Fallback to extractFormData if no template_data
        extractedData = extractFormData(rawApiDocument)
      }

      const normalized = normalizeTemplateDataForForm(extractedData, templateId)
      if (scenario === 'draft-template' && isDraftEnabledTemplate(templateId)) {
        normalized.title = normalized.title ?? rawApiDocument.title
      }
      setFormValues(normalized as MemoFormValues)
    }
  }, [rawApiDocument, scenario])

  // Enable file URL fetching for previewable types
  const normalizedFileName = (document?.file_name || document?.filename || '').toLowerCase()
  const isPDF = document?.mime_type?.includes('pdf')
  const isImage = document?.mime_type?.startsWith('image/')
  const isDocx =
    document?.mime_type?.includes('word') ||
    document?.mime_type?.includes('officedocument.wordprocessingml.document') ||
    normalizedFileName?.endsWith('.docx')
  const isXlsx =
    document?.mime_type?.includes('excel') ||
    document?.mime_type?.includes('spreadsheetml') ||
    normalizedFileName?.endsWith('.xlsx')
  const shouldAutoLoad = scenario === 'uploaded' && (isPDF || isImage || isDocx || isXlsx)

  const {
    data: fileUrlData,
    isLoading: loadingFileUrl,
    isFetching: isDownloading,
  } = useDocumentFileUrl(documentId, {
    enabled: shouldAutoLoad,
  })

  // Determine if sidebar should show skeleton (loading document or tearsheet data)
  const showSidebarSkeleton = isLoading || (isLoadingTearsheet && !tearsheetData)

  // Check if maintenance task can be created
  const canCreateTask = useMemo(
    () => canCreateMaintenanceTask(companyStageSlug),
    [companyStageSlug]
  )

  const handleSidebarDocumentRowClick = useCallback(
    (doc: RelatedDocument) => {
      if (doc.s3_key) {
        const parentNumeric =
          typeof documentId === 'string' ? parseInt(documentId, 10) : Number(documentId)
        void downloadParentAttachedDocument(parentNumeric, doc)
        return
      }
      router.push(`/documents/${doc.id}`)
    },
    [documentId, router]
  )
  const previewRef = useRef<HTMLDivElement>(null)

  const handleDownload = () => {
    const source = rawApiDocument ? getDocumentSource(rawApiDocument) : null
    if (source === 'upload') {
      downloadDocumentById(documentId, getDocumentFileUrlMutation.mutate)
      return
    }
    if (!previewRef.current) {
      notify.error({
        title: 'Download Failed',
        description: 'Preview container not found.',
      })
      return
    }
    try {
      downloadElementAsPdf(previewRef.current, document?.title || 'document-preview')
    } catch (error) {
      console.error(error)
      notify.error({
        title: 'Download Failed',
        description: 'Unable to generate PDF.',
      })
    }
  }

  const handleSupportingDocumentUpload = useCallback(
    (files: FileList | null) => {
      if (!files?.length || !rawApiDocument) return
      const primaryCompanyId = rawApiDocument.primary_company_id
      if (!primaryCompanyId) {
        notify.error({
          title: 'Upload Failed',
          description: 'Document has no company. Cannot add supporting documents.',
        })
        return
      }
      const newEntries = Array.from(files).map((file) => {
        const sizeInKb = file.size / 1024
        const sizeLabel =
          sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb.toFixed(1)} KB`
        return {
          id: generateUniqueId(),
          name: file.name,
          size: sizeLabel,
          type: 'Misc',
          file,
          isUploading: false,
          uploadError: undefined,
        }
      })
      setPendingSupportingUploads((prev) => [...prev, ...newEntries])
    },
    [rawApiDocument]
  )

  const handleAttachedDocumentDownload = useCallback(
    (doc: RelatedDocument) => {
      const parentNumeric =
        typeof documentId === 'string' ? parseInt(documentId, 10) : Number(documentId)
      void downloadParentAttachedDocument(parentNumeric, doc)
    },
    [documentId]
  )

  const handleModelDocumentDownload = useCallback(
    (doc: RelatedDocument) => {
      // Linked archive row: GET /content/{doc.id}/file-url
      downloadDocumentById(doc.id, getDocumentFileUrlMutation.mutate)
    },
    [getDocumentFileUrlMutation]
  )

  const handleRemoveSupportingDocument = useCallback((docIdToRemove: string) => {
    setSelectedSupportingDocumentIds((prev) => prev.filter((id) => id !== docIdToRemove))
    setNewlyUploadedDocSummaries((prev) => prev.filter((s) => s.id !== docIdToRemove))
  }, [])

  const handleRemovePendingSupportingFile = useCallback((fileId: string) => {
    setPendingSupportingUploads((prev) => prev.filter((p) => p.id !== fileId))
  }, [])

  const getSupportingFileIcon = useCallback((file: UploadedFileItem): React.ReactNode => {
    const baseClass = 'mt-0.5 size-4 shrink-0'
    if (file.isUploading) {
      return <Loader2 className={`${baseClass} animate-spin text-blue-500`} />
    }
    if (file.uploadError) {
      return <AlertCircle className={`${baseClass} text-red-500`} />
    }
    return <FileText className={`${baseClass} text-muted-foreground`} />
  }, [])

  const getSupportingFileStatusText = useCallback((file: UploadedFileItem): string => {
    if (file.isUploading) return 'Uploading...'
    if (file.uploadError) return file.uploadError
    return `Pending • ${file.size}`
  }, [])

  const handleAddFromArchive = useCallback((selectedDocId: string) => {
    setSelectedSupportingDocumentIds((prev) =>
      prev.includes(selectedDocId) ? prev : [...prev, selectedDocId]
    )
  }, [])

  const hasTriggeredAutoDownload = useRef(false)
  const downloadHandlerRef = useRef(handleDownload)
  downloadHandlerRef.current = handleDownload

  const handleAutoDownload = useCallback(() => {
    const autoDownload = searchParams.get('autoDownload') === 'true'
    const isTemplate = scenario === 'draft-template' || scenario === 'published-template'
    if (!autoDownload || isLoading || !document || !rawApiDocument) return
    if (autoDownload && !isTemplate) {
      router.replace(`/documents?id=${documentId}`, { scroll: false })
      return
    }
    if (hasTriggeredAutoDownload.current) return
    const timeout = window.setTimeout(() => {
      if (hasTriggeredAutoDownload.current) return
      hasTriggeredAutoDownload.current = true
      if (previewRef.current) {
        downloadHandlerRef.current()
      }
      // Return to listing and close the detail modal after auto-download
      router.replace('/documents', { scroll: false })
    }, 1000)
    return () => window.clearTimeout(timeout)
  }, [document, documentId, isLoading, rawApiDocument, scenario, searchParams, router])

  useEffect(() => {
    return handleAutoDownload()
  }, [handleAutoDownload])

  const handleFieldChange = useCallback(
    (fieldId: string, value: string) => {
      setFormValues((prev) => ({ ...prev, [fieldId]: value }))
      setValidationErrors((prev) => {
        if (!prev.has(fieldId)) return prev
        const templateId = rawApiDocument ? mapCategoryToTemplateId(rawApiDocument.category) : null
        const fieldDef = templateId
          ? getTemplateFields(templateId).find((f) => f.id === fieldId)
          : undefined
        if (fieldDef?.type === 'user_multi') {
          if (!isUserMultiValueFilled(value)) return prev
        } else if (isInvalidSelectValue(value)) {
          return prev
        }
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      })
    },
    [rawApiDocument]
  )

  const validateForm = useCallback(() => {
    if (!rawApiDocument) return true

    const templateId = mapCategoryToTemplateId(rawApiDocument.category)
    if (!templateId) return true

    const requiredFieldIds = new Set<string>(getRequiredFieldIds(templateId))
    const fieldTypeById = new Map(getTemplateFields(templateId).map((f) => [f.id, f.type]))
    const errors = new Set<string>()

    requiredFieldIds.forEach((fieldId) => {
      const value = formValues[fieldId as keyof MemoFormValues]
      const ft = fieldTypeById.get(fieldId)
      if (ft === 'user_multi') {
        if (!isUserMultiValueFilled(String(value ?? ''))) {
          errors.add(fieldId)
        }
      } else if (isInvalidSelectValue(value)) {
        errors.add(fieldId)
      }
    })

    setValidationErrors(errors)
    return errors.size === 0
  }, [formValues, rawApiDocument])

  /** Uploads pending supporting files to S3; returns PATCH attachment JSON strings or null if URL fetch failed. */
  const uploadPendingSupportingFilesAndBuildPatchAttachments = useCallback(
    async (
      toUpload: PendingSupportingUpload[],
      deps: {
        setPendingSupportingUploads: React.Dispatch<React.SetStateAction<PendingSupportingUpload[]>>
        generateSupportingDocumentUploadUrls: {
          mutateAsync: (
            files: Array<{ filename: string; content_type: string }>
          ) => Promise<{ upload_url: string; s3_key: string; content_type: string }[]>
        }
        uploadToS3: (url: string, data: Blob, contentType: string) => Promise<void>
      }
    ): Promise<{ document_data: string; model_document: string } | null> => {
      const { setPendingSupportingUploads, generateSupportingDocumentUploadUrls, uploadToS3 } = deps

      setPendingSupportingUploads((prev) =>
        prev.map((p) => (toUpload.some((u) => u.id === p.id) ? { ...p, isUploading: true } : p))
      )

      const uploadUrls = await fetchUploadUrlsForSupportingFiles(
        toUpload,
        generateSupportingDocumentUploadUrls,
        setPendingSupportingUploads
      )
      if (!uploadUrls) return null

      const s3Results = await uploadSupportingFilesToS3(toUpload, uploadUrls, uploadToS3)
      const { succeeded, failedById } = partitionS3UploadResults(s3Results, toUpload)

      const attachments =
        succeeded.length > 0 ? buildContentPatchAttachmentStrings(succeeded, toUpload) : null

      applyPendingUploadsStateAfterS3(setPendingSupportingUploads, toUpload, s3Results, failedById)

      if (succeeded.length > 0 && succeeded.length < toUpload.length) {
        notify.error({
          title: 'Some uploads failed',
          description:
            'Some supporting documents could not be uploaded. Save will include the successful ones.',
        })
      }

      return attachments ?? { document_data: '', model_document: '' }
    },
    []
  )

  const SaveOrPublish = useCallback(
    async (publish: boolean) => {
      if (publish && !validateForm()) return

      const relevantIds = [...selectedSupportingDocumentIds]
      const toUpload = pendingSupportingUploads.filter((p) => p.file && !p.uploadError)
      let patchAttachments: { document_data: string; model_document: string } | null = null

      if (toUpload.length > 0 && rawApiDocument?.primary_company_id) {
        patchAttachments = await uploadPendingSupportingFilesAndBuildPatchAttachments(toUpload, {
          setPendingSupportingUploads,
          generateSupportingDocumentUploadUrls: generateAttachedDocumentsUploadUrlsMutation,
          uploadToS3,
        })
        if (patchAttachments === null) return
      }

      await saveOrPublishDocument(
        {
          documentId,
          publish,
          formValues,
          rawApiDocument: rawApiDocument ?? undefined,
          relevant_documents: relevantIds.map(Number),
          document_data: patchAttachments?.document_data
            ? patchAttachments.document_data
            : undefined,
          model_document: patchAttachments?.model_document
            ? patchAttachments.model_document
            : undefined,
        },
        {
          updateContent,
          router,
          invalidateDocumentDetail,
          setLoading: publish ? setIsPublishing : setIsSaving,
          processScreenTemplateCharts,
          processInvestmentMemoImages,
          vcpMediaFields: VCP_MEDIA_FIELDS,
          generateUploadUrlsMutation,
          uploadToS3,
        }
      )
    },
    [
      documentId,
      formValues,
      rawApiDocument,
      selectedSupportingDocumentIds,
      pendingSupportingUploads,
      updateContent,
      router,
      invalidateDocumentDetail,
      generateAttachedDocumentsUploadUrlsMutation,
      generateUploadUrlsMutation,
      uploadToS3,
      validateForm,
      uploadPendingSupportingFilesAndBuildPatchAttachments,
    ]
  )

  const handleSaveDraft = useCallback(() => SaveOrPublish(false), [SaveOrPublish])
  const handlePublish = useCallback(() => SaveOrPublish(true), [SaveOrPublish])

  const handleCreateMaintenanceTask = useCallback(() => {
    setShowMaintenanceTaskForm(true)
  }, [])

  const handleCancelMaintenanceTask = useCallback(() => {
    setShowMaintenanceTaskForm(false)
    // Reset form
    setMaintenanceTask({ ...DEFAULT_MAINTENANCE_TASK })
  }, [])

  const handleMaintenanceTaskChange = useCallback(
    (field: string, value: string | string[] | boolean) => {
      setMaintenanceTask((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    []
  )

  const handleSubmitMaintenanceTask = useCallback(async () => {
    if (!companyId || !companyTicker) {
      notify.error({
        title: 'Error',
        description: 'Company information is required to create a maintenance task.',
      })
      return
    }

    if (maintenanceTask.assignees.length !== 2) {
      notify.error({
        title: 'Validation Error',
        description: 'Please select exactly 2 assignees for the maintenance task.',
      })
      return
    }

    try {
      await createTask.mutateAsync({
        company_id: companyId,
        ticker: companyTicker,
        title: maintenanceTask.title || undefined,
        action: maintenanceTask.action,
        due_date: maintenanceTask.dueDate || undefined,
        assignee: maintenanceTask.assignees,
        important: maintenanceTask.important,
        status: maintenanceTask.status,
      })

      notify.success({
        title: 'Maintenance Task Created',
        description: 'The maintenance task has been created successfully.',
      })

      // Reset form and hide it
      handleCancelMaintenanceTask()
    } catch (error) {
      notify.error({
        title: 'Failed to Create Task',
        description: error instanceof Error ? error.message : 'Unable to create maintenance task.',
      })
    }
  }, [companyId, companyTicker, maintenanceTask, createTask, handleCancelMaintenanceTask])

  // Handle send message
  const handleSendMessage = useCallback(
    (query: string) => {
      if (!query.trim()) return

      const numericDocId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId

      const userMessage: ChatMessage = {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      }
      setChatHistory((prev) => [...prev, userMessage])

      sendMessage(
        {
          content_id: numericDocId,
          query: query,
          chat_id: chatId ?? undefined,
        },
        {
          onSuccess: (response) => {
            setChatHistory((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: response.answer,
                timestamp: new Date().toISOString(),
              },
            ])

            // Store chat_id from response for subsequent messages
            if (response.chat_id) {
              setChatId(response.chat_id)
            }
          },
          onError: (error) => {
            setChatHistory((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `Error: ${error.message || 'Failed to get response from AI assistant.'}`,
                timestamp: new Date().toISOString(),
              },
            ])
          },
        }
      )
    },
    [documentId, chatId, sendMessage]
  )

  // Handle retry AI analysis
  const handleRetryAnalysis = useCallback(() => {
    const numericDocId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId
    reprocessDocument(
      { docId: numericDocId, hardReprocess: false },
      {
        onSuccess: () => {
          notify.success({
            title: 'AI Analysis Retried',
            description: 'The document is being reprocessed. This may take a few moments.',
          })
        },
        onError: (error) => {
          notify.error({
            title: 'Failed to Retry Analysis',
            description: error instanceof Error ? error.message : 'Unable to retry AI analysis.',
          })
        },
      }
    )
  }, [documentId, reprocessDocument])

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose()
      return
    }
    router.push('/documents')
  }, [onClose, router])

  // Show error state only when we have an error (not during loading)
  if (error && !isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {error instanceof Error ? error.message : 'Document not found'}
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            The document you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
          </p>
          <Button onClick={handleClose}>Back to Documents</Button>
        </div>
      </div>
    )
  }

  // Render main content based on scenario (without header - header is rendered separately)
  const renderMainContent = () => {
    if (isLoading || !document || !rawApiDocument) {
      return <DocumentPreviewSkeleton />
    }

    // Scenario A: Draft (Template) - Editable Form with view mode styling
    if (scenario === 'draft-template') {
      return (
        <div className="flex-1 overflow-auto p-6" ref={previewRef}>
          <DocumentDraftForm
            document={rawApiDocument}
            formValues={formValues}
            onFieldChange={handleFieldChange}
            validationErrors={validationErrors}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            isSaving={isSaving}
            isPublishing={isPublishing}
            isDraftMode={true}
            useViewModeLayout={true}
            templateImageUrls={templateImageUrls}
            userMultiFieldResources={documentUserMultiFieldResources}
          />
        </div>
      )
    }

    // Scenario B: Published (Template) - Read-only Preview using same form structure
    if (scenario === 'published-template') {
      return (
        <div className="flex-1 overflow-auto p-6" ref={previewRef}>
          <DocumentDraftForm
            document={rawApiDocument}
            formValues={formValues}
            onFieldChange={undefined}
            isViewOnly={true}
            validationErrors={new Set()}
            templateImageUrls={templateImageUrls}
            userMultiFieldResources={documentUserMultiFieldResources}
          />
        </div>
      )
    }

    // Scenario C: Uploaded Document - PDF/File Viewer
    return (
      <div className="flex-1 overflow-hidden" ref={previewRef}>
        <DocumentViewer
          filename={document.file_name || document.filename || document.title}
          mimeType={document.mime_type}
          extractedText={document.extracted_text}
          textExtractionStatus={document.text_extraction_status}
          fileUrlData={fileUrlData}
          isLoadingFileUrl={loadingFileUrl}
        />
      </div>
    )
  }

  // Render sidebar based on scenario
  const renderSidebar = () => {
    if (showSidebarSkeleton) {
      return <DocumentSidebarSkeleton />
    }

    if (!document || !rawApiDocument) {
      return null
    }

    const isPublished = documentStatus === 'PUBLISHED'

    return (
      <div className="flex w-[420px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex-1 overflow-y-auto p-6 pb-24">
          <div className="space-y-4">
            {canCreateTask && !showMaintenanceTaskForm && (
              <div className="space-y-4 border-b border-gray-200 pb-4 dark:border-gray-700">
                <Button
                  onClick={handleCreateMaintenanceTask}
                  disabled={false}
                  className="h-9 w-full justify-center gap-2 rounded-4xl bg-black px-3 py-1 text-sm text-white"
                >
                  <Plus className="size-4" />
                  Create Maintenance Task
                </Button>
              </div>
            )}

            {canCreateTask && showMaintenanceTaskForm && (
              <div className="space-y-4 border-b border-gray-200 pb-4 dark:border-gray-700">
                <MaintenanceTaskForm
                  companyTicker={companyTicker}
                  companyId={companyId || undefined}
                  maintenanceTask={maintenanceTask}
                  analysts={analysts}
                  onTaskChange={handleMaintenanceTaskChange}
                  onCancel={handleCancelMaintenanceTask}
                  onSubmit={handleSubmitMaintenanceTask}
                  isSubmitting={createTask.isPending}
                />
              </div>
            )}

            {isPublished && (
              <div className="border-gray-200 pt-2 dark:border-gray-700">
                <AskAIAssistant
                  documentId={documentId}
                  rawApiDocument={rawApiDocument}
                  chatStatus={chatStatus}
                  isLoadingStatus={isLoadingStatus}
                  statusError={statusError}
                  chatHistory={chatHistory}
                  chatId={chatId}
                  onSendMessage={handleSendMessage}
                  onRetryAnalysis={handleRetryAnalysis}
                  isSendingMessage={isSendingMessage}
                  isRetrying={isRetrying}
                  disableInput={searchParams.get('autoDownload') === 'true'}
                />
              </div>
            )}
            <SupportingDocumentsCard
              isFieldsEnabled={true}
              isViewOnly={isPublished}
              upload={!isPublished ? { onUpload: handleSupportingDocumentUpload } : undefined}
              uploadedFiles={
                !isPublished && pendingSupportingUploads.length > 0
                  ? {
                      files: pendingSupportingUploads.map(
                        ({ id, name, size, type, isUploading, uploadError }) => ({
                          id,
                          name,
                          size,
                          type,
                          isUploading,
                          uploadError,
                        })
                      ),
                      getFileIcon: getSupportingFileIcon,
                      getFileStatusText: getSupportingFileStatusText,
                      onRemoveFile: handleRemovePendingSupportingFile,
                    }
                  : undefined
              }
              attachedDocuments={{
                documents: attachedDocumentsForDisplay,
                onDocumentClick: handleSidebarDocumentRowClick,
                onDownload: handleAttachedDocumentDownload,
              }}
            />

            <SupportingDocumentsCard
              isFieldsEnabled={true}
              isViewOnly={isPublished}
              cardTitle="Model Documents"
              emptyAttachedListMessage={
                isPublished ? 'No model documents' : 'No model documents linked yet'
              }
              archive={
                !isPublished
                  ? {
                      documents: archiveDocumentsForDetail,
                      selectedIds: selectedSupportingDocumentIds,
                      onSelect: handleAddFromArchive,
                      searchPlaceholder: `Search ${document.company || document.ticker || ''} documents...`,
                      showSelectedList: false,
                    }
                  : undefined
              }
              attachedDocuments={{
                documents: modelDocumentsForDisplay,
                onDocumentClick: handleSidebarDocumentRowClick,
                onDownload: handleModelDocumentDownload,
                onRemove: !isPublished ? handleRemoveSupportingDocument : undefined,
              }}
            />

            <DocumentProperties
              document={document}
              tearsheetData={prepareTearsheetData(
                companyId,
                isLoadingTearsheet,
                keyMetrics,
                investmentThesis,
                rawApiData
              )}
              thesisExpanded={thesisExpanded}
              onThesisToggle={() => setThesisExpanded(!thesisExpanded)}
              internalMetricsExpanded={internalMetricsExpanded}
              onInternalMetricsToggle={() => setInternalMetricsExpanded(!internalMetricsExpanded)}
              consensusExpanded={consensusExpanded}
              onConsensusToggle={() => setConsensusExpanded(!consensusExpanded)}
              ticker={companyId && isPublished ? document.ticker || '' : undefined}
              isLoadingTearsheet={isLoadingTearsheet}
            />
          </div>
        </div>
      </div>
    )
  }

  // Don't render header if still loading
  if (isLoading || !document || !rawApiDocument) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <DocumentPreviewSkeleton />
      </div>
    )
  }

  const isDraft = scenario === 'draft-template'
  const isPublished = documentStatus === 'PUBLISHED' || scenario === 'uploaded'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            Archive &gt; Document Details
          </p>
          <div>
            <h1 className="text-[17px] font-bold">
              {document.file_name || document.title || 'Untitled Document'}
            </h1>
          </div>
          <Badge
            variant="outline"
            className="border-blue-500/40 bg-blue-500/15 text-[12px] font-semibold text-blue-700"
          >
            <FileText className="size-7 text-blue-800 first-letter:uppercase" /> Source :{' '}
            {document.source
              ? document.source.charAt(0).toUpperCase() + document.source.slice(1)
              : 'Unknown'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Draft: Show Save and Publish buttons */}
          {isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSaving || isPublishing}
                className="flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                {isSaving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={isSaving || isPublishing}
                className="flex items-center gap-2 bg-black text-white"
              >
                {isPublishing ? <Loader2 className="size-4 animate-spin" /> : null}
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="flex items-center gap-2"
              >
                <X className="size-4" />
              </Button>
            </>
          )}

          {/* Published: Show Download and Close buttons */}
          {isPublished && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-2"
              >
                <Download className="size-4" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="flex items-center gap-2"
              >
                <X className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ===== BODY (LEFT + RIGHT) ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Content */}
        <div className="mb-10 flex flex-1 overflow-hidden">{renderMainContent()}</div>

        {/* Right Sidebar */}
        {renderSidebar()}
      </div>
    </div>
  )
}
