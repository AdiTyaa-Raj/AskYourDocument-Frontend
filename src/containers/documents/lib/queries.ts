/**
 * Documents Queries
 * TanStack Query hooks for documents-related data fetching
 */

import { useCallback } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentsService, transformDocument } from '@/services/api/documents.service'
import { usersService } from '@/services/api/users.service'
import { DOCUMENT_AUTHOR_USERS_PAGE_SIZE } from '@/containers/documents/lib/constants'
import type {
  DocumentAuthorUsersPage,
  DocumentChatRequest,
  DocumentChatResponse,
  DocumentChatStatus,
  ReprocessDocumentMutationVariables,
  UpdateContentMutationVariables,
  UploadDocumentMutationInput,
  UseDocumentsOptions,
} from '@/containers/documents/lib/types'

// Query keys for better cache management
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (
    skip: number,
    limit: number,
    search?: string,
    category?: string,
    status?: string,
    authorId?: number,
    filters?: Record<string, unknown>
  ) =>
    [
      ...documentKeys.lists(),
      { skip, limit, search, category, status, authorId, filters },
    ] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...documentKeys.details(), id] as const,
  relatedDocuments: () => [...documentKeys.all, 'related'] as const,
  relatedDocumentsForCompany: (companyId: number | null) =>
    [...documentKeys.relatedDocuments(), companyId] as const,
  chatStatuses: () => [...documentKeys.all, 'chat-status'] as const,
  chatStatus: (documentId: number) => [...documentKeys.chatStatuses(), documentId] as const,
  chats: () => [...documentKeys.all, 'chat'] as const,
  chat: (contentId: number, chatId?: number) =>
    [...documentKeys.chats(), contentId, chatId] as const,
  memoTemplateUrls: (contentId: number) =>
    [...documentKeys.all, 'memo-template-urls', contentId] as const,
  authorUsers: () => [...documentKeys.all, 'author-users'] as const,
  authorUsersInfinite: (pageSize: number) =>
    [...documentKeys.authorUsers(), 'infinite', pageSize] as const,
}

/**
 * Hook to fetch documents with pagination, search, and filters
 * Supports native API parameters: search, category, status, sort
 */
export function useDocuments(skip: number = 0, limit: number = 100, options?: UseDocumentsOptions) {
  const search = options?.search
  const category = options?.category
  const status = options?.status
  const authorId = options?.authorId
  const filters = options?.filters

  return useQuery({
    queryKey: documentKeys.list(skip, limit, search, category, status, authorId, filters),
    queryFn: async () => {
      const response = await documentsService.getDocuments(skip, limit, {
        search,
        category,
        status: options?.status,
        sort: options?.sort,
        authorId: options?.authorId,
        filters,
      })

      const apiDocuments = response.data ?? []

      // Transform API documents to UI format
      const transformedDocs = apiDocuments.map((doc) => transformDocument(doc))

      // Remove duplicates based on document ID
      const uniqueDocs = transformedDocs.filter(
        (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
      )

      return {
        documents: uniqueDocs,
        total: response.total ?? uniqueDocs.length,
        skip: response.skip ?? skip,
        limit: response.limit ?? limit,
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Paginated organization users for the Documents "All Authors" filter.
 * Fetches `DOCUMENT_AUTHOR_USERS_PAGE_SIZE` rows per request; use `fetchNextPage` when the list is scrolled near the bottom.
 */
export function useDocumentAuthorUsersInfinite(enabled: boolean) {
  const pageSize = DOCUMENT_AUTHOR_USERS_PAGE_SIZE
  return useInfiniteQuery<DocumentAuthorUsersPage, Error>({
    queryKey: documentKeys.authorUsersInfinite(pageSize),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const skip = pageParam as number
      const { users, total } = await usersService.listUsers(skip, pageSize)
      return { users, total }
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((acc, p) => acc + p.users.length, 0)
      if (lastPage.users.length === 0 || totalLoaded >= lastPage.total) {
        return undefined
      }
      return totalLoaded
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}

/**
 * Hook to fetch a single document by ID
 */
export function useDocument(id: string | number) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => {
      const response = await documentsService.getDocumentById(id)
      return {
        document: transformDocument(response.data),
        rawApiDocument: response.data,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Helper function to extract company_id from document
 * Checks in order: primary_company_id field, doc_metadata, schema_data, company_ids array
 */
export function extractCompanyIdFromDocument(
  docMetadata: Record<string, unknown> | null,
  schemaData: Record<string, unknown> | null,
  primaryCompanyId?: number
): number | null {
  // First, try primary_company_id from the API document
  if (typeof primaryCompanyId === 'number') {
    return primaryCompanyId
  }

  // Try to get company_id from doc_metadata
  if (docMetadata) {
    // Check primary_company_id in doc_metadata
    if (typeof docMetadata.primary_company_id === 'number') {
      return docMetadata.primary_company_id
    }
    // Check if company_id exists directly
    if (typeof docMetadata.company_id === 'number') {
      return docMetadata.company_id
    }
    // Check if company_ids array exists and get first one
    if (Array.isArray(docMetadata.company_ids) && docMetadata.company_ids.length > 0) {
      const firstId = docMetadata.company_ids[0]
      if (typeof firstId === 'number') {
        return firstId
      }
      if (typeof firstId === 'string') {
        const parsed = parseInt(firstId, 10)
        if (!isNaN(parsed)) {
          return parsed
        }
      }
    }
  }

  // Try schema_data as fallback
  if (schemaData) {
    // Check primary_company_id in schema_data
    if (typeof schemaData.primary_company_id === 'number') {
      return schemaData.primary_company_id
    }
    if (typeof schemaData.company_id === 'number') {
      return schemaData.company_id
    }
    if (Array.isArray(schemaData.company_ids) && schemaData.company_ids.length > 0) {
      const firstId = schemaData.company_ids[0]
      if (typeof firstId === 'number') {
        return firstId
      }
      if (typeof firstId === 'string') {
        const parsed = parseInt(firstId, 10)
        if (!isNaN(parsed)) {
          return parsed
        }
      }
    }
  }

  return null
}

/**
 * Hook to upload a document using S3 presigned URL
 * This is the preferred upload method as it:
 * 1. Uploads directly to S3 (faster, no backend bottleneck)
 * 2. Reduces backend server load
 * 3. Provides better error handling for S3 vs backend issues
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, metadata }: UploadDocumentMutationInput) => {
      return await documentsService.uploadDocumentWithPresignedUrl(file, metadata)
    },
    onSuccess: (data) => {
      // Invalidate and refetch documents list
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      return data
    },
  })
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (docId: string | number) => {
      return await documentsService.deleteDocument(docId)
    },
    onSuccess: (_, docId) => {
      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

      // Remove the specific document from cache
      queryClient.removeQueries({ queryKey: documentKeys.detail(docId) })
    },
  })
}

/**
 * Hook to invalidate document detail.
 * Use after save/publish so the detail view refetches without full reload.
 */
export function useInvalidateDocumentDetail() {
  const queryClient = useQueryClient()
  return useCallback(
    (documentId: string | number) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) })
    },
    [queryClient]
  )
}

/**
 * Hook to update content (PATCH)
 * Used for saving drafts or publishing documents
 */
export function useUpdateContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contentId, data }: UpdateContentMutationVariables) => {
      return await documentsService.updateContent(contentId, data)
    },
    onSuccess: (_, { contentId }) => {
      // Invalidate documents list to refresh the list
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

      // Invalidate the specific document detail to refresh the data
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(contentId) })
    },
  })
}

/**
 * Hook to reprocess a document
 */
export function useReprocessDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ docId, hardReprocess = false }: ReprocessDocumentMutationVariables) => {
      return await documentsService.reprocessDocument(docId, hardReprocess)
    },
    onSuccess: (_, { docId }) => {
      // Invalidate documents list to refresh the status
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

      // Invalidate the specific document detail
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(docId) })
    },
  })
}

/**
 * Hook to get presigned URL for document file
 */
export function useDocumentFileUrl(
  docId: string | number,
  options?: {
    expiresIn?: number
    enabled?: boolean
  }
) {
  const expiresIn = options?.expiresIn ?? 3600
  const enabled = options?.enabled ?? false

  return useQuery({
    queryKey: [...documentKeys.detail(docId), 'file-url'],
    queryFn: async () => {
      return await documentsService.getDocumentFileUrl(docId, expiresIn)
    },
    enabled, // Can be enabled for auto-loading
    staleTime: expiresIn * 1000 - 60000, // Expire 1 minute before URL expires
  })
}

/**
 * Mutation hook to get document file URL for download
 * Used for imperative download actions (click handlers)
 */
export function useGetDocumentFileUrl() {
  return useMutation({
    mutationFn: async (docId: number) => {
      return await documentsService.getDocumentFileUrl(docId)
    },
  })
}

/**
 * Hook to prefetch documents
 * Useful for optimistic loading
 */
export function usePrefetchDocuments() {
  const queryClient = useQueryClient()

  return (skip: number = 0, limit: number = 100) => {
    queryClient.prefetchQuery({
      queryKey: documentKeys.list(skip, limit),
      queryFn: async () => {
        const response = await documentsService.getDocuments(skip, limit)
        const transformed = response.data?.map((doc) => transformDocument(doc)) || []
        return {
          documents: transformed,
          total: response.total ?? transformed.length,
          skip: response.skip ?? skip,
          limit: response.limit ?? limit,
        }
      },
    })
  }
}

/**
 * Build company filters for fetching related documents
 * Same format as pipeline and watchlist
 */
function buildCompanyFilters(companyId?: number | null) {
  if (companyId === undefined || companyId === null) return undefined
  return {
    __or__: [{ primary_company_id__eq: companyId }, { company_ids__contains_value: [companyId] }],
  }
}

/**
 * Hook to fetch related documents based on company ID
 * Uses filters to find documents with matching primary_company_id or company_ids
 */
export function useRelatedDocuments(companyId: number | null, currentDocumentId?: string | number) {
  return useQuery({
    queryKey: documentKeys.relatedDocumentsForCompany(companyId),
    queryFn: async () => {
      if (!companyId) {
        return []
      }

      const filters = buildCompanyFilters(companyId)
      const response = await documentsService.getDocuments(0, 10, { filters })

      // Transform API documents to RelatedDocument format
      const relatedDocs = response.data
        ?.filter((doc) => {
          // Exclude the current document from related documents
          if (currentDocumentId && doc.id === Number(currentDocumentId)) {
            return false
          }
          return true
        })
        .map((doc) => ({
          id: doc.id.toString(),
          title: doc.original_filename || doc.filename || 'Untitled Document',
          date: new Date(doc.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        }))

      return relatedDocs || []
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to check if document is ready for chat
 */
export function useDocumentChatStatus(documentId: string | number) {
  const numericId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId

  return useQuery<DocumentChatStatus>({
    queryKey: documentKeys.chatStatus(numericId),
    queryFn: async () => {
      try {
        return await documentsService.getDocumentChatStatus(numericId)
      } catch (error) {
        // Silently handle 403 and 404 errors for optional chat feature
        const axiosError = error as { response?: { status?: number } }
        if (axiosError?.response?.status === 403 || axiosError?.response?.status === 404) {
          // Return a default "not ready" status instead of throwing
          return { ready: false, message: 'Chat feature not available' } as DocumentChatStatus
        }
        // Re-throw other errors
        throw error
      }
    },
    enabled: !!documentId && Number.isInteger(numericId) && numericId > 0,
    retry: (failureCount, error: Error) => {
      // Don't retry on 403 (permission denied) or 404 (not found)
      const axiosError = error as { response?: { status?: number } }
      if (axiosError?.response?.status === 403 || axiosError?.response?.status === 404) {
        return false
      }
      // Retry other errors up to 2 times
      return failureCount < 2
    },
    refetchInterval: (query) => {
      // Don't refetch if there's an error
      if (query.state.error) {
        return false
      }
      // If document is not ready, refetch every 5 seconds
      const data = query.state.data
      return data && !data.ready ? 5000 : false
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to send a chat message
 */
export function useSendChatMessage() {
  const queryClient = useQueryClient()

  return useMutation<DocumentChatResponse, Error, DocumentChatRequest>({
    mutationFn: async (request: DocumentChatRequest) => {
      return await documentsService.sendDocumentChatMessage(request)
    },
    onSuccess: (data, variables) => {
      // Optionally invalidate queries if needed
      queryClient.setQueryData(documentKeys.chat(variables.content_id, data.chat_id), data)
    },
  })
}

/**
 * Hook to fetch presigned URLs for memo template S3 keys (e.g., supporting chart images)
 * Used to display images in view mode for published memos
 */
export function useMemoTemplateUrls(
  contentId: number | null,
  options?: {
    expiresIn?: number
    enabled?: boolean
  }
) {
  const expiresIn = options?.expiresIn ?? 3600
  const enabled = options?.enabled ?? true

  return useQuery({
    queryKey: documentKeys.memoTemplateUrls(contentId ?? 0),
    queryFn: async () => {
      if (!contentId) return { urls: {} }
      return await documentsService.getMemoTemplateUrls(contentId, expiresIn)
    },
    enabled: enabled && !!contentId,
    staleTime: expiresIn * 1000 - 60000, // Expire 1 minute before URL expires
    gcTime: expiresIn * 1000, // Cache for the duration of the URL expiry
  })
}
