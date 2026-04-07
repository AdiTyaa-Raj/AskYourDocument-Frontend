'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { TemplateSelectionPage } from '@/containers/memos/components/TemplateSelectionPage'
import { useUploadDocument } from '@/containers/documents/lib'
import type { DocumentMetadata } from '@/containers/documents/lib/types'
import type { TemplateSelectionContainerProps } from '@/containers/memos/lib/types'
import {
  DOCUMENT_TYPE_TO_API_MAP,
  ACTIONABLE_TO_API_MAP,
} from '@/containers/documents/lib/constants'
import notify from '@/lib/notifications'

export function TemplateSelectionContainer({ onSelect }: TemplateSelectionContainerProps = {}) {
  const router = useRouter()
  const uploadMutation = useUploadDocument()

  const handleUploadDocument = useCallback(
    async (file: File, metadata: DocumentMetadata) => {
      // Convert primary company ID and company IDs from strings to integers as required by API
      const primaryCompanyId = parseInt(metadata.primaryCompany, 10)
      const companyIdsAsIntegers = metadata.companies.map((id) => parseInt(id, 10))

      const uploadPayload = {
        title: file.name, // Use filename as title
        uploaded_by: 'current-user',
        description: metadata.rationale || `Uploaded ${file.name}`,
        primary_company_id: primaryCompanyId,
        company_ids: companyIdsAsIntegers,
        category:
          DOCUMENT_TYPE_TO_API_MAP[metadata.documentType] ||
          metadata.documentType.toUpperCase().replace(/-/g, '_'),
        actionable:
          ACTIONABLE_TO_API_MAP[metadata.actionable] ||
          metadata.actionable.toUpperCase().replace(/-/g, '_'),
        publish: true, // Publish immediately
      }

      // Show uploading notification
      const uploadingToast = notify.loading({
        title: 'Uploading document...',
        description: `Uploading ${file.name}`,
      })

      try {
        await uploadMutation.mutateAsync({
          file,
          metadata: uploadPayload,
        })

        // Dismiss loading toast and show success
        notify.dismiss(uploadingToast)
        notify.success({
          title: 'Document Published',
          description: `${file.name} has been uploaded and published successfully. Redirecting to documents...`,
        })

        setTimeout(() => {
          router.push('/documents')
        }, 1000)
      } catch (error) {
        // Dismiss loading toast
        notify.dismiss(uploadingToast)
        // Re-throw the error so the component can handle it
        throw error
      }
    },
    [uploadMutation, router]
  )

  return (
    <TemplateSelectionPage
      onSelect={onSelect}
      onUploadDocument={handleUploadDocument}
      isUploadPending={uploadMutation.isPending}
    />
  )
}
