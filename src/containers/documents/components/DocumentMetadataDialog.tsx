'use client'

import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { notify } from '@/lib/notifications'
import { DOCUMENT_TYPE_OPTIONS, ACTIONABLE_OPTIONS } from '../lib/constants'
import type { DocumentMetadataDialogProps } from '../lib/types'
import { CompanySelector } from '@/components/company/CompanySelector'

export function DocumentMetadataDialog({
  open,
  onOpenChange,
  onSubmit,
  fileName,
  isLoading = false,
}: DocumentMetadataDialogProps) {
  const [primaryCompany, setPrimaryCompany] = useState<string>('')
  const [companies, setCompanies] = useState<string[]>([])
  const [documentType, setDocumentType] = useState('')
  const [actionable, setActionable] = useState('')
  const [rationale, setRationale] = useState('')

  // Handle company toggle for multi-select
  const handleToggleCompany = (companyId: string) => {
    const isSelected = companies.includes(companyId)

    if (isSelected) {
      // Remove company
      setCompanies(companies.filter((id) => id !== companyId))
    } else {
      // Add company
      setCompanies([...companies, companyId])
    }
  }

  // Handle removing a selected company badge
  const handleRemoveCompany = (companyId: string) => {
    setCompanies(companies.filter((id) => id !== companyId))
  }

  // Exclude companies for primary selection (exclude ones selected in company field)
  const excludedPrimaryCompanyIds = useMemo(() => {
    return companies
  }, [companies])

  // Exclude companies for company selection (exclude primary company)
  const excludedCompanyIds = useMemo(() => {
    return primaryCompany ? [primaryCompany] : []
  }, [primaryCompany])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!primaryCompany) {
      notify.error({
        title: 'Primary Company Required',
        description: 'Please select a primary company',
      })
      return
    }

    if (!documentType) {
      notify.error({
        title: 'Document Type Required',
        description: 'Please select a document type',
      })
      return
    }

    if (!actionable) {
      notify.error({
        title: 'Actionable Required',
        description: 'Please select an actionable option',
      })
      return
    }

    onSubmit({
      primaryCompany,
      companies,
      documentType,
      actionable,
      rationale,
    })

    // Reset form
    setPrimaryCompany('')
    setCompanies([])
    setDocumentType('')
    setActionable('')
    setRationale('')
  }

  const handleCancel = () => {
    // Reset form
    setPrimaryCompany('')
    setCompanies([])
    setDocumentType('')
    setActionable('')
    setRationale('')
    onOpenChange(false)
  }

  const isFormValid = primaryCompany && documentType && actionable

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
        onInteractOutside={(e) => {
          // Allow interaction with popovers
          const target = e.target as HTMLElement
          if (
            target.closest('[role="dialog"]') ||
            target.closest('[data-radix-popper-content-wrapper]')
          ) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-semibold">Document Metadata</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Please provide metadata for the uploaded document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Primary Company Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="primaryCompany" className="text-sm font-medium">
              Primary Company <span className="text-red-500">*</span>
            </Label>

            <CompanySelector
              mode="single"
              selectedCompanyId={primaryCompany}
              onSelectCompany={(id) => setPrimaryCompany(id)}
              onRemoveCompany={() => setPrimaryCompany('')}
              excludeCompanyIds={excludedPrimaryCompanyIds}
              placeholder="Select primary company..."
              disabled={isLoading}
            />
          </div>

          {/* Company/Ticker Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-sm font-medium">
              Add additional companies
            </Label>

            <CompanySelector
              mode="multiple"
              selectedCompanyIds={companies}
              onToggleCompany={handleToggleCompany}
              onRemoveCompany={handleRemoveCompany}
              excludeCompanyIds={excludedCompanyIds}
              placeholder="Select companies..."
              disabled={isLoading}
            />
          </div>

          {/* Document Type */}
          <div className="space-y-1.5">
            <Label htmlFor="documentType" className="text-sm font-medium">
              Document Type <span className="text-red-500">*</span>
            </Label>
            <Select value={documentType} onValueChange={setDocumentType} disabled={isLoading}>
              <SelectTrigger
                id="documentType"
                className="w-full border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
              >
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actionable */}
          <div className="space-y-1.5">
            <Label htmlFor="actionable" className="text-sm font-medium">
              Actionable <span className="text-red-500">*</span>
            </Label>
            <Select value={actionable} onValueChange={setActionable} disabled={isLoading}>
              <SelectTrigger
                id="actionable"
                className="w-full border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
              >
                <SelectValue placeholder="Select actionable level..." />
              </SelectTrigger>
              <SelectContent>
                {ACTIONABLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rationale */}
          <div className="space-y-1.5">
            <Label htmlFor="rationale" className="text-sm font-medium">
              Rationale
            </Label>
            <Textarea
              id="rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Summarize the rationale..."
              className="min-h-[100px] resize-y border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
              disabled={isLoading}
            />
          </div>

          {fileName && (
            <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-300">
              <strong>File:</strong> {fileName}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="border-gray-300 dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 size-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                'Save & Publish'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
