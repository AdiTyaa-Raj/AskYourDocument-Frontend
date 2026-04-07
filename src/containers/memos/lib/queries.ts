import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { memosService, transformMemo } from '@/services/api/memos.service'
import { documentsService } from '@/services/api/documents.service'
import { maintenanceService } from '@/services/api/maintenance.service'
import type { MaintenanceAnalystResponseItem } from '@/services/api/maintenance.service'
import type {
  CreateMemoPayload,
  UpdateMemoPayload,
  TemplateDataUploadFileRequest,
} from '@/containers/memos/lib/types'
import { documentKeys } from '@/containers/documents/lib/queries'

// Re-export the search companies hook for memos
export { useSearchCompanies as useUniverseCompanies } from '@/lib/hooks/useSearchCompanies'

// Query keys for better cache management
export const memoKeys = {
  all: ['memos'] as const,
  lists: () => [...memoKeys.all, 'list'] as const,
  list: (skip: number, limit: number) => [...memoKeys.lists(), { skip, limit }] as const,
  details: () => [...memoKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...memoKeys.details(), id] as const,
}

export function useMemos(skip: number = 0, limit: number = 25, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: memoKeys.list(skip, limit),
    queryFn: async () => {
      const response = await memosService.getMemos(skip, limit)

      if (!response.data?.memos) {
        return {
          memos: [],
          total: 0,
          skip,
          limit,
        }
      }

      // Transform API memos to UI format
      const transformedMemos = response.data.memos.map((memo) => transformMemo(memo))

      return {
        memos: transformedMemos,
        total: response.data.total,
        skip: response.data.skip,
        limit: response.data.limit,
      }
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook to fetch a single memo by ID
 */
export function useMemo(id: string | number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: memoKeys.detail(id),
    queryFn: async () => {
      const response = await memosService.getMemoById(id)
      return response.data
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to create a new memo
 */
export function useCreateMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMemoPayload) => {
      return await memosService.createMemo(data)
    },
    onSuccess: (data) => {
      // Invalidate and refetch memos list
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() })
      // Invalidate documents list (memo draft appears in documents)
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      return data
    },
  })
}

/**
 * Hook to update a memo
 */
export function useUpdateMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memoId, data }: { memoId: string | number; data: UpdateMemoPayload }) => {
      return await memosService.updateMemo(memoId, data)
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch memos list
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() })
      // Invalidate specific memo detail
      queryClient.invalidateQueries({ queryKey: memoKeys.detail(variables.memoId) })
      return data
    },
  })
}

/**
 * Hook to delete a memo
 */
export function useDeleteMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memoId: string | number) => {
      return await memosService.deleteMemo(memoId)
    },
    onSuccess: (_, memoId) => {
      // Invalidate and refetch memos list
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() })
      // Remove specific memo from cache
      queryClient.removeQueries({ queryKey: memoKeys.detail(memoId) })
    },
  })
}

/**
 * Hook to submit a memo for approval
 */
export function useSubmitMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memoId: string | number) => {
      return await memosService.submitMemo(memoId)
    },
    onSuccess: (data, memoId) => {
      // Invalidate and refetch memos list
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() })
      // Invalidate specific memo detail
      queryClient.invalidateQueries({ queryKey: memoKeys.detail(memoId) })
      // Invalidate documents list (published memo appears in documents)
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      return data
    },
  })
}

/**
 * Hook to resubmit a rejected memo for approval
 */
export function useResubmitMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      memoId,
      data,
    }: {
      memoId: string | number
      data: Record<string, unknown>
    }) => {
      return await memosService.resubmitMemo(memoId, data)
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch memos list
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() })
      // Invalidate specific memo detail
      queryClient.invalidateQueries({ queryKey: memoKeys.detail(variables.memoId) })
      return data
    },
  })
}

/**
 * Hook to reprocess a memo
 */
export function useReprocessMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      memoId,
      hardReprocess = false,
    }: {
      memoId: string | number
      hardReprocess?: boolean
    }) => {
      return await memosService.reprocessMemo(memoId, hardReprocess)
    },
    onSuccess: (_, { memoId }) => {
      // Invalidate memos list to refresh the status
      queryClient.invalidateQueries({ queryKey: memoKeys.lists() })

      // Invalidate the specific memo detail
      queryClient.invalidateQueries({ queryKey: memoKeys.detail(memoId) })
    },
  })
}

/**
 * Hook to prefetch memos
 * Useful for optimistic loading
 */
export function usePrefetchMemos() {
  const queryClient = useQueryClient()

  return (skip: number = 0, limit: number = 25) => {
    queryClient.prefetchQuery({
      queryKey: memoKeys.list(skip, limit),
      queryFn: async () => {
        const response = await memosService.getMemos(skip, limit)
        return {
          memos: response.data?.memos?.map((memo) => transformMemo(memo)) || [],
          total: response.data?.total || 0,
          skip,
          limit,
        }
      },
    })
  }
}

/**
 * Hook to fetch maintenance analysts for assignee selection
 */
export function useMaintenanceAnalysts(enabled: boolean = true) {
  return useQuery({
    queryKey: ['maintenance', 'analysts'],
    queryFn: async () => {
      const res = await maintenanceService.getAnalysts()
      const users = Array.isArray(res.data)
        ? res.data
        : ((res.data as { users?: MaintenanceAnalystResponseItem[] }).users ?? [])

      // Transform to consistent format
      return users.map((user) => ({
        id: String(user.id),
        name: user.full_name || user.name || user.email || 'Unknown',
        email: user.email,
      }))
    },
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

/**
 * Hook to generate presigned upload URLs for template data files
 */
export function useGenerateTemplateDataUploadUrls() {
  return useMutation({
    mutationFn: async (files: TemplateDataUploadFileRequest[]) => {
      const response = await memosService.generateTemplateDataUploadUrls(files)
      return response.upload_urls
    },
  })
}

/**
 * Hook to generate presigned URLs for supporting / attached documents (batch JSON body)
 */
export function useGenerateAttachedDocumentsUploadUrls() {
  return useMutation({
    mutationFn: async (files: TemplateDataUploadFileRequest[]) => {
      const response = await memosService.generateAttachedDocumentsUploadUrls(files)
      return response.upload_urls
    },
  })
}

/**
 * Hook to generate a single presigned URL for a model document (query params)
 */
export function useGenerateModelDocumentUploadUrl() {
  return useMutation({
    mutationFn: async ({ filename, content_type }: { filename: string; content_type: string }) => {
      return documentsService.generateUploadUrl(filename, content_type)
    },
  })
}

/**
 * Hook to upload a file to S3 using a presigned URL
 * Returns a function that can be used for uploading
 */
export function useUploadToS3() {
  return useMutation({
    mutationFn: async ({
      presignedUrl,
      data,
      contentType,
    }: {
      presignedUrl: string
      data: Blob | File
      contentType: string
    }) => {
      await memosService.uploadToS3(presignedUrl, data, contentType)
    },
  })
}

/**
 * Hook to upload files to S3 using presigned URLs
 * Handles the complete flow: generate URLs -> upload to S3
 */
export function useUploadTemplateFiles() {
  return useMutation({
    mutationFn: async (
      files: Array<{ data: Blob | File; filename: string; contentType: string }>
    ) => {
      // Step 1: Generate presigned URLs
      const fileRequests = files.map((f) => ({
        filename: f.filename,
        content_type: f.contentType,
      }))
      const response = await memosService.generateTemplateDataUploadUrls(fileRequests)
      const uploadUrls = response.upload_urls

      // Step 2: Upload all files to S3 in parallel
      const results = await Promise.all(
        files.map(async (file, index) => {
          const uploadInfo = uploadUrls[index]
          await memosService.uploadToS3(uploadInfo.upload_url, file.data, uploadInfo.content_type)
          return {
            filename: file.filename,
            s3_key: uploadInfo.s3_key,
            content_type: uploadInfo.content_type,
          }
        })
      )

      return results
    },
  })
}
