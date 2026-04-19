/**
 * Minimal document types aligned with the AskYourDocument backend.
 *
 * Backend endpoints used by the frontend:
 *   - POST /documents/upload
 *   - GET  /documents?skip=&limit=
 */

export type DocumentStatus = 'completed' | 'pending' | 'in-progress' | 'failed'

/**
 * Backend DocumentSummary (Pydantic) – stored extraction metadata.
 */
export interface ApiDocument {
  id: number
  filename?: string | null
  content_type?: string | null
  size_bytes?: number | null
  s3_uri: string

  status: string
  extraction_method: string
  extracted_char_count: number
  error_message?: string | null

  extraction_completed: boolean
  chunking_completed: boolean
  embedding_completed: boolean

  tenant_id?: number | null
  extracted_at?: string | null
  created_at: string
  updated_at: string
}

export interface DocumentApiResponse {
  data: ApiDocument[]
  total: number
  skip: number
  limit: number
  message: string
}

export interface UploadDocumentApiResponse {
  bucket: string
  key: string
  s3_uri: string
  content_type?: string | null
  size_bytes?: number | null
}

/**
 * UI-friendly document list row.
 */
export interface Document {
  id: string
  title: string
  type: string
  status: DocumentStatus

  filename?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  created_at?: string
  updated_at?: string
  date?: string
}
