/**
 * Documents API Service
 *
 * Aligned with the actual backend endpoints:
 *
 *   POST /documents/upload  – multipart/form-data upload
 *     Request:  file (binary), prefix? (form field)
 *     Response: { bucket, key, s3_uri, content_type, size_bytes }
 *
 *   GET /documents           – paginated document list
 *     Query:    skip, limit
 *     Response: { total, skip, limit, documents: DocumentSummary[] }
 *
 * DocumentSummary shape (from backend Pydantic model):
 *   { id, filename, content_type, size_bytes, s3_uri, status,
 *     extraction_method, extracted_char_count, error_message,
 *     extraction_completed, chunking_completed, embedding_completed,
 *     tenant_id, extracted_at, created_at, updated_at }
 */

import { BaseApiService } from './base'
import type {
  ApiDocument,
  Document,
  DocumentApiResponse,
  UploadDocumentApiResponse,
} from '@/containers/documents/lib/types'

class DocumentsService extends BaseApiService {
  /**
   * List documents with pagination.
   * Backend: GET /documents?skip=&limit=
   */
  async getDocuments(
    skip: number = 0,
    limit: number = 50,
    _options?: {
      search?: string
      category?: string
      status?: string
      sort?: string
      authorId?: number
      filters?: Record<string, unknown>
    }
  ): Promise<DocumentApiResponse> {
    const params = new URLSearchParams()
    params.set('skip', String(skip))
    params.set('limit', String(limit))

    const raw = await this.get<{
      total: number
      skip: number
      limit: number
      documents: ApiDocument[]
    }>(`/documents?${params.toString()}`)

    // Normalise to the shape the rest of the frontend expects
    return {
      data: raw.documents,
      total: raw.total,
      skip: raw.skip,
      limit: raw.limit,
      message: '',
    }
  }

  /**
   * Upload a document via multipart/form-data.
   * Backend: POST /documents/upload
   *   Fields: file (binary), prefix (optional string)
   */
  async uploadDocument(
    file: File,
    options?: { prefix?: string }
  ): Promise<UploadDocumentApiResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (options?.prefix) {
      formData.append('prefix', options.prefix)
    }

    return this.post<UploadDocumentApiResponse>('/documents/upload', formData, {
      headers: {
        // Let the browser set the correct multipart boundary
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Static helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Transform a raw backend DocumentSummary into the UI Document type.
   */
  static transformDocument(apiDoc: ApiDocument): Document {
    const processing = apiDoc.embedding_completed
      ? 'completed'
      : apiDoc.chunking_completed
        ? 'in-progress'
        : apiDoc.extraction_completed
          ? 'in-progress'
          : apiDoc.error_message
            ? 'failed'
            : 'pending'

    return {
      id: String(apiDoc.id),
      title: apiDoc.filename || `Document ${apiDoc.id}`,
      type: apiDoc.content_type || 'unknown',
      date: apiDoc.created_at
        ? new Date(apiDoc.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '',
      status: processing as Document['status'],

      // File info
      filename: apiDoc.filename || undefined,
      file_name: apiDoc.filename || undefined,
      file_size: apiDoc.size_bytes || undefined,
      mime_type: apiDoc.content_type || undefined,

      created_at: apiDoc.created_at,
      updated_at: apiDoc.updated_at,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stub methods kept so that existing imports don't break at compile time.
  // These correspond to endpoints that do NOT exist in this backend.
  // ──────────────────────────────────────────────────────────────────────────

  /** @deprecated Not available in this backend */
  async getDocumentById(_docId: string | number): Promise<{ data: ApiDocument }> {
    throw new Error('GET /content/:id is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async deleteDocument(_contentId: string | number): Promise<{ message: string }> {
    throw new Error('Document deletion is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async reprocessDocument(
    _docId: string | number,
    _hardReprocess?: boolean
  ): Promise<{ message: string; document_id: number }> {
    throw new Error('Document reprocessing is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async getDocumentFileUrl(
    _docId: string | number,
    _expiresIn?: number
  ): Promise<{ document_id: number; file_url: string; expires_in: number; message: string }> {
    throw new Error('File URL endpoint is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async getDocumentChatStatus(_documentId: number): Promise<{
    ready: boolean
    document_id: number
    chunk_count: number
    chunking_status: string
    embedding_status: string
    message: string
  }> {
    throw new Error('Chat-status endpoint is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async sendDocumentChatMessage(_request: unknown): Promise<{ answer: string; chat_id: number }> {
    throw new Error('Document chat endpoint is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async updateContent(_contentId: string | number, _data: unknown): Promise<{ data: ApiDocument }> {
    throw new Error('Content update is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async generateUploadUrl(
    _filename: string,
    _contentType: string
  ): Promise<{ upload_url: string; s3_key: string; content_type: string }> {
    throw new Error('Presigned URL generation is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async uploadToS3(_presignedUrl: string, _file: File, _contentType: string): Promise<void> {
    throw new Error('Direct S3 upload is not available in this backend.')
  }

  /** @deprecated Not available in this backend */
  async processPresignedUpload(_data: unknown): Promise<{ data: ApiDocument }> {
    throw new Error('Presigned upload registration is not available in this backend.')
  }

  /** @deprecated Use uploadDocument instead. */
  async uploadDocumentWithPresignedUrl(
    file: File,
    _metadata?: unknown
  ): Promise<{ data: ApiDocument }> {
    // Fall back to the direct upload and wrap in legacy shape
    const result = await this.uploadDocument(file)
    // Convert UploadDocumentApiResponse to a minimal ApiDocument shell
    const doc: ApiDocument = {
      id: 0,
      filename: file.name,
      content_type: result.content_type || file.type,
      size_bytes: result.size_bytes || null,
      s3_uri: result.s3_uri,
      status: 'pending',
      extraction_method: '',
      extracted_char_count: 0,
      error_message: null,
      extraction_completed: false,
      chunking_completed: false,
      embedding_completed: false,
      tenant_id: null,
      extracted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return { data: doc }
  }

  /** @deprecated Not available in this backend */
  async getMemoTemplateUrls(
    _contentId: number,
    _expiresIn?: number
  ): Promise<{ urls: Record<string, string> }> {
    return { urls: {} }
  }

  /** @deprecated Not available in this backend */
  async getAttachedDocumentsDownloadUrl(
    _contentId: string | number,
    _filename?: string
  ): Promise<unknown> {
    throw new Error('Attached documents download URL is not available in this backend.')
  }
}

// Export singleton instance
export const documentsService = new DocumentsService()

// Export static transform method for convenience
export const transformDocument = DocumentsService.transformDocument
