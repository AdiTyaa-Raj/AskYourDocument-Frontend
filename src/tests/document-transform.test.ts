/**
 * Document Transformation Tests
 * Test suite for document data transformations
 */

import { describe, it, expect } from 'vitest'
import { extractAttachedDocumentDownloadUrl } from '@/containers/documents/lib/document-helpers'
import { transformDocument } from '@/services/api/documents.service'
import type { ApiDocument } from '@/containers/documents/lib/types'

describe('Document Transformation', () => {
  const mockApiDocument: ApiDocument = {
    id: 123,
    content_type: 'DOCUMENT',
    category: null,
    title: 'Test Document.pdf',
    description: 'Apple Inc. Investment Analysis',
    primary_company_id: 1,
    company_ids: [],
    snapshot_id: null,
    user_id: 123,
    org_id: 1,
    s3_object_name: 'test/path.pdf',
    file_metadata: {
      filename: 'test-document.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf',
      file_extension: 'pdf',
      original_filename: 'Test Document.pdf',
    },
    status: 'DRAFT',
    published_at: null,
    primary_company_details: {
      id: 1,
      ticker: 'AAPL',
      name: 'Apple Inc.',
    },
    company_details: [],
    user_details: {
      id: 123,
      name: 'John Doe',
    },
    text_extraction_status: 'COMPLETED',
    chunking_status: 'COMPLETED',
    embedding_status: 'COMPLETED',
    analysis_status: 'COMPLETED',
    created_at: '2024-10-16T10:30:00Z',
    updated_at: '2024-10-16T11:00:00Z',
  }

  describe('transformDocument', () => {
    it('should transform API document to UI format', () => {
      const result = transformDocument(mockApiDocument)

      expect(result.id).toBe('123')
      expect(result.title).toBe('Test Document.pdf')
      expect(result.ticker).toBe('AAPL')
      expect(result.type).toBe('-') // Shows "-" when category is null
      expect(result.primary).toBe('-')
      expect(result.attachment).toBe('N/A')
    })

    it('should use category field for type when available', () => {
      const docWithCategory: ApiDocument = {
        ...mockApiDocument,
        content_type: 'MEMO',
        category: 'EARNINGS_PREVIEW',
      }
      const result = transformDocument(docWithCategory)
      expect(result.type).toBe('Earnings Preview')
      expect(result.attachment).toBe('N')
    })

    it('should set attachment Y for MEMO when linked or attached content exists', () => {
      const memoWithLinks: ApiDocument = {
        ...mockApiDocument,
        content_type: 'MEMO',
        category: 'EARNINGS_PREVIEW',
        relevant_documents: [999],
        attached_documents: null,
      }
      expect(transformDocument(memoWithLinks).attachment).toBe('Y')
    })

    it('should keep N/A for DOCUMENT rows even with linked content (standalone upload)', () => {
      const docWithLinks: ApiDocument = {
        ...mockApiDocument,
        content_type: 'DOCUMENT',
        relevant_documents: [999],
        attached_documents: null,
      }
      expect(transformDocument(docWithLinks).attachment).toBe('N/A')
    })

    it('should handle various category types correctly', () => {
      const categories = [
        { category: 'INVESTMENT_MEMO', expected: 'Investment Memo' },
        { category: 'MODELS', expected: 'Model' },
        { category: 'SCREEN', expected: 'Screen' },
      ]

      categories.forEach(({ category, expected }) => {
        const doc: ApiDocument = {
          ...mockApiDocument,
          category,
        }
        const result = transformDocument(doc)
        expect(result.type).toBe(expected)
      })
    })

    it('should show "-" when category is null and S3 path is not a memo model layout', () => {
      const docWithNullCategory: ApiDocument = {
        ...mockApiDocument,
        content_type: 'DOCUMENT',
        category: null,
        s3_object_name: 'test/path.pdf',
      }
      const result = transformDocument(docWithNullCategory)
      expect(result.type).toBe('-')
    })

    it('should infer Model type for memo model_document S3 layout when category is null', () => {
      const memoModelDoc: ApiDocument = {
        ...mockApiDocument,
        content_type: 'DOCUMENT',
        category: null,
        s3_object_name:
          '1/64/document_data/94d9938d-c6a4-4f03-a8b1-f373734f558f_table_report_1.pdf',
      }
      expect(transformDocument(memoModelDoc).type).toBe('Model')
    })

    it('should not infer Model for supporting attached_documents S3 path', () => {
      const supportingDoc: ApiDocument = {
        ...mockApiDocument,
        content_type: 'DOCUMENT',
        category: null,
        s3_object_name:
          '1/64/document_data/attached_documents/8a8a2b8b-80f3-4325-ae7e-61796dd101b7_file.pdf',
      }
      expect(transformDocument(supportingDoc).type).toBe('-')
    })

    it('should use document_type for type when category is null', () => {
      const doc: ApiDocument = {
        ...mockApiDocument,
        content_type: 'DOCUMENT',
        category: null,
        document_type: 'MODELS',
      }
      expect(transformDocument(doc).type).toBe('Model')
    })

    it('should preserve actionable field value from API', () => {
      const highActionableDoc: ApiDocument = {
        ...mockApiDocument,
        actionable: 'HIGH',
      }
      const mediumActionableDoc: ApiDocument = {
        ...mockApiDocument,
        actionable: 'MEDIUM',
      }

      expect(transformDocument(highActionableDoc).actionable).toBe('HIGH')
      expect(transformDocument(mediumActionableDoc).actionable).toBe('MEDIUM')
    })

    it('should set status to completed when document is published', () => {
      const publishedDoc: ApiDocument = {
        ...mockApiDocument,
        status: 'PUBLISHED',
        published_at: '2024-10-16T12:00:00Z',
      }
      const result = transformDocument(publishedDoc)
      expect(result.status).toBe('completed')
    })

    it('should handle missing optional fields', () => {
      const incompleteDoc: ApiDocument = {
        ...mockApiDocument,
        description: null,
        extracted_text: null,
      }

      const result = transformDocument(incompleteDoc)
      expect(result.description).toBeNull()
      expect(result.extracted_text).toBeNull()
    })

    it('should handle failed status when processing fails (non-draft)', () => {
      const failedDoc: ApiDocument = {
        ...mockApiDocument,
        status: 'PROCESSING', // Not DRAFT or PUBLISHED, so uses processing statuses
        analysis_status: 'FAILED',
      }

      const result = transformDocument(failedDoc)
      expect(result.status).toBe('failed')
    })

    it('should handle pending status', () => {
      const pendingDoc: ApiDocument = {
        ...mockApiDocument,
        text_extraction_status: 'PENDING',
        chunking_status: 'PENDING',
        embedding_status: 'PENDING',
        analysis_status: 'PENDING',
      }

      const result = transformDocument(pendingDoc)
      expect(result.status).toBe('pending')
    })

    it('should handle in-progress status when processing is ongoing (non-draft)', () => {
      const inProgressDoc: ApiDocument = {
        ...mockApiDocument,
        status: 'PROCESSING', // Not DRAFT or PUBLISHED, so uses processing statuses
        text_extraction_status: 'COMPLETED',
        chunking_status: 'COMPLETED',
        embedding_status: 'PENDING',
        analysis_status: 'PENDING',
      }

      const result = transformDocument(inProgressDoc)
      expect(result.status).toBe('in-progress')
    })

    it('should format dates correctly', () => {
      const result = transformDocument(mockApiDocument)
      expect(result.date).toMatch(/Oct \d{1,2}, 2024/)
      expect(result.uploadDate).toMatch(/Oct \d{1,2}, 2024/)
      expect(result.datePublished).toMatch(/Oct \d{1,2}, 2024/)
    })

    it('should use fallback values for missing ticker', () => {
      const noTickerDoc: ApiDocument = {
        ...mockApiDocument,
        primary_company_details: {
          id: 1,
          ticker: '',
          name: 'Apple Inc.',
        },
      }

      const result = transformDocument(noTickerDoc)
      expect(result.ticker).toBe('N/A')
    })

    it('should include thesis preview when extracted_text is available', () => {
      const docWithText: ApiDocument = {
        ...mockApiDocument,
        extracted_text: 'This is the extracted text from the document...',
      }
      const result = transformDocument(docWithText)
      expect(result.thesis).toBeDefined()
      expect(result.thesis).toContain('This is the extracted text')
    })

    it('should handle long extracted_text by truncating', () => {
      const longText = 'A'.repeat(1000)
      const longTextDoc: ApiDocument = {
        ...mockApiDocument,
        extracted_text: longText,
      }

      const result = transformDocument(longTextDoc)
      expect(result.thesis).toBeDefined()
      expect(result.thesis!.length).toBeLessThanOrEqual(503) // 500 + '...'
    })

    it('should preserve LOW, NO_ACTION, and null actionable values', () => {
      const lowActionableDoc: ApiDocument = {
        ...mockApiDocument,
        actionable: 'LOW',
      }
      const noActionDoc: ApiDocument = {
        ...mockApiDocument,
        actionable: 'NO_ACTION',
      }
      const nullActionableDoc: ApiDocument = {
        ...mockApiDocument,
        actionable: null,
      }

      expect(transformDocument(lowActionableDoc).actionable).toBe('LOW')
      expect(transformDocument(noActionDoc).actionable).toBe('NO_ACTION')
      expect(transformDocument(nullActionableDoc).actionable).toBeNull()
    })
  })
})

describe('extractAttachedDocumentDownloadUrl', () => {
  it('uses legacy top-level file_url', () => {
    expect(
      extractAttachedDocumentDownloadUrl({ file_url: ' https://example.com/x ' }, 'a.pdf')
    ).toEqual({ file_url: 'https://example.com/x' })
  })

  it('uses nested attached_documents entry matched by filename', () => {
    expect(
      extractAttachedDocumentDownloadUrl(
        {
          content_id: 574,
          attached_documents: [{ filename: 'table_report_1.pdf', file_url: 'https://signed' }],
        },
        'table_report_1.pdf'
      )
    ).toEqual({ file_url: 'https://signed' })
  })

  it('surfaces per-item error when API returns 200 with error field', () => {
    const msg = 'generate_presigned_url() got an unexpected keyword argument'
    expect(
      extractAttachedDocumentDownloadUrl(
        {
          content_id: 574,
          attached_documents: [{ filename: 'table_report_1.pdf', error: msg }],
        },
        'table_report_1.pdf'
      )
    ).toEqual({ error: msg })
  })
})
