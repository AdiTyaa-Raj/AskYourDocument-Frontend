import { BaseApiService } from './base'

export type ContentType = 'DOCUMENT' | 'MEMO'

export interface ContentItem {
  id: number
  content_type: ContentType
  category: string | null
  title: string
  description?: string | null
  primary_company_id?: number | null
  company_ids?: Array<number>
  snapshot_id?: number | null
  user_id?: number | null
  org_id?: number | null
  s3_object_name?: string | null
  file_metadata?: {
    filename?: string
    original_filename?: string
    file_extension?: string
    mime_type?: string
    file_size?: number
  } | null
  status?: string | null
  published_at?: string | null
  text_extraction_status?: string | null
  chunking_status?: string | null
  embedding_status?: string | null
  analysis_status?: string | null
  created_at?: string
  updated_at?: string
  actionable?: string | null
  primary_company_details?: { id: number; ticker: string; name: string }
  company_details?: Array<{ id: number; ticker: string; name: string }>
  user_details?: { id: number; name: string }
}

export interface ContentResponse {
  data: ContentItem[]
  total: number
  skip: number
  limit: number
  message?: string
}

export class ContentService extends BaseApiService {
  async getContent(
    skip: number = 0,
    limit: number = 25,
    params?: {
      content_type?: ContentType
      category?: string
      status?: string
      search?: string
      related_to_company_id?: Array<number | string>
    }
  ): Promise<ContentResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('skip', String(skip))
    searchParams.set('limit', String(limit))
    const entries: Array<[string, string | undefined]> = [
      ['content_type', params?.content_type],
      ['category', params?.category],
      ['status', params?.status],
      ['search', params?.search],
    ]

    entries.forEach(([key, value]) => {
      if (value) searchParams.set(key, value)
    })

    if (params?.related_to_company_id?.length) {
      params.related_to_company_id.forEach((value) => {
        searchParams.append('related_to_company_id', String(value))
      })
    }

    return this.get<ContentResponse>(`/content/?${searchParams.toString()}`)
  }
}

export const contentService = new ContentService()
