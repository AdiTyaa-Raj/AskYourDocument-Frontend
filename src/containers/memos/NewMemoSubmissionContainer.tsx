'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search as SearchIcon, ArrowLeft } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppSelector } from '@/store'
import { DataTable, type SortConfig } from '@/components/shared/DataTable'
import { TableSkeletonLoader } from '@/components/shared/table-skeleton-loader'
import { getMemoColumns, MemoTableData } from '@/lib/tableColumns'
import notify from '@/lib/notifications'
import { sortData, getApiErrorDetail } from '@/lib/utils'

import { TemplateSelectionContainer } from '@/containers/memos/TemplateSelectionContainer'
import { MemoFormView } from '@/containers/memos/components/MemoFormView'
import { memoTemplates, generateMemoTitle } from '@/containers/memos/lib/templates'
import {
  buildMemoAttachmentStrings,
  buildUploadedFile,
  clearFormValues,
  getRequiredFieldIds,
  getTemplateFields,
  templateIdToApiType,
  formValuesToApiData,
  apiTypeToTemplateId,
  addCompanyToCache,
  processInvestmentMemoImages,
  processScreenTemplateCharts,
  uploadPendingFiles,
  VCP_MEDIA_FIELDS,
  isScreenNumericFieldInvalid,
} from '@/containers/memos/lib/helpers'
import {
  coerceMemoDataUserMultiFields,
  isUserMultiValueFilled,
} from '@/containers/memos/lib/user-multi-field'
import {
  useMemos,
  useCreateMemo,
  useMemo as useMemoQuery,
  useUpdateMemo,
  useUniverseCompanies,
  useSubmitMemo,
  useResubmitMemo,
  useReprocessMemo,
  useMaintenanceAnalysts,
  useGenerateTemplateDataUploadUrls,
  useGenerateAttachedDocumentsUploadUrls,
  useGenerateModelDocumentUploadUrl,
  useUploadToS3,
} from '@/containers/memos/lib/queries'
import { useCompaniesById } from '@/lib/hooks/useCompaniesById'
import { useOrgUsersInfinite } from '@/lib/hooks/useOrgUsersInfinite'
import { usersService } from '@/services/api/users.service'
import { getCountryFromExchange } from '@/containers/memos/lib/helpers'
import type {
  MemoFormValues,
  MemoTemplate,
  MemoTemplateId,
  UploadedFile,
  CreateMemoPayload,
  ViewState,
  MemoSubmissionContainerProps,
  CompanyOption,
  SelectedCompanyData,
  TemplateDataUploadUrlResponse,
  MemoUserMultiFieldResources,
  TemplateUserMentionPickerData,
} from '@/containers/memos/lib/types'
import {
  MEMO_TYPE_FILTER_OPTIONS,
  MEMO_STATUS_FILTER_OPTIONS,
} from '@/containers/memos/lib/constants'

// Reusable helper to process template images based on template type
async function processTemplateImages(
  templateId: MemoTemplateId,
  formValues: MemoFormValues,
  generateUploadUrls: (
    files: Array<{ filename: string; content_type: string }>
  ) => Promise<TemplateDataUploadUrlResponse[]>,
  uploadToS3: (url: string, data: Blob, contentType: string) => Promise<void>
): Promise<MemoFormValues> {
  if (templateId === 'investment-memo') {
    return processInvestmentMemoImages(formValues, generateUploadUrls, uploadToS3)
  }
  if (templateId === 'vcp-screen') {
    return processInvestmentMemoImages(formValues, generateUploadUrls, uploadToS3, VCP_MEDIA_FIELDS)
  }
  if (templateId === 'screen') {
    return processScreenTemplateCharts(formValues, generateUploadUrls, uploadToS3)
  }
  return formValues
}

function buildCreateMemoPayload(
  title: string,
  templateId: MemoTemplateId,
  primaryCompanyId: number,
  templateDataString: string,
  companyIdsAsNumbers: number[],
  publish: boolean,
  maintenanceDataString: string | null,
  documentDataString: string | null,
  modelDocumentString: string | null
): CreateMemoPayload {
  return {
    title,
    primary_company_id: primaryCompanyId,
    category: templateIdToApiType(templateId),
    template_data: templateDataString,
    company_ids: companyIdsAsNumbers,
    relevant_documents: [],
    publish,
    ...(maintenanceDataString && { maintenance_data: maintenanceDataString }),
    ...(documentDataString && { document_data: documentDataString }),
    ...(modelDocumentString && { model_document: modelDocumentString }),
  }
}

export function NewMemoSubmissionContainer({
  templateId,
  memoId,
  mode,
}: MemoSubmissionContainerProps = {}) {
  const authUser = useAppSelector((state) => state.auth?.user)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Check if we need to open a memo in view mode from approvals
  const viewMemoId = searchParams.get('viewMemo')

  const [view, setView] = useState<ViewState>('list')
  const [showTemplateSelection, setShowTemplateSelection] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<MemoTemplate | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null })

  const [formValues, setFormValues] = useState<MemoFormValues>(() => clearFormValues())
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [customMemoTitle, setCustomMemoTitle] = useState<string>('')
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState(false)
  const [selectedCompanyData, setSelectedCompanyData] = useState<SelectedCompanyData | null>(null)
  // Store company details from memo API to avoid extra API calls in edit/view mode
  const [memoCompanyDetails, setMemoCompanyDetails] = useState<CompanyOption[]>([])

  // Maintenance task state
  const [maintenanceTask, setMaintenanceTask] = useState({
    title: '',
    action: '',
    dueDate: '',
    assignees: [] as string[],
    important: false,
    status: 'TODO' as 'TODO' | 'INPROGRESS' | 'DONE',
  })

  // API hooks - only fetch memos when in list view (not when creating/editing a memo)
  const shouldFetchMemos = view === 'list' && !templateId && !memoId
  const { data: memosData, isLoading: isLoadingMemos } = useMemos((page - 1) * pageSize, pageSize, {
    enabled: shouldFetchMemos,
  })
  const { data: universeTableData } = useUniverseCompanies(0, 100, '', view === 'list')
  const { data: editingMemo, isLoading: isLoadingMemo } = useMemoQuery(editingMemoId || '', {
    enabled: !!editingMemoId,
  })

  // Fetch analysts for maintenance task assignee selection (only when form is open)
  const shouldFetchAnalysts = view === 'form' || view === 'view'
  const { data: analysts = [] } = useMaintenanceAnalysts(shouldFetchAnalysts)

  // Fetch company details for preloading in the form
  const selectedCompanyIds = useMemo(() => {
    const ids: string[] = []
    if (formValues.primaryCompany) {
      ids.push(formValues.primaryCompany)
    }
    if (Array.isArray(formValues.company)) {
      ids.push(...formValues.company)
    }
    return ids
  }, [formValues.primaryCompany, formValues.company])

  const shouldFetchCompanies =
    selectedCompanyIds.length > 0 && memoCompanyDetails.length === 0 && !isLoadingMemo
  const { data: fetchedCompanies = [] } = useCompaniesById(selectedCompanyIds, shouldFetchCompanies)

  // Use memo company details if available (edit/view mode), otherwise use fetched companies
  const preloadedCompanies = useMemo(() => {
    return memoCompanyDetails.length > 0 ? memoCompanyDetails : fetchedCompanies
  }, [memoCompanyDetails, fetchedCompanies])

  const createMemoMutation = useCreateMemo()
  const updateMemoMutation = useUpdateMemo()
  const submitMemoMutation = useSubmitMemo()
  const resubmitMemoMutation = useResubmitMemo()
  const reprocessMemoMutation = useReprocessMemo()
  const generateUploadUrlsMutation = useGenerateTemplateDataUploadUrls()
  const generateAttachedDocumentsUploadUrlsMutation = useGenerateAttachedDocumentsUploadUrls()
  const generateModelDocumentUploadUrlMutation = useGenerateModelDocumentUploadUrl()
  const uploadToS3Mutation = useUploadToS3()

  // Wrapper function for uploadToS3 that matches the signature expected by helpers
  const uploadToS3 = useCallback(
    async (presignedUrl: string, data: Blob | File, contentType: string) => {
      await uploadToS3Mutation.mutateAsync({ presignedUrl, data, contentType })
    },
    [uploadToS3Mutation]
  )

  // Transform company data for table columns
  const universeCompaniesData = useMemo(() => {
    if (!universeTableData) return undefined
    return {
      companies: universeTableData.companies.map((row) => ({
        id: String(row.id),
        ticker: row.ticker,
        name: row.securityDescription,
      })),
      total: universeTableData.total,
    }
  }, [universeTableData])

  const fields = useMemo(
    () => getTemplateFields(selectedTemplate?.id as MemoTemplateId | undefined),
    [selectedTemplate?.id]
  )

  const templateHasUserMulti = useMemo(() => fields.some((f) => f.type === 'user_multi'), [fields])
  const enableUserMentionQuery = view === 'form' && templateHasUserMulti
  const {
    data: orgUserPages,
    isLoading: orgUsersLoading,
    isFetchingNextPage: orgUsersFetchingNext,
    hasNextPage: orgUsersHasNext,
    fetchNextPage: orgUsersFetchNext,
    isError: orgUsersError,
  } = useOrgUsersInfinite(enableUserMentionQuery)

  const mentionUsersFlat = useMemo(() => {
    const pages = orgUserPages?.pages ?? []
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
  }, [orgUserPages?.pages])

  const userMentionPicker = useMemo<TemplateUserMentionPickerData>(
    () => ({
      users: mentionUsersFlat,
      isLoading: orgUsersLoading,
      isError: orgUsersError,
      isFetchingNextPage: orgUsersFetchingNext,
      hasNextPage: orgUsersHasNext,
      fetchNextPage: orgUsersFetchNext,
    }),
    [
      mentionUsersFlat,
      orgUsersLoading,
      orgUsersError,
      orgUsersFetchingNext,
      orgUsersHasNext,
      orgUsersFetchNext,
    ]
  )

  const fetchUsersByIds = useCallback((ids: number[]) => usersService.getUsersByIds(ids), [])

  const userMultiFieldResources = useMemo<MemoUserMultiFieldResources>(
    () => ({
      fetchUsersByIds,
      mentionPicker: userMentionPicker,
    }),
    [fetchUsersByIds, userMentionPicker]
  )

  // Always fetch full company details (including stage and analysts)
  const primaryCompanyIds = useMemo(() => {
    return formValues.primaryCompany ? [formValues.primaryCompany] : []
  }, [formValues.primaryCompany])

  const { data: primaryCompanyData = [] } = useCompaniesById(primaryCompanyIds, true)

  // Get full primary company details (including stage and analysts)
  // Always use primaryCompanyData if available (it has full details including stage)
  const primaryCompanyDetails = useMemo(() => {
    return primaryCompanyData.length > 0 ? primaryCompanyData[0] : null
  }, [primaryCompanyData])

  // Check if maintenance task can be created (only for WATCHLIST or INVESTED stages)
  const canCreateMaintenanceTask = useMemo(() => {
    if (!primaryCompanyDetails?.stage) return false
    const slug = primaryCompanyDetails.stage.slug
    return slug === 'WATCHLIST' || slug === 'INVESTED'
  }, [primaryCompanyDetails])
  const showMaintenanceWarning =
    Boolean(formValues.primaryCompany) &&
    Boolean(primaryCompanyDetails) &&
    !canCreateMaintenanceTask

  // Get company analysts for auto-populating assignees
  const companyAnalysts = useMemo(() => {
    if (!primaryCompanyDetails) return []
    const analysts: string[] = []
    if (primaryCompanyDetails.primary_analyst) {
      analysts.push(String(primaryCompanyDetails.primary_analyst.id))
    }
    if (primaryCompanyDetails.secondary_analyst) {
      analysts.push(String(primaryCompanyDetails.secondary_analyst.id))
    }
    return analysts
  }, [primaryCompanyDetails])

  // Update selected company data when primary company data is loaded
  useEffect(() => {
    if (primaryCompanyData.length > 0) {
      const company = primaryCompanyData[0]
      // Update with basic info for title generation
      setSelectedCompanyData({ id: company.id, ticker: company.ticker, name: company.name })
    }
  }, [primaryCompanyData])

  // Auto-disable maintenance task toggle when company changes to one that doesn't support it
  useEffect(() => {
    if (!canCreateMaintenanceTask && formValues.createMaintenanceTask) {
      setFormValues((prev: MemoFormValues) => ({
        ...prev,
        createMaintenanceTask: false,
      }))
      setMaintenanceTask({
        title: '',
        action: '',
        dueDate: '',
        assignees: [],
        important: false,
        status: 'TODO',
      })
    }
  }, [canCreateMaintenanceTask, formValues.createMaintenanceTask])

  // Get company data for title - use selected data or API data
  const companyOptionsForTitle = useMemo(() => {
    if (!formValues.primaryCompany) return []
    if (selectedCompanyData && selectedCompanyData.id === formValues.primaryCompany) {
      return [selectedCompanyData]
    }
    return []
  }, [formValues.primaryCompany, selectedCompanyData])

  const autoGeneratedTitle = useMemo(
    () =>
      generateMemoTitle(
        selectedTemplate ?? undefined,
        formValues.primaryCompany ? [formValues.primaryCompany] : [],
        companyOptionsForTitle.length > 0 ? companyOptionsForTitle : undefined
      ),
    [formValues.primaryCompany, selectedTemplate, companyOptionsForTitle]
  )

  const memoTitle = useMemo(() => {
    if (isTitleManuallyEdited) {
      return customMemoTitle
    }
    return autoGeneratedTitle
  }, [isTitleManuallyEdited, customMemoTitle, autoGeneratedTitle])

  useEffect(() => {
    if (!isTitleManuallyEdited) {
      setCustomMemoTitle(autoGeneratedTitle)
    }
  }, [autoGeneratedTitle, isTitleManuallyEdited])

  // Filter and search memos
  const filteredMemos = useMemo(() => {
    const memos = memosData?.memos ?? []
    let filtered = memos

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((m) => m.title.toLowerCase().includes(q))
    }

    if (typeFilter !== 'All Types') {
      filtered = filtered.filter((m) => m.type === typeFilter)
    }

    if (statusFilter !== 'All Status') {
      filtered = filtered.filter((m) => m.status === statusFilter.toUpperCase())
    }

    filtered = sortData(
      filtered as unknown as Record<string, unknown>[],
      sortConfig
    ) as unknown as typeof filtered

    return filtered
  }, [memosData?.memos, searchQuery, typeFilter, statusFilter, sortConfig])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, typeFilter, statusFilter])

  const loadMemoData = useCallback((memo: typeof editingMemo) => {
    if (!memo) return

    const primaryCompanyId = memo.primary_company_id ? String(memo.primary_company_id) : undefined
    const companyIds = Array.isArray(memo.company_ids)
      ? memo.company_ids.map((id) => String(id))
      : []

    const uiTemplateId = apiTypeToTemplateId(memo.template_type)
    const rawData = { ...((memo.data as Record<string, unknown>) || {}) }
    const dataForForm = uiTemplateId
      ? coerceMemoDataUserMultiFields(uiTemplateId, rawData)
      : rawData

    const newFormValues: MemoFormValues = {
      primaryCompany: primaryCompanyId,
      company: companyIds,
    }
    for (const [k, v] of Object.entries(dataForForm)) {
      if (k === 'primaryCompany' || k === 'company') continue
      if (v === null || v === undefined) continue
      if (typeof v === 'string') {
        newFormValues[k] = v
      } else if (typeof v === 'boolean' || typeof v === 'number') {
        newFormValues[k] = String(v)
      } else {
        newFormValues[k] = JSON.stringify(v)
      }
    }
    setFormValues(newFormValues)

    setCustomMemoTitle(memo.title || '')
    setIsTitleManuallyEdited(true)

    const template = memoTemplates.find((t) => t.id === uiTemplateId)
    if (template) {
      setSelectedTemplate(template)
    }

    // Extract company details from memo response to avoid extra API calls
    const companyDetails: CompanyOption[] = []

    // Add primary company details if available
    if (memo.primary_company_id_details) {
      companyDetails.push({
        id: String(memo.primary_company_id_details.id),
        ticker: memo.primary_company_id_details.ticker,
        name: memo.primary_company_id_details.name || memo.primary_company_id_details.ticker,
      })

      // Set primary company data for title generation
      setSelectedCompanyData({
        id: String(memo.primary_company_id_details.id),
        ticker: memo.primary_company_id_details.ticker,
        name: memo.primary_company_id_details.name || memo.primary_company_id_details.ticker,
      })
    }

    // Add company ticker details if available
    if (memo.company_ids_details && Array.isArray(memo.company_ids_details)) {
      memo.company_ids_details.forEach((company) => {
        companyDetails.push({
          id: String(company.id),
          ticker: company.ticker,
          name: company.name || company.ticker,
        })
      })
    }

    // Set the company details to be used as preloaded companies
    setMemoCompanyDetails(companyDetails)
    setValidationErrors(new Set())
  }, [])

  useEffect(() => {
    if (editingMemo && !isLoadingMemo) {
      loadMemoData(editingMemo)
    }
  }, [editingMemo, isLoadingMemo, loadMemoData])

  useEffect(() => {
    if (viewMemoId && !editingMemoId) {
      setEditingMemoId(viewMemoId)
      setView('view')
      router.replace('/research-updates', { scroll: false })
    }
  }, [viewMemoId, editingMemoId, router])

  const resetForm = useCallback(() => {
    setFormValues(clearFormValues())
    setUploadedFiles([])
    setValidationErrors(new Set())
    setIsDragging(false)
    setEditingMemoId(null)
    setCustomMemoTitle('')
    setIsTitleManuallyEdited(false)
    setSelectedCompanyData(null)
    setMemoCompanyDetails([])
    setMaintenanceTask({
      title: '',
      action: '',
      dueDate: '',
      assignees: [],
      important: false,
      status: 'TODO' as 'TODO' | 'INPROGRESS' | 'DONE',
    })
  }, [])

  useEffect(() => {
    if (templateId) {
      const template = memoTemplates.find((t) => t.id === templateId)
      if (template) {
        setSelectedTemplate(template)
        resetForm()
        setView('form')
      } else {
        router.replace('/research-updates')
      }
    }
  }, [templateId, router, resetForm])

  useEffect(() => {
    if (memoId && mode) {
      setEditingMemoId(memoId)
      setView(mode === 'edit' ? 'form' : 'view')
      setValidationErrors(new Set())
    }
  }, [memoId, mode])

  const handleTemplateSelect = useCallback(
    (template: MemoTemplate) => {
      router.push(`/research-updates/template/${template.id}`)
    },
    [router]
  )

  const handleBackToList = useCallback(() => {
    router.push('/research-updates')
  }, [router])

  const handleCreateMemo = useCallback(() => {
    // Navigate to template selection page
    setShowTemplateSelection(true)
    setView('list') // Keep as list but will show template selection
  }, [])

  const handleAddCompanyToCache = useCallback((companyData: CompanyOption) => {
    setMemoCompanyDetails((prev) => addCompanyToCache(prev, companyData))
  }, [])

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormValues((prev: MemoFormValues) => ({
      ...prev,
      [fieldId]: value,
    }))

    setValidationErrors((prev: Set<string>) => {
      if (!prev.has(fieldId)) return prev
      if (value && value.trim().length > 0) {
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      }
      return prev
    })
  }, [])

  const handlePrimaryCompanyChange = useCallback(
    (companyId: string | undefined, companyData?: SelectedCompanyData) => {
      setFormValues((prev: MemoFormValues) => {
        const newValues: MemoFormValues = {
          ...prev,
          primaryCompany: companyId,
        }

        // Auto-populate fields from company data for screen template
        if (companyData && selectedTemplate?.id === 'screen') {
          // Auto-populate ticker and name
          if (companyData.ticker) {
            newValues.ticker = companyData.ticker
          }
          if (companyData.name) {
            newValues.companyName = companyData.name
          }

          // Auto-populate country with mapped country name from exchange code (e.g., "HK" -> "Hong Kong")
          if (companyData.exchange) {
            const country = getCountryFromExchange(companyData.exchange)
            if (country) {
              newValues.country = country
            }
          }
        }

        return newValues
      })

      if (companyData) {
        setSelectedCompanyData(companyData)
        handleAddCompanyToCache(companyData)
      } else if (!companyId) {
        setSelectedCompanyData(null)
      }

      setIsTitleManuallyEdited(false)

      if (companyId) {
        setValidationErrors((prev: Set<string>) => {
          const next = new Set(prev)
          next.delete('primaryCompany')
          return next
        })
      }
    },
    [handleAddCompanyToCache, selectedTemplate]
  )

  const handleCompanyChange = useCallback(
    (companyIds: string[], companyData?: CompanyOption) => {
      setFormValues((prev: MemoFormValues) => ({
        ...prev,
        company: companyIds,
      }))

      if (companyData) {
        handleAddCompanyToCache(companyData)
      }
    },
    [handleAddCompanyToCache]
  )

  const handleMaintenanceTaskToggle = useCallback(
    (enabled: boolean) => {
      setFormValues((prev: MemoFormValues) => ({
        ...prev,
        createMaintenanceTask: enabled,
      }))

      if (enabled) {
        setValidationErrors(new Set())
        // Auto-populate assignees with company's analysts
        setMaintenanceTask((prev) => ({
          ...prev,
          assignees: companyAnalysts.length === 2 ? companyAnalysts : [],
        }))
      } else {
        // Reset maintenance task data when disabled
        setMaintenanceTask({
          title: '',
          action: '',
          dueDate: '',
          assignees: [],
          important: false,
          status: 'TODO',
        })
      }
    },
    [companyAnalysts]
  )

  const handleMaintenanceTaskChange = useCallback(
    (field: string, value: string | string[] | boolean) => {
      setMaintenanceTask((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    []
  )

  const handleFilesUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    // Create file entries - upload will happen on save/publish
    const newFiles = Array.from(files).map((file) => ({
      ...buildUploadedFile(file),
      isUploading: false,
    }))

    // Add files to state to show them in the UI
    setUploadedFiles((prev: UploadedFile[]) => [...prev, ...newFiles])
  }, [])

  const handleModelUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    const newFiles = Array.from(files).map((file) => ({
      ...buildUploadedFile(file),
      type: 'Model' as const,
      isUploading: false,
    }))

    setUploadedFiles((prev: UploadedFile[]) => [...prev, ...newFiles])
  }, [])

  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadedFiles((prev: UploadedFile[]) =>
      prev.filter((file: UploadedFile) => file.id !== fileId)
    )
  }, [])

  const validateForm = useCallback(() => {
    if (!selectedTemplate) return false

    const fieldDefs = getTemplateFields(selectedTemplate.id)
    const fieldTypeById = new Map(fieldDefs.map((f) => [f.id, f.type]))

    const requiredFieldIds = new Set<string>([
      'primaryCompany',
      ...getRequiredFieldIds(selectedTemplate.id),
    ])
    const errors = new Set<string>()

    requiredFieldIds.forEach((fieldId) => {
      if (fieldId === 'primaryCompany') {
        if (!formValues.primaryCompany) {
          errors.add(fieldId)
        }
      } else {
        const value = formValues[fieldId]
        const fType = fieldTypeById.get(fieldId)
        if (fType === 'user_multi') {
          if (!isUserMultiValueFilled(String(value ?? ''))) {
            errors.add(fieldId)
          }
          return
        }
        // Check if value is empty, whitespace, or a placeholder value like "Select..."
        const isInvalid =
          !value ||
          (typeof value === 'string' &&
            (value.trim().length === 0 ||
              value.toLowerCase().startsWith('select') ||
              value === '...'))

        if (isInvalid) {
          errors.add(fieldId)
        }
      }
    })

    // Additional numeric validation for Screen template fields
    if (selectedTemplate.id === 'screen') {
      Object.entries(formValues).forEach(([fieldId, value]) => {
        if (isScreenNumericFieldInvalid(fieldId, value)) {
          errors.add(fieldId)
        }
      })
    }

    setValidationErrors(errors)
    return errors.size === 0
  }, [formValues, selectedTemplate])

  const prepareAndProcessMemoData = useCallback(async () => {
    // Process images for templates before converting to API data
    const processedFormValues = await processTemplateImages(
      selectedTemplate!.id,
      formValues,
      generateUploadUrlsMutation.mutateAsync,
      uploadToS3
    )

    const uploadedFilesWithS3Keys = await uploadPendingFiles(
      uploadedFiles,
      {
        generateAttachedDocumentsUploadUrls:
          generateAttachedDocumentsUploadUrlsMutation.mutateAsync,
        generateModelDocumentUploadUrl: (filename, content_type) =>
          generateModelDocumentUploadUrlMutation.mutateAsync({ filename, content_type }),
      },
      uploadToS3
    )

    const { document_data, model_document } = buildMemoAttachmentStrings(uploadedFilesWithS3Keys)

    // Convert template data to JSON string
    const templateDataObject = formValuesToApiData(processedFormValues)
    const templateDataString = JSON.stringify(templateDataObject)
    // Build maintenance_data if maintenance task is enabled
    const maintenanceDataString =
      formValues.createMaintenanceTask && maintenanceTask.title
        ? JSON.stringify({
            title: maintenanceTask.title,
            action: maintenanceTask.action,
            due_date: maintenanceTask.dueDate,
            assignee: maintenanceTask.assignees,
            important: maintenanceTask.important,
            status: maintenanceTask.status,
          })
        : null

    return {
      processedFormValues,
      templateDataObject,
      templateDataString,
      documentDataString: document_data,
      modelDocumentString: model_document,
      maintenanceDataString,
    }
  }, [
    selectedTemplate,
    formValues,
    uploadedFiles,
    maintenanceTask,
    generateUploadUrlsMutation,
    generateAttachedDocumentsUploadUrlsMutation,
    generateModelDocumentUploadUrlMutation,
    uploadToS3,
  ])

  const handleSaveAsDraft = useCallback(async () => {
    if (!selectedTemplate || !authUser) {
      notify.error({
        title: 'Missing Information',
        description: 'Please ensure you are logged in and have selected a template.',
      })
      return
    }

    if (!formValues.primaryCompany) {
      notify.error({
        title: 'Primary Company Required',
        description: 'Please select a primary company before saving.',
      })
      return
    }

    setValidationErrors(new Set())
    setIsSubmitting(true)

    try {
      const primaryCompanyId = parseInt(formValues.primaryCompany, 10)
      const companyIds = (formValues.company as string[]) || []
      const companyIdsAsNumbers = companyIds.map((id) => parseInt(id, 10))

      const { templateDataString, documentDataString, modelDocumentString, maintenanceDataString } =
        await prepareAndProcessMemoData()

      const payload = buildCreateMemoPayload(
        memoTitle,
        selectedTemplate.id,
        primaryCompanyId,
        templateDataString,
        companyIdsAsNumbers,
        false,
        maintenanceDataString,
        documentDataString,
        modelDocumentString
      )

      if (editingMemoId) {
        await updateMemoMutation.mutateAsync({
          memoId: editingMemoId,
          data: payload,
        })
        notify.success({
          title: 'Memo Updated',
          description: 'Your memo has been updated successfully.',
        })
        handleBackToList()
      } else {
        await createMemoMutation.mutateAsync(payload)
        notify.success({
          title: 'Memo Saved as Draft',
          description: `${selectedTemplate.name} has been saved as a draft.`,
        })
        setTimeout(() => {
          router.push('/documents')
        }, 1000)
      }
    } catch (error) {
      const errorMessage =
        getApiErrorDetail(error) ||
        (error instanceof Error ? error.message : 'Failed to save memo. Please try again.')
      console.error('Memo creation error:', error)
      notify.error({
        title: 'Failed to Save Memo',
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    selectedTemplate,
    authUser,
    formValues,
    editingMemoId,
    createMemoMutation,
    updateMemoMutation,
    handleBackToList,
    router,
    prepareAndProcessMemoData,
    memoTitle,
  ])

  const handleConfirmSubmit = useCallback(async () => {
    if (!selectedTemplate || !authUser) return

    if (!formValues.primaryCompany) {
      notify.error({
        title: 'Primary Company Required',
        description: 'Please select a primary company before publishing.',
      })
      return
    }

    // Validate maintenance task if enabled (Rule of Two)
    if (formValues.createMaintenanceTask) {
      if (maintenanceTask.assignees.length !== 2) {
        notify.error({
          title: 'Assignees Required',
          description: 'Maintenance tasks require exactly 2 assignees (Rule of Two).',
        })
        return
      }
      if (!maintenanceTask.title || !maintenanceTask.action || !maintenanceTask.dueDate) {
        notify.error({
          title: 'Maintenance Task Incomplete',
          description: 'Please fill in all required maintenance task fields.',
        })
        return
      }
    }

    setIsSubmitting(true)
    setIsPublishing(true)

    try {
      const primaryCompanyId = parseInt(formValues.primaryCompany, 10)

      if (editingMemoId && editingMemo) {
        const { processedFormValues } = await prepareAndProcessMemoData()
        const isRejected = editingMemo.status === 'REJECTED'

        if (isRejected) {
          await resubmitMemoMutation.mutateAsync({
            memoId: editingMemoId,
            data: formValuesToApiData(processedFormValues),
          })
          notify.success({
            title: 'Memo Resubmitted',
            description: `${selectedTemplate.name} has been resubmitted for approval.`,
          })
        } else {
          await submitMemoMutation.mutateAsync(editingMemoId)
          notify.success({
            title: 'Memo Submitted for Approval',
            description: `${selectedTemplate.name} has been sent to the approval queue.`,
          })
        }
        handleBackToList()
      } else {
        // Create and publish new memo directly
        const companyIds = (formValues.company as string[]) || []
        const companyIdsAsNumbers = companyIds.map((id) => parseInt(id, 10))

        const {
          templateDataString,
          documentDataString,
          modelDocumentString,
          maintenanceDataString,
        } = await prepareAndProcessMemoData()

        const payload = buildCreateMemoPayload(
          memoTitle,
          selectedTemplate.id,
          primaryCompanyId,
          templateDataString,
          companyIdsAsNumbers,
          true,
          maintenanceDataString,
          documentDataString,
          modelDocumentString
        )

        const response = await createMemoMutation.mutateAsync(payload)
        const fromParam = searchParams.get('from')
        const openedFromModal =
          typeof window !== 'undefined' &&
          (fromParam === 'company-move-modal' || fromParam === 'stage-move-dialog') &&
          window.opener &&
          !window.opener.closed

        if (openedFromModal && response?.data?.id != null) {
          const memo = response.data
          const categoryForOpener = memo.template_type ?? templateIdToApiType(selectedTemplate.id)
          window.opener.postMessage(
            {
              type: 'template-created',
              memoId: memo.id,
              memoTitle: memo.title ?? selectedTemplate.name,
              memoCategory: categoryForOpener,
              memoTicker: memo.primary_company_id_details?.ticker ?? null,
              memoPrimaryCompanyId: memo.primary_company_id ?? null,
              memoCompanyIds: memo.company_ids ?? [],
            },
            window.location.origin
          )
          notify.success({
            title: 'Template Created',
            description: `${selectedTemplate.name} has been published. Returning to the previous page.`,
          })
          window.close()
        } else {
          notify.success({
            title: 'Memo Published',
            description: `${selectedTemplate.name} has been published successfully. Redirecting to documents...`,
          })
          setTimeout(() => {
            router.push('/documents')
          }, 1000)
        }
      }
    } catch (error) {
      const apiDetail = getApiErrorDetail(error)
      let errorMessage =
        apiDetail ||
        (error instanceof Error ? error.message : 'Failed to submit memo. Please try again.')

      if (!apiDetail) {
        if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
          errorMessage = 'Your session has expired. Please log in again.'
        } else if (errorMessage.includes('400')) {
          errorMessage = 'Invalid memo data. Please check all required fields.'
        } else if (errorMessage.includes('500')) {
          errorMessage = 'Server error. Please contact support if this persists.'
        }
      }

      console.error('Memo publish error:', error)
      notify.error({
        title: 'Failed to Submit Memo',
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
      setIsPublishing(false)
    }
  }, [
    selectedTemplate,
    authUser,
    formValues,
    editingMemoId,
    editingMemo,
    createMemoMutation,
    submitMemoMutation,
    resubmitMemoMutation,
    handleBackToList,
    router,
    maintenanceTask,
    prepareAndProcessMemoData,
    memoTitle,
    searchParams,
  ])

  const handleSubmitForApproval = useCallback(() => {
    if (validateForm()) {
      void handleConfirmSubmit()
    }
  }, [validateForm, handleConfirmSubmit])

  const handleDragStateChange = useCallback((state: boolean) => {
    setIsDragging(state)
  }, [])

  const handleEditMemo = useCallback(
    (memoId: string) => {
      router.push(`/research-updates/${memoId}?mode=edit`)
    },
    [router]
  )

  const handleViewMemo = useCallback(
    (memoId: string) => {
      router.push(`/research-updates/${memoId}?mode=view`)
    },
    [router]
  )

  const handleReprocessMemo = useCallback(
    async (memoId: string, hardReprocess = false) => {
      try {
        await reprocessMemoMutation.mutateAsync({ memoId, hardReprocess })
        notify.success({
          title: 'Memo Reprocessing',
          description: hardReprocess
            ? 'Memo has been sent for complete reprocessing'
            : 'Memo has been sent for reprocessing',
        })
      } catch (error) {
        notify.error({
          title: 'Reprocess Failed',
          description: error instanceof Error ? error.message : 'Failed to reprocess memo',
        })
      }
    },
    [reprocessMemoMutation]
  )

  const memoColumns = useMemo(
    () =>
      getMemoColumns({
        onEditMemo: handleEditMemo,
        onViewMemo: handleViewMemo,
        onReprocessMemo: handleReprocessMemo,
        companies: universeCompaniesData?.companies || [],
      }),
    [handleEditMemo, handleViewMemo, handleReprocessMemo, universeCompaniesData?.companies]
  )

  // Show template selection page when clicking create
  if (showTemplateSelection && view === 'list') {
    return <TemplateSelectionContainer onSelect={handleTemplateSelect} />
  }

  if (view === 'form' && selectedTemplate) {
    if (isLoadingMemo && editingMemoId) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleBackToList}>
                <ArrowLeft className="mr-1.5 size-3" />
                Back to Templates
              </Button>
              <div className="bg-border h-4 w-px" />
              <div className="space-y-0.5">
                <div className="text-muted-foreground text-xs">Loading:</div>
                <div className="text-foreground text-sm font-medium">{selectedTemplate.name}</div>
              </div>
            </div>
          </div>
          <TableSkeletonLoader
            columnCount={1}
            rowCount={8}
            showCheckbox={false}
            showActionButtons={false}
            minTableWidth={800}
          />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <MemoFormView
          template={selectedTemplate}
          fields={fields}
          formValues={formValues}
          memoTitle={memoTitle}
          validationErrors={validationErrors}
          uploadedFiles={uploadedFiles}
          isDragging={isDragging}
          preloadedCompanies={preloadedCompanies}
          maintenanceTask={maintenanceTask}
          analysts={analysts}
          canCreateMaintenanceTask={canCreateMaintenanceTask}
          showMaintenanceWarning={showMaintenanceWarning}
          isEditing={!!editingMemoId}
          isSubmitting={isSubmitting}
          isPublishing={isPublishing}
          isLoadingMemo={isLoadingMemo}
          memoStatus={editingMemo?.status}
          onBack={handleBackToList}
          onSaveAsDraft={handleSaveAsDraft}
          onSubmitForApproval={handleSubmitForApproval}
          onFieldChange={handleFieldChange}
          onPrimaryCompanyChange={handlePrimaryCompanyChange}
          onCompanyChange={handleCompanyChange}
          onMaintenanceTaskToggle={handleMaintenanceTaskToggle}
          onMaintenanceTaskChange={handleMaintenanceTaskChange}
          onUpload={handleFilesUpload}
          onModelUpload={handleModelUpload}
          onRemoveFile={handleRemoveFile}
          onDragStateChange={handleDragStateChange}
          userMultiFieldResources={userMultiFieldResources}
        />
      </div>
    )
  }

  if (view === 'view' && selectedTemplate) {
    if (isLoadingMemo && editingMemoId) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleBackToList}>
                <ArrowLeft className="mr-1.5 size-3" />
                Back to List
              </Button>
              <div className="bg-border h-4 w-px" />
              <div className="space-y-0.5">
                <div className="text-muted-foreground text-xs">Loading:</div>
                <div className="text-foreground text-sm font-medium">{selectedTemplate.name}</div>
              </div>
            </div>
          </div>
          <TableSkeletonLoader
            columnCount={1}
            rowCount={8}
            showCheckbox={false}
            showActionButtons={false}
            minTableWidth={800}
          />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <MemoFormView
          template={selectedTemplate}
          fields={fields}
          formValues={formValues}
          memoTitle={memoTitle}
          validationErrors={validationErrors}
          uploadedFiles={uploadedFiles}
          isDragging={isDragging}
          preloadedCompanies={preloadedCompanies}
          maintenanceTask={maintenanceTask}
          analysts={analysts}
          canCreateMaintenanceTask={canCreateMaintenanceTask}
          showMaintenanceWarning={showMaintenanceWarning}
          isEditing={false}
          isSubmitting={false}
          isPublishing={false}
          isLoadingMemo={isLoadingMemo}
          isViewOnly={true}
          memoStatus={editingMemo?.status}
          onBack={handleBackToList}
          onSaveAsDraft={handleSaveAsDraft}
          onSubmitForApproval={handleSubmitForApproval}
          onFieldChange={handleFieldChange}
          onPrimaryCompanyChange={handlePrimaryCompanyChange}
          onCompanyChange={handleCompanyChange}
          onMaintenanceTaskToggle={handleMaintenanceTaskToggle}
          onMaintenanceTaskChange={handleMaintenanceTaskChange}
          onUpload={handleFilesUpload}
          onModelUpload={handleModelUpload}
          onRemoveFile={handleRemoveFile}
          onDragStateChange={handleDragStateChange}
          userMultiFieldResources={userMultiFieldResources}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6">
      {/* Research Updates Container */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Research Updates
          </h2>
          <Button onClick={handleCreateMemo} className="flex items-center gap-2">
            <Plus className="size-4" />
            Create Research Update
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search research updates..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pr-3 pl-10 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[220px] rounded-lg border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMO_TYPE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] rounded-lg border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMO_STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoadingMemos ? (
          <TableSkeletonLoader
            columnCount={5}
            rowCount={10}
            showCheckbox={false}
            showActionButtons={false}
            minTableWidth={1050}
          />
        ) : (
          <DataTable<MemoTableData>
            data={filteredMemos.map((memo) => ({ ...memo }) as MemoTableData)}
            columns={memoColumns}
            minTableWidth={1050}
            totalCount={memosData?.total ?? filteredMemos.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
            paginationMode="server"
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            emptyStateTitle="No research updates yet"
            emptyStateDescription="Get started by creating your first research update using the button above."
          />
        )}
      </div>
    </div>
  )
}

export default NewMemoSubmissionContainer
