/**
 * Documents Queries (AskYourDocument backend)
 *
 * Supported endpoints:
 *   - GET  /documents?skip=&limit=
 *   - POST /documents/upload
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { documentsService, transformDocument } from '@/services/api/documents.service'

export const documentKeys = {
  all: ['documents'] as const,
  list: (skip: number, limit: number) => [...documentKeys.all, { skip, limit }] as const,
}

export function useDocuments(skip: number = 0, limit: number = 50) {
  return useQuery({
    queryKey: documentKeys.list(skip, limit),
    queryFn: async () => {
      const response = await documentsService.getDocuments(skip, limit)
      const apiDocuments = response.data ?? []
      const documents = apiDocuments.map((doc) => transformDocument(doc))
      return {
        documents,
        total: response.total ?? documents.length,
        skip: response.skip ?? skip,
        limit: response.limit ?? limit,
      }
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { file: File; prefix?: string }) => {
      return await documentsService.uploadDocument(input.file, { prefix: input.prefix })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentKeys.all })
    },
  })
}
