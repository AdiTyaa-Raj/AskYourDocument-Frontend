export interface DocumentPdfPreviewProps {
  blobUrl?: string
  zoom: number
  isLoading: boolean
  error?: string | null
}

export interface DocumentDocxPreviewProps {
  arrayBuffer?: ArrayBuffer
  isLoading: boolean
  error?: string | null
}

import type { ParsedXlsxSheet } from './types'

export interface DocumentXlsxPreviewProps {
  sheets?: ParsedXlsxSheet[]
  isLoading: boolean
  error?: string | null
}
