/**
 * Documents Queries Tests
 * Test suite for Documents TanStack Query hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDocuments, useDocument, useUploadDocument } from '@/containers/documents/lib/queries'
import { documentsService } from '@/services/api/documents.service'
import type { DocumentApiResponse } from '@/containers/documents/lib/types'

// Mock the documents service
vi.mock('@/services/api/documents.service', () => ({
  documentsService: {
    getDocuments: vi.fn(),
    getDocumentById: vi.fn(),
    uploadDocumentWithPresignedUrl: vi.fn(),
  },
  transformDocument: vi.fn((doc) => ({
    id: String(doc.id),
    title: doc.original_filename,
    ticker: doc.ticker || 'N/A',
    type: doc.document_type,
    status: 'completed',
    date: 'Oct 16, 2024',
    primary: doc.uploaded_by,
    actionable: true,
    description: doc.description,
    thesis: doc.extracted_text?.substring(0, 500),
    uploadDate: 'Oct 16, 2024',
    datePublished: 'Oct 16, 2024',
    sentiment: null,
    priceTarget: null,
    originalFilename: doc.original_filename,
    fileExtension: doc.file_extension,
    fileSize: doc.file_size,
    mimeType: doc.mime_type,
    extractedText: doc.extracted_text,
    s3ObjectName: doc.s3_object_name,
    textExtractionStatus: doc.text_extraction_status,
    analysisStatus: doc.analysis_status,
    embeddingStatus: doc.embedding_status,
    extractionError: doc.extraction_error,
  })),
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Documents Queries', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  const mockApiDocument = {
    id: 123,
    content_type: 'DOCUMENT',
    category: null,
    title: 'Tesla Q3 Report.pdf',
    description: 'Q3 2024 Earnings Report',
    primary_company_id: 1,
    company_ids: [],
    snapshot_id: null,
    user_id: 1,
    org_id: 1,
    s3_object_name: 'docs/tesla-q3.pdf',
    file_metadata: {
      filename: 'tesla-q3-report.pdf',
      file_size: 2048000,
      mime_type: 'application/pdf',
      file_extension: 'pdf',
      original_filename: 'Tesla Q3 Report.pdf',
    },
    status: 'DRAFT',
    published_at: null,
    text_extraction_status: 'COMPLETED' as const,
    chunking_status: 'COMPLETED' as const,
    embedding_status: 'COMPLETED' as const,
    analysis_status: 'COMPLETED' as const,
    created_at: '2024-10-16T10:00:00Z',
    updated_at: '2024-10-16T11:00:00Z',
    primary_company_details: {
      id: 1,
      ticker: 'TSLA',
      name: 'Tesla Inc.',
    },
    company_details: [],
    user_details: {
      id: 1,
      name: 'John Doe',
    },
  }

  describe('useDocuments', () => {
    const mockDocumentsResponse: DocumentApiResponse = {
      data: [mockApiDocument],
      total: 1,
      skip: 0,
      limit: 25,
      message: 'ok',
    }

    it('should fetch documents successfully', async () => {
      vi.mocked(documentsService.getDocuments).mockResolvedValue(mockDocumentsResponse)

      const { result } = renderHook(() => useDocuments(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(documentsService.getDocuments).toHaveBeenCalledWith(0, 100, {
        search: undefined,
        filters: undefined,
      })
      expect(result.current.data?.documents).toHaveLength(1)
      expect(result.current.data?.documents?.[0]?.id).toBe(String(mockApiDocument.id))
      expect(result.current.data?.total).toBe(1)
    })

    it('should handle custom skip and limit params', async () => {
      vi.mocked(documentsService.getDocuments).mockResolvedValue(mockDocumentsResponse)

      const { result } = renderHook(() => useDocuments(10, 50), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(documentsService.getDocuments).toHaveBeenCalledWith(10, 50, {
        search: undefined,
        filters: undefined,
      })
      expect(result.current.data?.documents).toHaveLength(1)
    })

    it('should handle fetch error', async () => {
      vi.mocked(documentsService.getDocuments).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useDocuments(), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })

    it('should return empty array when no documents', async () => {
      const emptyResponse: DocumentApiResponse = {
        data: [],
        total: 0,
        skip: 0,
        limit: 25,
        message: 'ok',
      }
      vi.mocked(documentsService.getDocuments).mockResolvedValue(emptyResponse)

      const { result } = renderHook(() => useDocuments(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.documents).toHaveLength(0)
    })

    it('should handle pagination metadata correctly', async () => {
      const paginatedResponse: DocumentApiResponse = {
        data: [mockApiDocument],
        total: 100,
        skip: 25,
        limit: 25,
        message: 'ok',
      }
      vi.mocked(documentsService.getDocuments).mockResolvedValue(paginatedResponse)

      const { result } = renderHook(() => useDocuments(25, 25), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(documentsService.getDocuments).toHaveBeenCalledWith(25, 25, {
        search: undefined,
        filters: undefined,
      })
      expect(result.current.data?.documents).toHaveLength(1)
      expect(result.current.data?.skip).toBe(25)
      expect(result.current.data?.limit).toBe(25)
    })

    it('should remove duplicate documents with same id', async () => {
      const duplicateResponse: DocumentApiResponse = {
        data: [mockApiDocument, { ...mockApiDocument }],
        total: 2,
        skip: 0,
        limit: 25,
        message: 'ok',
      }
      vi.mocked(documentsService.getDocuments).mockResolvedValue(duplicateResponse)

      const { result } = renderHook(() => useDocuments(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.documents).toHaveLength(1)
    })

    it('should provide fallback metadata when totals are missing', async () => {
      const minimalResponse: DocumentApiResponse = {
        data: [mockApiDocument],
        total: 1,
        skip: 0,
        limit: 25,
        message: 'ok',
      }
      vi.mocked(documentsService.getDocuments).mockResolvedValue(minimalResponse)

      const { result } = renderHook(() => useDocuments(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.total).toBe(1)
      expect(result.current.data?.skip).toBe(0)
      expect(result.current.data?.limit).toBe(25)
    })
  })

  describe('useDocument', () => {
    it('should fetch single document by ID', async () => {
      vi.mocked(documentsService.getDocumentById).mockResolvedValue({
        data: mockApiDocument,
      })

      const { result } = renderHook(() => useDocument('123'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(documentsService.getDocumentById).toHaveBeenCalledWith('123')
      expect(result.current.data?.document.id).toBe(String(mockApiDocument.id))
    })

    it('should not fetch when documentId is falsy', async () => {
      const { result } = renderHook(() => useDocument('' as unknown as string), { wrapper })

      expect(result.current.data).toBeUndefined()
      expect(documentsService.getDocumentById).not.toHaveBeenCalled()
    })

    it('should handle document not found error', async () => {
      vi.mocked(documentsService.getDocumentById).mockRejectedValue(new Error('Document not found'))

      const { result } = renderHook(() => useDocument('invalid-id'), { wrapper })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useUploadDocument', () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const mockMetadata = {
      ticker: 'TSLA',
      document_type: 'Earnings Report',
      primary_company_id: 1,
    }

    it('should upload document successfully', async () => {
      const mockUploadResponse = {
        data: mockApiDocument,
      }
      vi.mocked(documentsService.uploadDocumentWithPresignedUrl).mockResolvedValue(
        mockUploadResponse
      )

      const { result } = renderHook(() => useUploadDocument(), { wrapper })

      result.current.mutate({ file: mockFile, metadata: mockMetadata })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(documentsService.uploadDocumentWithPresignedUrl).toHaveBeenCalledWith(
        mockFile,
        mockMetadata
      )
    })

    it('should handle upload error', async () => {
      vi.mocked(documentsService.uploadDocumentWithPresignedUrl).mockRejectedValue(
        new Error('Upload failed')
      )

      const { result } = renderHook(() => useUploadDocument(), { wrapper })

      result.current.mutate({
        file: mockFile,
        metadata: { primary_company_id: 1 },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })

    it('should invalidate documents query after successful upload', async () => {
      const mockUploadResponse = {
        data: mockApiDocument,
      }
      vi.mocked(documentsService.uploadDocumentWithPresignedUrl).mockResolvedValue(
        mockUploadResponse
      )

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useUploadDocument(), { wrapper })

      result.current.mutate({
        file: mockFile,
        metadata: { primary_company_id: 1 },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(invalidateSpy).toHaveBeenCalled()
    })

    it('should handle large file upload', async () => {
      const largeFile = new File([new ArrayBuffer(10 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      })

      const mockUploadResponse = {
        data: mockApiDocument,
      }
      vi.mocked(documentsService.uploadDocumentWithPresignedUrl).mockResolvedValue(
        mockUploadResponse
      )

      const { result } = renderHook(() => useUploadDocument(), { wrapper })

      result.current.mutate({
        file: largeFile,
        metadata: { primary_company_id: 1 },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(documentsService.uploadDocumentWithPresignedUrl).toHaveBeenCalledWith(largeFile, {
        primary_company_id: 1,
      })
    }, 10000)
  })
})
