'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { FloatingSideSheetContent } from '@/components/shared/FloatingSideSheet'
import { cn } from '@/lib/utils'
import { AttachmentMultiSelect } from '@/components/shared/AttachmentMultiSelect'
import { AnalystSelectFields } from '@/containers/coverage/components/AnalystSelectFields'
import {
  attachmentMatchesRequirements,
  attachmentsToRecord,
  filterAttachmentsByTokens,
  getCombinedRequirementTokens,
  getMissingRequiredAttachmentTokens,
  type AttachmentQueryInfo,
  type StageAttachment,
  type StageAttachmentType,
} from '@/lib/attachments'
import {
  type ModalMode,
  type CompanyMoveModalProps,
  type MoveToWatchlistFormData,
  type MoveToActiveDiscussionFormData,
  type FormData,
  type AttachmentCollectionsPayload,
} from '@/containers/coverage/lib/types'
import { useUploadDocument } from '@/containers/documents/lib/queries'
import type { ApiDocument } from '@/containers/documents/lib/types'
import notify from '@/lib/notifications'
import { openTemplateInNewTab } from '@/containers/pipeline/lib/helpers'
import { useAttachmentCreatedFromOpener } from '@/containers/pipeline/lib/useAttachmentCreatedListener'


export function CompanyMoveModal({
  isOpen,
  onClose,
  mode,
  companyData,
  titleOverride,
  infoBoxText,
  rationalePlaceholder,
  onSubmit,
  primaryAnalysts = [],
  secondaryAnalysts = [],
  isLoadingPrimaryAnalysts = false,
  isLoadingSecondaryAnalysts = false,
  attachmentRequirements,
  attachmentOptions = [],
  attachmentSearch = '',
  onAttachmentSearchChange,
  attachmentQueryInfo,
  documentOptions = [],
  memoOptions = [],
  documentsQueryInfo,
  memosQueryInfo,
  requiredAttachmentOptions = [],
  isSubmitting = false,
  onAttachmentsRefetch,
}: CompanyMoveModalProps & { isSubmitting?: boolean }) {
  const noopQueryInfo: AttachmentQueryInfo = {
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => {},
    errorMessage: undefined,
  }
  const documentQueryState = documentsQueryInfo ?? noopQueryInfo
  const memoQueryState = memosQueryInfo ?? noopQueryInfo

  const getInitialFormData = (): FormData => {
    if (mode === 'watchlist') {
      return {
        primaryAnalyst: '',
        secondaryAnalyst: '',
        screen: '',
      }
    }
    return {
      reason: '',
    }
  }

  const [formData, setFormData] = useState<FormData>(getInitialFormData())
  const [selectedDocuments, setSelectedDocuments] = useState<StageAttachment[]>([])
  const [selectedMemos, setSelectedMemos] = useState<StageAttachment[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [noteSelectionKeys, setNoteSelectionKeys] = useState<string[]>([])
  const [requiredDocumentIds, setRequiredDocumentIds] = useState<number[]>([])
  const [requiredMemoIds, setRequiredMemoIds] = useState<number[]>([])
  const uploadDocumentMutation = useUploadDocument()
  const handlePrimaryAnalystChange = useCallback(
    (value: string) => {
      setFormData((prev) => {
        if (mode !== 'watchlist') return prev
        const prevData = prev as MoveToWatchlistFormData
        const nextSecondary = prevData.secondaryAnalyst === value ? '' : prevData.secondaryAnalyst
        return {
          ...prevData,
          primaryAnalyst: value,
          secondaryAnalyst: nextSecondary,
        }
      })
      if (errors.primaryAnalyst) {
        setErrors((prev) => ({ ...prev, primaryAnalyst: '' }))
      }
      if (errors.secondaryAnalyst) {
        setErrors((prev) => ({ ...prev, secondaryAnalyst: '' }))
      }
    },
    [errors.primaryAnalyst, errors.secondaryAnalyst, mode]
  )

  const handleSecondaryAnalystChange = useCallback(
    (value: string) => {
      setFormData((prev) => {
        if (mode !== 'watchlist') return prev
        const prevData = prev as MoveToWatchlistFormData
        const nextPrimary = prevData.primaryAnalyst === value ? '' : prevData.primaryAnalyst
        return {
          ...prevData,
          primaryAnalyst: nextPrimary,
          secondaryAnalyst: value,
        }
      })
      if (errors.secondaryAnalyst) {
        setErrors((prev) => ({ ...prev, secondaryAnalyst: '' }))
      }
      if (errors.primaryAnalyst) {
        setErrors((prev) => ({ ...prev, primaryAnalyst: '' }))
      }
    },
    [errors.primaryAnalyst, errors.secondaryAnalyst, mode]
  )
  const handleWatchlistRationaleChange = useCallback(
    (value: string) => {
      if (value.length > 150) return
      setFormData((prev) => ({ ...prev, screen: value }))
      if (errors.screen) {
        setErrors((prev) => ({ ...prev, screen: '' }))
      }
    },
    [errors.screen]
  )

  const handleAttachmentSearchChange = useCallback(
    (value: string) => {
      onAttachmentSearchChange?.(value)
    },
    [onAttachmentSearchChange]
  )
  const attachmentQueryState = useMemo(
    () => ({
      isLoading:
        attachmentQueryInfo?.isLoading ||
        documentsQueryInfo?.isLoading ||
        memosQueryInfo?.isLoading ||
        false,
      isFetchingNextPage:
        attachmentQueryInfo?.isFetchingNextPage ||
        documentsQueryInfo?.isFetchingNextPage ||
        memosQueryInfo?.isFetchingNextPage ||
        false,
      hasNextPage: Boolean(
        attachmentQueryInfo?.hasNextPage ||
          documentsQueryInfo?.hasNextPage ||
          memosQueryInfo?.hasNextPage
      ),
      fetchNextPage: () => {
        attachmentQueryInfo?.fetchNextPage?.()
        documentsQueryInfo?.fetchNextPage?.()
        memosQueryInfo?.fetchNextPage?.()
      },
      errorMessage:
        attachmentQueryInfo?.errorMessage ??
        documentsQueryInfo?.errorMessage ??
        memosQueryInfo?.errorMessage,
    }),
    [attachmentQueryInfo, documentsQueryInfo, memosQueryInfo]
  )
  const mergedAttachmentOptions = useMemo(() => {
    const map = new Map<string, StageAttachment>()
    const shouldSkip = (item: StageAttachment) =>
      item.type === 'memo'
        ? requiredMemoIds.includes(item.id)
        : requiredDocumentIds.includes(item.id)
    attachmentOptions?.forEach((item) => {
      if (shouldSkip(item)) return
      map.set(`${item.type}-${item.id}`, item)
    })
    selectedDocuments.forEach((item) => {
      if (shouldSkip(item)) return
      map.set(`document-${item.id}`, item)
    })
    selectedMemos.forEach((item) => {
      if (shouldSkip(item)) return
      map.set(`memo-${item.id}`, item)
    })
    return Array.from(map.values())
  }, [attachmentOptions, requiredDocumentIds, requiredMemoIds, selectedDocuments, selectedMemos])
  const selectedAttachments = useMemo(
    () => [...selectedDocuments, ...selectedMemos],
    [selectedDocuments, selectedMemos]
  )

  const selectedPrimaryAnalystId =
    mode === 'watchlist' ? (formData as MoveToWatchlistFormData).primaryAnalyst : ''
  const selectedSecondaryAnalystId =
    mode === 'watchlist' ? (formData as MoveToWatchlistFormData).secondaryAnalyst : ''

  const buildAttachmentKey = (type: StageAttachmentType, id: number) => `${type}-${id}`
  const getAttachmentKey = (item: StageAttachment) => buildAttachmentKey(item.type, item.id)
  const selectedNoteAttachments = useMemo(() => {
    if (!noteSelectionKeys.length) return []
    const keySet = new Set(noteSelectionKeys)
    return selectedAttachments.filter((item) => keySet.has(getAttachmentKey(item)))
  }, [selectedAttachments, noteSelectionKeys])
  const requiredTokens = useMemo(
    () => getCombinedRequirementTokens(attachmentRequirements),
    [attachmentRequirements]
  )
  const baseAttachmentOptions = useMemo(
    () =>
      attachmentOptions && attachmentOptions.length
        ? attachmentOptions
        : [...documentOptions, ...memoOptions],
    [attachmentOptions, documentOptions, memoOptions]
  )
  const baseRequiredList = useMemo(
    () =>
      filterAttachmentsByTokens(
        requiredAttachmentOptions && requiredAttachmentOptions.length
          ? requiredAttachmentOptions
          : baseAttachmentOptions,
        requiredTokens
      ),
    [baseAttachmentOptions, requiredAttachmentOptions, requiredTokens]
  )

  const selectedRequiredAttachments = useMemo(
    () =>
      selectedAttachments.filter((item) =>
        item.type === 'memo'
          ? requiredMemoIds.includes(item.id)
          : requiredDocumentIds.includes(item.id)
      ),
    [requiredDocumentIds, requiredMemoIds, selectedAttachments]
  )
  const requiredHelperText =
    requiredTokens.length > 0
      ? `Required: ${requiredTokens.join(', ')}`
      : 'Attach supporting documents for this rationale.'

  const mapApiDocumentToAttachment = (doc: ApiDocument): StageAttachment => {
    const companyIds: Array<string | number> = []
    if (doc.primary_company_id) companyIds.push(doc.primary_company_id)
    doc.company_ids_details?.forEach((item) => {
      if (item?.id) companyIds.push(item.id)
    })

    const ticker =
      doc.primary_company_id_details?.ticker ||
      doc.ticker ||
      (doc.company_ids_details && doc.company_ids_details[0]?.ticker) ||
      null

    return {
      id: doc.id,
      label: doc.title || doc.filename || `Document ${doc.id}`,
      subLabel: doc.category || ticker || 'Document',
      type: 'document',
      documentType: doc.category || undefined,
      ticker,
      companyIds: companyIds.length ? companyIds : undefined,
    }
  }

  const buildAttachmentErrors = () => {
    const attachmentErrors: { attachments?: string } = {}
    const missingTokens = getMissingRequiredAttachmentTokens(
      selectedAttachments,
      attachmentRequirements
    )
    if (missingTokens.length) {
      attachmentErrors.attachments =
        missingTokens.length === 1
          ? `Select the required ${missingTokens[0]} attachment.`
          : `Select attachments for: ${missingTokens.join(', ')}.`
    }

    return attachmentErrors
  }

  const buildAttachmentsPayload = ():
    | {
        documents: AttachmentCollectionsPayload
      }
    | undefined => {
    const documentsPayload = attachmentsToRecord([...selectedDocuments, ...selectedMemos])
    if (!Object.keys(documentsPayload).length) {
      return undefined
    }
    return {
      documents: documentsPayload,
    }
  }

  const handleRequiredMemoSelect = (item: StageAttachment) => {
    handleMemoSelect(item)
    markMemoAsRequired(item.id)
  }

  const requiredAttachmentOptionsList = useAttachmentCreatedFromOpener({
    baseList: baseRequiredList,
    onSelect: handleRequiredMemoSelect,
    onRefetch: onAttachmentsRefetch,
    expectedTicker: companyData?.ticker ?? null,
    expectedCompanyId: companyData?.id ?? null,
  })
  useEffect(() => {
    if (!isOpen) {
      setSelectedDocuments([])
      setSelectedMemos([])
      setNoteSelectionKeys([])
      setRequiredDocumentIds([])
      setRequiredMemoIds([])
      handleAttachmentSearchChange('')
    }
  }, [isOpen, handleAttachmentSearchChange])

  useEffect(() => {
    if (!attachmentRequirements?.documents?.length) return
    setSelectedDocuments((previous) =>
      previous.filter((item) => attachmentMatchesRequirements(item, 'document', attachmentRequirements))
    )
  }, [attachmentRequirements?.documents?.join('|')])

  useEffect(() => {
    if (!attachmentRequirements?.memos?.length) return
    setSelectedMemos((previous) =>
      previous.filter((item) => attachmentMatchesRequirements(item, 'memo', attachmentRequirements))
    )
  }, [attachmentRequirements?.memos?.join('|')])

  useEffect(() => {
    setNoteSelectionKeys((prev) =>
      prev.filter((key) => selectedAttachments.some((item) => getAttachmentKey(item) === key))
    )
    setRequiredDocumentIds((prev) =>
      prev.filter((id) => selectedDocuments.some((item) => item.id === id))
    )
    setRequiredMemoIds((prev) => prev.filter((id) => selectedMemos.some((item) => item.id === id)))
  }, [selectedAttachments, selectedDocuments, selectedMemos])

  const handleSubmit = () => {
    const newErrors: { [key: string]: string } = {}

    if (mode === 'watchlist') {
      const data = formData as MoveToWatchlistFormData
      if (!data.primaryAnalyst) {
        newErrors.primaryAnalyst = 'Primary analyst is required'
      }
      if (!data.secondaryAnalyst) {
        newErrors.secondaryAnalyst = 'Secondary analyst is required'
      }
      if (
        data.primaryAnalyst &&
        data.secondaryAnalyst &&
        data.primaryAnalyst === data.secondaryAnalyst
      ) {
        newErrors.secondaryAnalyst = 'Primary and secondary analysts must be different'
        newErrors.primaryAnalyst = 'Primary and secondary analysts must be different'
      }
      if (!data.screen.trim()) {
        newErrors.screen = 'Rationale is required'
      } else if (data.screen.trim().length < 10) {
        newErrors.screen = 'Rationale must be at least 10 characters'
      }
      if (data.screen.length > 150) {
        newErrors.screen = 'Rationale must be 150 characters or less'
      }
    } else {
      const data = formData as MoveToActiveDiscussionFormData
      if (!data.reason.trim()) {
        newErrors.reason = 'Reason is required'
      } else if (data.reason.trim().length < 10) {
        newErrors.reason = 'Reason must be at least 10 characters'
      } else if (data.reason.length > 150) {
        newErrors.reason = 'Reason must be 150 characters or less'
      }
    }

    const attachmentErrors = buildAttachmentErrors()
    if (attachmentErrors.attachments) {
      newErrors.attachments = attachmentErrors.attachments
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const attachments = buildAttachmentsPayload()

    // Call onSubmit with form data and attachments as separate parameters
    onSubmit(formData, attachments)
  }

  const handleClose = () => {
    setFormData(getInitialFormData())
    setErrors({})
    setSelectedDocuments([])
    setSelectedMemos([])
    setNoteSelectionKeys([])
    handleAttachmentSearchChange('')
    onClose()
  }

  const handleDocumentSelect = (item: StageAttachment) => {
    setSelectedDocuments((prev) => {
      if (prev.some((entry) => entry.id === item.id)) return prev
      return [...prev, item]
    })
    setNoteSelectionKeys((prevKeys) => prevKeys.filter((key) => key !== getAttachmentKey(item)))
    if (errors.attachments) {
      setErrors((prev) => ({ ...prev, attachments: '' }))
    }
  }

  const handleDocumentRemove = (id: number) => {
    setSelectedDocuments((prev) => {
      const removed = prev.find((item) => item.id === id)
      if (removed) {
        setNoteSelectionKeys((prevKeys) =>
          prevKeys.filter((key) => key !== getAttachmentKey(removed))
        )
      }
      return prev.filter((item) => item.id !== id)
    })
    unmarkDocumentAsRequired(id)
  }

  const handleMemoSelect = (item: StageAttachment) => {
    setSelectedMemos((prev) => {
      if (prev.some((entry) => entry.id === item.id)) return prev
      return [...prev, item]
    })
    setNoteSelectionKeys((prevKeys) => prevKeys.filter((key) => key !== getAttachmentKey(item)))
    if (errors.attachments) {
      setErrors((prev) => ({ ...prev, attachments: '' }))
    }
  }

  const handleMemoRemove = (id: number) => {
    setSelectedMemos((prev) => {
      const removed = prev.find((item) => item.id === id)
      if (removed) {
        setNoteSelectionKeys((prevKeys) =>
          prevKeys.filter((key) => key !== getAttachmentKey(removed))
        )
      }
      return prev.filter((item) => item.id !== id)
    })
    unmarkMemoAsRequired(id)
  }

  const markDocumentAsRequired = (id: number) => {
    setRequiredDocumentIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const unmarkDocumentAsRequired = (id: number) => {
    setRequiredDocumentIds((prev) => prev.filter((docId) => docId !== id))
  }

  const markMemoAsRequired = (id: number) => {
    setRequiredMemoIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const unmarkMemoAsRequired = (id: number) => {
    setRequiredMemoIds((prev) => prev.filter((memoId) => memoId !== id))
  }

  const handleRequiredDocumentSelect = (item: StageAttachment) => {
    handleDocumentSelect(item)
    markDocumentAsRequired(item.id)
  }

  const handleRequiredDocumentRemove = (id: number) => {
    handleDocumentRemove(id)
  }

  const handleRequiredMemoRemove = (id: number) => {
    handleMemoRemove(id)
  }

  const handleRequiredAttachmentSelect = useCallback(
    (item: StageAttachment) => {
      if (item.type === 'memo') {
        handleRequiredMemoSelect(item)
      } else {
        handleRequiredDocumentSelect(item)
      }
    },
    [handleRequiredDocumentSelect, handleRequiredMemoSelect]
  )

  const handleRequiredAttachmentRemove = useCallback(
    (item: StageAttachment) => {
      if (item.type === 'memo') {
        handleRequiredMemoRemove(item.id)
      } else {
        handleRequiredDocumentRemove(item.id)
      }
    },
    [handleRequiredDocumentRemove, handleRequiredMemoRemove]
  )

  const handleNoteSelect = (item: StageAttachment) => {
    if (item.type === 'memo' ? requiredMemoIds.includes(item.id) : requiredDocumentIds.includes(item.id)) {
      return
    }
    if (item.type === 'memo') {
      handleMemoSelect(item)
    } else {
      handleDocumentSelect(item)
    }
    setNoteSelectionKeys((prev) => {
      const key = getAttachmentKey(item)
      return prev.includes(key) ? prev : [...prev, key]
    })
  }

  const handleNoteRemove = (item: StageAttachment) => {
    if (item.type === 'memo') {
      if (requiredMemoIds.includes(item.id)) {
        setNoteSelectionKeys((prev) => prev.filter((key) => key !== getAttachmentKey(item)))
        return
      }
      handleMemoRemove(item.id)
    } else {
      if (requiredDocumentIds.includes(item.id)) {
        setNoteSelectionKeys((prev) => prev.filter((key) => key !== getAttachmentKey(item)))
        return
      }
      handleDocumentRemove(item.id)
    }
  }

  const handleUpload = async (category: string, mode: 'required' | 'optional') => {
    if (!companyData?.id) {
      notify.error({
        title: 'Company missing',
        description: 'Unable to upload because company information is missing.',
      })
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept =
      'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      const toastId = notify.loading({
        title: 'Uploading document...',
        description: file.name,
      })
      try {
        const response = await uploadDocumentMutation.mutateAsync({
          file,
          metadata: {
            title: file.name,
            uploaded_by: 'current-user',
            description: `Uploaded ${file.name}`,
            primary_company_id: companyData.id as number,
            company_ids: [],
            actionable: 'NO_ACTION',
            category,
            publish: true,
          },
        })
        const uploaded = mapApiDocumentToAttachment(response.data)
        if (mode === 'required') {
          handleRequiredDocumentSelect(uploaded)
          markDocumentAsRequired(uploaded.id)
        } else {
          handleNoteSelect(uploaded)
        }
        notify.success({
          title: 'Document uploaded',
          description: `${file.name} is ready to attach.`,
        })
        if (onAttachmentsRefetch) {
          await onAttachmentsRefetch()
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed'
        notify.error({ title: 'Upload failed', description: message })
      } finally {
        notify.dismiss(toastId)
      }
    }
    input.click()
  }

  // Get modal configuration based on mode
  const getModalConfig = () => {
    if (mode === 'watchlist') {
      return {
        title: titleOverride || 'Move to Watchlist',
        description:
          titleOverride ||
          `Submit rationale to move ${companyData?.ticker || 'company'} from Universe to Watchlist`,
      }
    } else {
      return {
        title: 'Move to Active Discussion',
        description: `Submit reason to move ${companyData?.ticker || 'company'} from Watchlist to Active Discussion`,
      }
    }
  }

  const config = getModalConfig()

  // Check if all required fields are filled
  const isFormValid = useMemo(() => {
    if (mode === 'watchlist') {
      const data = formData as MoveToWatchlistFormData

      // Check primary and secondary analysts
      if (!data.primaryAnalyst || !data.secondaryAnalyst) {
        return false
      }

      // Check if they are different
      if (data.primaryAnalyst === data.secondaryAnalyst) {
        return false
      }

      // Check rationale minimum length
      if (data.screen.trim().length < 10) {
        return false
      }
    } else {
      const data = formData as MoveToActiveDiscussionFormData

      // Check reason minimum length
      if (data.reason.trim().length < 10) {
        return false
      }
    }

    const missingTokens = getMissingRequiredAttachmentTokens(
      selectedAttachments,
      attachmentRequirements
    )
    if (missingTokens.length > 0) {
      return false
    }

    return true
  }, [mode, formData, selectedAttachments, attachmentRequirements])

  // Disable button when submitting or when form is not valid
  const isSubmitDisabled = isSubmitting || !isFormValid

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <FloatingSideSheetContent side="right" className="flex h-full flex-col p-0">
        <SheetTitle className="sr-only">{config.title}</SheetTitle>
        <SheetDescription className="sr-only">{config.description}</SheetDescription>

        <div className="border-b border-gray-200 px-6 py-4">
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">{config.title}</p>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={`${companyData?.ticker || 'N/A'} - ${companyData?.name || 'Unknown Company'}`}
                disabled
                className="bg-gray-50 text-gray-700"
              />
            </div>

            {infoBoxText ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {infoBoxText}
              </div>
            ) : null}

            {mode === 'watchlist' ? (
              <>
                <AnalystSelectFields
                  primaryAnalysts={primaryAnalysts}
                  secondaryAnalysts={secondaryAnalysts}
                  selectedPrimaryAnalystId={selectedPrimaryAnalystId}
                  selectedSecondaryAnalystId={selectedSecondaryAnalystId}
                  onPrimaryAnalystChange={handlePrimaryAnalystChange}
                  onSecondaryAnalystChange={handleSecondaryAnalystChange}
                  isLoadingPrimaryAnalysts={isLoadingPrimaryAnalysts}
                  isLoadingSecondaryAnalysts={isLoadingSecondaryAnalysts}
                  primaryError={errors.primaryAnalyst}
                  secondaryError={errors.secondaryAnalyst}
                  idPrefix="company-move"
                />

                {requiredTokens.length ? (
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="space-y-1">
                      <AttachmentMultiSelect
                        label="Screening Note"
                        placeholder="Select required attachments..."
                        items={requiredAttachmentOptionsList}
                        selectedItems={selectedRequiredAttachments}
                        onSelectItem={handleRequiredAttachmentSelect}
                        onRemoveItem={handleRequiredAttachmentRemove}
                        searchTerm={attachmentSearch}
                        onSearchTermChange={handleAttachmentSearchChange}
                        isLoading={attachmentQueryState.isLoading}
                        isFetchingNextPage={attachmentQueryState.isFetchingNextPage}
                        hasNextPage={attachmentQueryState.hasNextPage}
                        fetchNextPage={attachmentQueryState.fetchNextPage}
                        errorMessage={attachmentQueryState.errorMessage}
                        helperText={undefined}
                        required
                      />
                      {errors.attachments ? (
                        <p className="text-red-500 text-sm">{errors.attachments}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-gray-500">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span>or</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const token = requiredTokens[0]
                          openTemplateInNewTab(token, 'company-move-modal')
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={uploadDocumentMutation.isPending}
                        onClick={() => handleUpload('SCREEN', 'required')}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why this company should move to active discussion (minimum 10 characters)..."
                  value={(formData as MoveToActiveDiscussionFormData).reason}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.length <= 150) {
                      setFormData((prev) => ({ ...prev, reason: value }))
                      if (errors.reason) {
                        setErrors((prev) => ({ ...prev, reason: '' }))
                      }
                    }
                  }}
                  className="min-h-[120px] resize-none break-words"
                  maxLength={150}
                />
                {errors.reason ? (
                  <p className="text-red-500 text-sm">{errors.reason}</p>
                ) : (
                  <p
                    className={cn(
                      'text-sm font-medium',
                      (formData as MoveToActiveDiscussionFormData).reason.trim().length < 10
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    )}
                  >{`Minimum 10 characters required (max 150) • ${(formData as MoveToActiveDiscussionFormData).reason.length}/150`}</p>
                )}
              </div>
            )}

            {mode === 'watchlist' ? (
              <div className="space-y-2">
                <Label htmlFor="screen">
                  Rationale <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="screen"
                  placeholder={
                    rationalePlaceholder ||
                    'Explain why this company passed the rationale check (minimum 10 characters)...'
                  }
                  value={(formData as MoveToWatchlistFormData).screen}
                  onChange={(e) => handleWatchlistRationaleChange(e.target.value)}
                  className="min-h-20 resize-none break-words"
                  maxLength={150}
                />
                {errors.screen ? (
                  <p className="text-red-500 text-sm">{errors.screen}</p>
                ) : (
                  <p
                    className={cn(
                      'text-sm font-medium',
                      (formData as MoveToWatchlistFormData).screen.trim().length < 10
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    )}
                  >{`Minimum 10 characters required • ${(formData as MoveToWatchlistFormData).screen.length}/150`}</p>
                )}
              </div>
            ) : null}

            {mode !== 'watchlist' && requiredTokens.length ? (
              <>
                <AttachmentMultiSelect
                  label="Required Attachments"
                  placeholder="Select required attachments..."
                  items={requiredAttachmentOptionsList}
                  selectedItems={selectedRequiredAttachments}
                  onSelectItem={handleRequiredAttachmentSelect}
                  onRemoveItem={handleRequiredAttachmentRemove}
                  searchTerm={attachmentSearch}
                  onSearchTermChange={handleAttachmentSearchChange}
                  isLoading={attachmentQueryState.isLoading}
                  isFetchingNextPage={attachmentQueryState.isFetchingNextPage}
                  hasNextPage={attachmentQueryState.hasNextPage}
                  fetchNextPage={attachmentQueryState.fetchNextPage}
                  errorMessage={attachmentQueryState.errorMessage}
                  helperText={requiredHelperText}
                  required
                />
                {errors.attachments ? (
                  <p className="text-red-500 text-sm">{errors.attachments}</p>
                ) : null}
              </>
            ) : null}

            <AttachmentMultiSelect
              label="Documents & Notes (optional)"
              placeholder="Search documents or memos"
              items={mergedAttachmentOptions}
              selectedItems={selectedNoteAttachments}
              onSelectItem={handleNoteSelect}
              onRemoveItem={handleNoteRemove}
              searchTerm={attachmentSearch}
              onSearchTermChange={handleAttachmentSearchChange}
              isLoading={attachmentQueryState.isLoading}
              isFetchingNextPage={attachmentQueryState.isFetchingNextPage}
              hasNextPage={attachmentQueryState.hasNextPage}
              fetchNextPage={attachmentQueryState.fetchNextPage}
              errorMessage={attachmentQueryState.errorMessage}
              helperText="Optional supporting documents or notes."
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              disabled={uploadDocumentMutation.isPending}
              onClick={() => handleUpload('MISCELLANEOUS', 'optional')}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>

            <div className="space-y-2">
              <Label htmlFor="approver">Approver</Label>
              <Input
                id="approver"
                value="Lead Investor (Portfolio Manager)"
                disabled
                className="bg-gray-50 text-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex w-full justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </FloatingSideSheetContent>
    </Sheet>
  )
}
