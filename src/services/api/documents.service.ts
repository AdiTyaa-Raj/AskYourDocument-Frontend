/**
 * Documents API Service
 * Handles all document-related API calls
 */

import { BaseApiService } from './base'
import { formatDate } from '@/lib/date-utils'
import { getApiErrorDetail } from '@/lib/utils'
import { aggregateProcessingStatuses } from '@/lib/processing-status-utils'
import type {
  ApiDocument,
  AttachedDocumentsDownloadUrlsResponse,
  Document,
  DocumentApiResponse,
  DocumentFileUrlResponse,
  SingleDocumentApiResponse,
  UploadDocumentApiResponse,
  DocumentChatStatus,
  DocumentChatRequest,
  DocumentChatResponse,
  UpdateContentPayload,
} from '@/containers/documents/lib/types'
import {
  ALLOWED_FILE_TYPES,
  DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE,
} from '@/containers/documents/lib/constants'
import { getAnalystNames, resolveDocumentListType } from '@/containers/documents/lib/utils'

class DocumentsService extends BaseApiService {
  /**
   * Fetch documents with pagination and optional search/filters
   * Uses native API query parameters: search, category, status, sort
   */
  async getDocuments(
    skip: number = 0,
    limit: number = 25,
    options?: {
      search?: string
      category?: string
      status?: string
      sort?: string
      authorId?: number
      filters?: Record<string, unknown> // Legacy filters support
    }
  ): Promise<DocumentApiResponse> {
    const params = new URLSearchParams()
    params.set('skip', String(skip))
    params.set('limit', String(limit))

    // Build optional query parameters
    const optionalParams: Record<string, string | undefined> = {
      search: options?.search?.trim() || undefined,
      category: options?.category,
      status: options?.status,
      sort: options?.sort,
      author_id:
        typeof options?.authorId === 'number' && Number.isFinite(options.authorId)
          ? String(options.authorId)
          : undefined,
    }

    Object.entries(optionalParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      }
    })

    // Legacy filters support (for advanced filtering if needed)
    if (options?.filters && Object.keys(options.filters).length > 0) {
      params.set('filters', JSON.stringify(options.filters))
    }

    const query = params.toString()
    return this.get<DocumentApiResponse>(`/content/?${query}`)
  }

  /** Get a single document by ID */
  async getDocumentById(docId: string | number): Promise<SingleDocumentApiResponse> {
    return this.get<SingleDocumentApiResponse>(`/content/${docId}`)
  }

  /**
   * Update content fields (PATCH)
   * Used for updating draft documents before publishing or saving changes
   * @param contentId - Content ID
   * @param data - Update payload
   */
  async updateContent(
    contentId: string | number,
    data: UpdateContentPayload
  ): Promise<SingleDocumentApiResponse> {
    const params = new URLSearchParams()

    const appendOptional = (key: string, value: string | null | undefined) => {
      if (value !== undefined && value !== null) {
        params.append(key, value)
      }
    }

    appendOptional('title', data.title ?? undefined)
    appendOptional('description', data.description ?? undefined)
    appendOptional('category', data.category ?? undefined)
    appendOptional('template_data', data.template_data ?? undefined)
    appendOptional('maintenance_data', data.maintenance_data ?? undefined)
    appendOptional('document_data', data.document_data ?? undefined)
    appendOptional('model_document', data.model_document ?? undefined)

    if (data.publish !== undefined) {
      params.append('publish', String(data.publish))
    }

    data.company_ids?.forEach((id) => params.append('company_ids', String(id)))
    data.relevant_documents?.forEach((id) => params.append('relevant_documents', String(id)))

    const body = params.toString()
    return this.patch<SingleDocumentApiResponse>(`/content/${contentId}`, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  /**
   * Generate a presigned URL for uploading to S3 (Step 1)
   */
  async generateUploadUrl(
    filename: string,
    contentType: string
  ): Promise<{
    upload_url: string
    s3_key: string
    content_type: string
  }> {
    const params = new URLSearchParams({ filename })
    if (contentType) {
      params.append('content_type', contentType)
    }
    return this.post<{
      upload_url: string
      s3_key: string
      content_type: string
    }>(`/content/generate-upload-url?${params.toString()}`)
  }

  /**
   * Upload file directly to S3 using presigned URL (Step 2)
   */
  async uploadToS3(presignedUrl: string, file: File, contentType: string): Promise<void> {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(
          `S3 upload failed with status ${response.status}: ${response.statusText}. ${errorText || ''}`
        )
      }
    } catch (error) {
      // Handle network errors (CORS, connection issues, etc.)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(
          'Failed to upload to S3. This is likely a CORS issue. ' +
            'Please ensure the S3 bucket has CORS configured to allow requests from this origin.'
        )
      }
      // Re-throw any other errors
      throw error
    }
  }

  private appendCompanyIds(formData: FormData, companyIds?: number[]): void {
    companyIds?.forEach((id) => formData.append('company_ids', String(id)))
  }

  private buildDocumentFormData(data: {
    s3_key: string
    filename: string
    title?: string
    content_type?: string
    uploaded_by?: string
    description?: string
    ticker?: string
    primary_company_id: number
    company_ids?: number[]
    document_type?: string
    actionable?: string
    category?: string
    publish?: boolean
  }): FormData {
    const formData = new FormData()

    const fields = {
      s3_key: data.s3_key,
      filename: data.filename,
      title: data.title || data.filename,
      primary_company_id: String(data.primary_company_id),
      ...(data.content_type && { content_type: data.content_type }),
      ...(data.uploaded_by && { uploaded_by: data.uploaded_by }),
      ...(data.description && { description: data.description }),
      ...(data.ticker && { ticker: data.ticker }),
      ...(data.document_type && { document_type: data.document_type }),
      ...(data.actionable && { actionable: data.actionable }),
      ...(data.category && { category: data.category }),
      ...(data.publish !== undefined && { publish: String(data.publish) }),
    }

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value))
      }
    })

    this.appendCompanyIds(formData, data.company_ids)

    return formData
  }

  private appendLegacyMultipartDocumentMetadata(
    formData: FormData,
    metadata: {
      uploaded_by?: string
      description?: string
      ticker?: string
      primary_company_id: number
      company_ids?: number[]
      document_type?: string
      actionable?: string
    }
  ): void {
    const optionalStrings: Record<string, string | undefined> = {
      uploaded_by: metadata.uploaded_by,
      description: metadata.description,
      ticker: metadata.ticker,
      document_type: metadata.document_type,
      actionable: metadata.actionable,
    }
    for (const [key, value] of Object.entries(optionalStrings)) {
      if (value) {
        formData.append(key, value)
      }
    }
    formData.append('primary_company_id', String(metadata.primary_company_id))
    this.appendCompanyIds(formData, metadata.company_ids)
  }

  /**
   * Register the uploaded document in backend after S3 upload (Step 3)
   */
  async processPresignedUpload(data: {
    s3_key: string
    filename: string
    title?: string
    content_type?: string
    uploaded_by?: string
    description?: string
    ticker?: string
    primary_company_id: number
    company_ids?: number[]
    document_type?: string
    actionable?: string
    category?: string
    publish?: boolean
  }): Promise<SingleDocumentApiResponse> {
    const formData = this.buildDocumentFormData(data)

    return this.post<SingleDocumentApiResponse>('/content/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  /**
   * Complete two-step upload process with presigned URL and error handling
   */
  async uploadDocumentWithPresignedUrl(
    file: File,
    metadata: {
      title?: string
      uploaded_by?: string
      description?: string
      ticker?: string
      primary_company_id: number
      company_ids?: number[]
      document_type?: string
      actionable?: string
      category?: string
      publish?: boolean
    }
  ): Promise<SingleDocumentApiResponse> {
    let upload_url: string | undefined
    let s3_key: string | undefined
    let content_type: string | undefined

    try {
      // Step 1: Generate presigned URL
      if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
        throw new Error('Only Allowed File Types are: ' + ALLOWED_FILE_TYPES.join(', '))
      }
      const presignedData = await this.generateUploadUrl(file.name, file.type)
      upload_url = presignedData.upload_url
      s3_key = presignedData.s3_key
      content_type = presignedData.content_type

      // Step 2: Upload to S3
      await this.uploadToS3(upload_url, file, content_type)

      // Step 3: Register document with backend
      const result = await this.processPresignedUpload({
        s3_key,
        filename: file.name,
        content_type,
        ...metadata,
      })

      return result
    } catch (error) {
      const apiDetail = getApiErrorDetail(error)
      if (apiDetail) {
        throw new Error(apiDetail)
      }

      let errorMessage = 'Document upload failed'

      if (!upload_url) {
        errorMessage = 'Failed to generate presigned URL (Step 1)'
      } else if (!s3_key || (error instanceof Error && error.message.includes('S3'))) {
        errorMessage = 'Failed to upload file to S3 (Step 2)'
      } else {
        errorMessage = 'Failed to register document with backend (Step 3)'
      }

      if (error instanceof Error) {
        errorMessage = `${errorMessage}: ${error.message}`
      }

      throw new Error(errorMessage)
    }
  }

  /** Get presigned URL for document download/preview */
  async getDocumentFileUrl(
    docId: string | number,
    expiresIn: number = 3600
  ): Promise<DocumentFileUrlResponse> {
    return this.get<DocumentFileUrlResponse>(`/content/${docId}/file-url?expires_in=${expiresIn}`)
  }

  /**
   * Presigned download URL(s) for documents attached to this content (not standalone content rows).
   * Optional filename query scopes the result to one attachment.
   */
  async getAttachedDocumentsDownloadUrl(
    contentId: string | number,
    filename?: string
  ): Promise<AttachedDocumentsDownloadUrlsResponse> {
    const params = new URLSearchParams()
    if (filename) {
      params.set('filename', filename)
    }
    const qs = params.toString()
    return this.get<AttachedDocumentsDownloadUrlsResponse>(
      `/content/${contentId}/attached-documents/download-urls${qs ? `?${qs}` : ''}`
    )
  }

  /** Delete a document */
  /**
   * Delete content (document or memo) with full cleanup (chunks, embeddings, S3 file).
   * Requires documents:delete permission.
   */
  async deleteDocument(contentId: string | number): Promise<{ message: string }> {
    return this.put<{ message: string }>(`/content/${contentId}/delete`)
  }

  /** Reprocess a document (hardReprocess resets all flags and reprocesses everything) */
  async reprocessDocument(
    docId: string | number,
    hardReprocess: boolean = false
  ): Promise<{ message: string; document_id: number }> {
    return this.post<{ message: string; document_id: number }>(
      `/content/${docId}/reprocess?hard_reprocess=${hardReprocess}`
    )
  }

  /** Upload a document using multipart/form-data (legacy method) */
  async uploadDocument(
    file: File,
    metadata: {
      uploaded_by?: string
      description?: string
      ticker?: string
      primary_company_id: number
      company_ids?: number[]
      document_type?: string
      actionable?: string
    }
  ): Promise<UploadDocumentApiResponse> {
    const formData = new FormData()
    formData.append('file', file)
    this.appendLegacyMultipartDocumentMetadata(formData, metadata)

    return this.post<UploadDocumentApiResponse>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  /** Check if document is ready for chat */
  async getDocumentChatStatus(documentId: number): Promise<DocumentChatStatus> {
    return this.get<DocumentChatStatus>(`/content-chat/status/${documentId}`)
  }

  /**
   * Get presigned URLs for all S3 keys in memo template_data
   * Used to display images in supporting charts for view mode
   */
  async getMemoTemplateUrls(
    contentId: number,
    expiresIn: number = 3600
  ): Promise<{ urls: Record<string, string> }> {
    const response = await this.get<{
      content_id: number
      s3_urls: Array<{ s3_key: string; presigned_url: string }>
      total_keys: number
      successful_urls: number
      message: string
      expires_in: number
    }>(`/content/${contentId}/memo-template-urls?expires_in=${expiresIn}`)

    // Transform s3_urls array to a Record<s3_key, presigned_url>
    const urls: Record<string, string> = {}
    if (response.s3_urls && Array.isArray(response.s3_urls)) {
      for (const item of response.s3_urls) {
        if (item.s3_key && item.presigned_url) {
          urls[item.s3_key] = item.presigned_url
        }
      }
    }

    return { urls }
  }

  /** Send a chat message about a document */
  async sendDocumentChatMessage(request: DocumentChatRequest): Promise<DocumentChatResponse> {
    const payload: {
      content_id: number
      query: string
      chat_id?: number
    } = {
      content_id: request.content_id,
      query: request.query,
    }

    // Only include chat_id on subsequent messages (not for the first message).
    if (request.chat_id != null && request.chat_id > 0) {
      payload.chat_id = request.chat_id
    }

    return this.post<DocumentChatResponse, typeof payload>('/content-chat/chat', payload)
  }

  /** True when API lists linked docs or at least one attached file blob */
  static apiContentHasAttachments(apiDoc: ApiDocument): boolean {
    const rel = apiDoc.relevant_documents
    const attached = apiDoc.attached_documents
    const hasRelevant = Array.isArray(rel) && rel.length > 0
    const hasAttached = Array.isArray(attached) && attached.length > 0
    return hasRelevant || hasAttached
  }

  /** Transform API document to UI-friendly format (supports both /content/ and legacy /documents/ API) */
  static transformDocument(apiDoc: ApiDocument): Document {
    // Handle new API structure (from /content/)
    const title =
      apiDoc.title ||
      apiDoc.file_metadata?.original_filename ||
      apiDoc.original_filename ||
      apiDoc.filename ||
      'Untitled'

    const filename = apiDoc.file_metadata?.filename || apiDoc.filename || apiDoc.title || 'unknown'

    const fileSize = apiDoc.file_metadata?.file_size || apiDoc.file_size || 0

    const mimeType =
      apiDoc.file_metadata?.mime_type || apiDoc.mime_type || 'application/octet-stream'

    // Extract ticker (new API vs old API)
    const ticker =
      apiDoc.primary_company_details?.ticker ||
      apiDoc.primary_company_id_details?.ticker ||
      apiDoc.ticker ||
      'N/A'

    const exchangeRaw = apiDoc.primary_company_details?.exchange
    const exchange =
      typeof exchangeRaw === 'string' && exchangeRaw.trim().length > 0
        ? exchangeRaw.trim()
        : undefined

    // Extract company name
    const companyName = apiDoc.primary_company_details?.name || ticker

    // Extract uploader name (new API vs old API)
    const uploaderName =
      apiDoc.user_details?.name ||
      apiDoc.uploaded_by_details?.name ||
      apiDoc.uploaded_by ||
      'Unknown'
    const primaryAnalyst = getAnalystNames(apiDoc.analyst_details?.primary, apiDoc.primary_analysts)
    const secondaryAnalyst = getAnalystNames(
      apiDoc.analyst_details?.secondary,
      apiDoc.secondary_analysts
    )
    // Source is determined solely by content_type:
    // MEMO -> template, DOCUMENT -> upload (default)
    const contentType = apiDoc.content_type?.toUpperCase()
    const source: 'template' | 'upload' = contentType === 'MEMO' ? 'template' : 'upload'

    const attachment: Document['attachment'] =
      contentType === 'MEMO'
        ? DocumentsService.apiContentHasAttachments(apiDoc)
          ? 'Y'
          : 'N'
        : DOCUMENT_LIST_ATTACHMENT_NOT_APPLICABLE

    return {
      id: apiDoc.id.toString(),
      title: title,
      ticker: ticker,
      exchange,
      type: resolveDocumentListType(apiDoc),
      source: source,
      attachment,
      author: uploaderName,
      primary: primaryAnalyst,
      secondary: secondaryAnalyst,
      date: formatDate(apiDoc.created_at),
      actionable: apiDoc.actionable || null,
      status: DocumentsService.getStatus(apiDoc),
      // Additional fields
      filename: filename,
      file_name: filename,
      file_size: fileSize,
      mime_type: mimeType,
      description: apiDoc.description,
      text_extraction_status: apiDoc.text_extraction_status,
      chunking_status: apiDoc.chunking_status,
      embedding_status: apiDoc.embedding_status,
      analysis_status: apiDoc.analysis_status,
      created_at: apiDoc.created_at,
      updated_at: apiDoc.updated_at,
      company: companyName,
      uploader: uploaderName,
      uploadDate: formatDate(apiDoc.created_at),
      datePublished: apiDoc.published_at
        ? formatDate(apiDoc.published_at)
        : formatDate(apiDoc.updated_at),
      extracted_text: apiDoc.extracted_text,
      category: apiDoc.category || undefined,
      can_delete: apiDoc.can_delete,
      // Additional fields for detail view
      strategy: undefined,
      thesis: apiDoc.extracted_text ? apiDoc.extracted_text.substring(0, 500) + '...' : undefined,
      relatedDocuments: [],
    }
  }

  /**
   * Determine document status: PUBLISHED=completed, DRAFT=pending, otherwise use processing statuses
   */
  private static getStatus(
    apiDoc: ApiDocument
  ): 'completed' | 'pending' | 'in-progress' | 'failed' {
    if (apiDoc.status?.toUpperCase() === 'PUBLISHED') {
      return 'completed'
    }

    if (apiDoc.status?.toUpperCase() === 'DRAFT') {
      return 'pending'
    }

    return aggregateProcessingStatuses([
      apiDoc.text_extraction_status,
      apiDoc.chunking_status,
      apiDoc.embedding_status,
      apiDoc.analysis_status,
    ])
  }
}

// Export singleton instance
export const documentsService = new DocumentsService()

// Export static transform method for convenience
export const transformDocument = DocumentsService.transformDocument
