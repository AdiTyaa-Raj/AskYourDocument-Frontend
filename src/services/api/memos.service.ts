import { BaseApiService } from './base'
import { formatDate } from '@/lib/date-utils'
import { memoTemplates } from '@/containers/memos/lib/templates'
import { apiTypeToTemplateId } from '@/containers/memos/lib/helpers'
import type {
  ApiMemo,
  MemosApiResponse,
  SingleMemoApiResponse,
  CreateMemoPayload,
  UpdateMemoPayload,
  UIMemo,
  TemplateDataUploadFileRequest,
  GenerateUploadUrlsResponse,
} from '@/containers/memos/lib/types'

class MemosService extends BaseApiService {
  /**
   * Fetch memos with pagination
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 25)
   */
  async getMemos(
    skip: number = 0,
    limit: number = 25,
    options?: { search?: string; filters?: Record<string, unknown> }
  ): Promise<MemosApiResponse> {
    const params = new URLSearchParams()
    params.set('skip', String(skip))
    params.set('limit', String(limit))

    const filters: Record<string, unknown> = { ...(options?.filters ?? {}) }
    const searchTerm = options?.search?.trim()
    if (searchTerm) {
      filters.title__ilike = searchTerm
    }

    if (Object.keys(filters).length > 0) {
      params.set('filters', JSON.stringify(filters))
    }

    const query = params.toString()
    return this.get<MemosApiResponse>(`/memos/?${query}`)
  }

  /**
   * Get a single memo by ID
   * @param memoId - Memo ID
   */
  async getMemoById(memoId: string | number): Promise<SingleMemoApiResponse> {
    return this.get<SingleMemoApiResponse>(`/memos/${memoId}`)
  }

  /**
   * application/x-www-form-urlencoded body for POST /content/memo and PATCH /content/{id}
   */
  private buildMemoUrlEncodedBody(data: CreateMemoPayload): string {
    const params = new URLSearchParams()
    params.set('title', data.title)
    params.set('primary_company_id', String(data.primary_company_id))
    params.set('category', data.category)
    if (data.template_data) {
      params.append('template_data', data.template_data)
    }
    if (data.maintenance_data) {
      params.append('maintenance_data', data.maintenance_data)
    }
    if (data.document_data) {
      params.append('document_data', data.document_data)
    }
    if (data.model_document) {
      params.append('model_document', data.model_document)
    }
    if (data.publish !== undefined) {
      params.append('publish', String(data.publish))
    }
    data.company_ids?.forEach((id) => params.append('company_ids', String(id)))
    data.relevant_documents?.forEach((id) => params.append('relevant_documents', String(id)))
    return params.toString()
  }

  /**
   * Create a new memo using /content/memo endpoint
   * @param data - Memo creation payload
   */
  async createMemo(data: CreateMemoPayload): Promise<SingleMemoApiResponse> {
    const body = this.buildMemoUrlEncodedBody(data)
    return this.post<SingleMemoApiResponse>('/content/memo', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  /**
   * Update an existing memo draft (PATCH /content/{content_id}, same body as create)
   */
  async updateMemo(
    memoId: string | number,
    data: UpdateMemoPayload
  ): Promise<SingleMemoApiResponse> {
    const body = this.buildMemoUrlEncodedBody(data)
    return this.patch<SingleMemoApiResponse>(`/content/${memoId}`, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  }

  /**
   * Delete a memo
   * @param memoId - Memo ID
   */
  async deleteMemo(memoId: string | number): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/memos/${memoId}`)
  }

  /**
   * Reprocess a memo by sending it to the queue
   * @param memoId - Memo ID
   * @param hardReprocess - If true, reset all flags and reprocess everything
   */
  async reprocessMemo(
    memoId: string | number,
    hardReprocess: boolean = false
  ): Promise<{ message: string; memo_id: number }> {
    return this.post<{ message: string; memo_id: number }>(
      `/memos/${memoId}/reprocess?hard_reprocess=${hardReprocess}`
    )
  }

  /**
   * Submit a memo for approval
   * @param memoId - Memo ID
   */
  async submitMemo(memoId: string | number): Promise<SingleMemoApiResponse> {
    return this.post<SingleMemoApiResponse>(`/memos/${memoId}/submit`, {})
  }

  /**
   * Resubmit a rejected memo for approval
   * @param memoId - Memo ID
   * @param data - Memo data to update before resubmitting
   */
  async resubmitMemo(
    memoId: string | number,
    data: Record<string, unknown>
  ): Promise<SingleMemoApiResponse> {
    return this.post<SingleMemoApiResponse>(`/memos/${memoId}/resubmit`, { data })
  }

  /**
   * Generate presigned upload URLs for template data files (inline images, charts, etc.)
   * @param files - Array of file metadata (filename and content_type)
   */
  async generateTemplateDataUploadUrls(
    files: TemplateDataUploadFileRequest[]
  ): Promise<GenerateUploadUrlsResponse> {
    return this.post<GenerateUploadUrlsResponse>('/content/template_data/generate-upload-urls', {
      files,
    })
  }

  /**
   * Generate presigned URLs for attached / supporting documents (memo sidebar uploads, document detail)
   */
  async generateAttachedDocumentsUploadUrls(
    files: TemplateDataUploadFileRequest[]
  ): Promise<GenerateUploadUrlsResponse> {
    return this.post<GenerateUploadUrlsResponse>(
      '/content/attached-documents/generate-upload-urls',
      { files }
    )
  }

  /**
   * Upload file directly to S3 using presigned URL
   */
  async uploadToS3(presignedUrl: string, data: Blob | File, contentType: string): Promise<void> {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: data,
      headers: { 'Content-Type': contentType },
    })

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`)
    }
  }

  /**
   * Transform API memo to UI-friendly format
   */
  static transformMemo(apiMemo: ApiMemo): UIMemo {
    // Convert API template type to UI template ID
    const uiTemplateId = apiTypeToTemplateId(apiMemo.template_type)

    // Map template_type to display name
    const template = memoTemplates.find((t) => t.id === uiTemplateId)
    const templateName = template?.name || apiMemo.template_type

    // Extract ticker from company_ids (API returns company IDs as strings)
    // The ticker display will be handled by fetching company details when needed
    const companyId = apiMemo.company_ids?.[0] || '-'

    // Extract analyst from user_id or data
    const primary = (apiMemo.data?.analyst_id as string) || apiMemo.user_id || 'Unknown'
    const secondary = (apiMemo.data?.secondary_analyst as string) || '-'

    return {
      id: apiMemo.id.toString(),
      title: apiMemo.title,
      ticker: companyId, // Will be displayed as company ID until we fetch company details
      type: templateName,
      primary: primary,
      secondary: secondary,
      date: formatDate(apiMemo.updated_at),
      status: apiMemo.status,
      template_type: apiMemo.template_type,
      revision_count: apiMemo.revision_count,
      created_at: apiMemo.created_at,
      updated_at: apiMemo.updated_at,
      company_ids: apiMemo.company_ids,
      relevant_documents: apiMemo.relevant_documents,
      chunking_status: apiMemo.chunking_status,
      embedding_status: apiMemo.embedding_status,
      analysis_status: apiMemo.analysis_status,
    }
  }
}

// Export singleton instance
export const memosService = new MemosService()

// Export static transform method for convenience
export const transformMemo = MemosService.transformMemo
