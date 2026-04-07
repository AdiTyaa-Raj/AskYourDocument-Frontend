'use client'

import { useMemo, type ChangeEvent, type ComponentType } from 'react'
import { AlertTriangle, ArrowLeft, FileText, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

import type {
  CompanyOption,
  MemoFieldDefinition,
  MemoFormViewProps,
  MemoFieldProps,
} from '@/containers/memos/lib/types'
import {
  countBullets,
  countWords,
  hasValidationError,
  handleWordLimitKeyDown,
  handleWordLimitPaste,
  truncateToWordLimit,
  canSubmitMemo,
  canResubmitMemo,
  getFileStatusText,
  getFileIcon,
} from '@/containers/memos/lib/helpers'
import { ALLOWED_NAVIGATION_KEYS } from '@/containers/memos/lib/constants'
import { TEMPLATE_IDS } from '@/containers/documents/lib/constants'
import { CompanySelector } from '@/components/company/CompanySelector'
import { ScreenTemplateForm } from '@/containers/memos/components/ScreenTemplateForm'
import { InvestmentMemo } from '@/containers/memos/components/InvestmentMemo'
import { GoingInVCP } from '@/containers/memos/components/GoingInVCP'
import { MaintenanceTaskForm } from '@/containers/documents/components/MaintenanceTaskForm'
import { SupportingDocumentsCard } from '@/containers/documents/components/SupportingDocumentsCard'
import { ModelUploadCard } from '@/containers/memos/components/ModelUploadCard'
import { TemplateUserMultiSelect } from '@/containers/memos/components/TemplateUserMultiSelect'

export function MemoFormView({
  template,
  formValues,
  fields,
  memoTitle,
  validationErrors,
  preloadedCompanies,
  maintenanceTask,
  analysts,
  canCreateMaintenanceTask,
  showMaintenanceWarning,
  uploadedFiles,
  isEditing = false,
  isSubmitting = false,
  isPublishing = false,
  isLoadingMemo = false,
  isViewOnly = false,
  memoStatus,
  onBack,
  onSaveAsDraft,
  onSubmitForApproval,
  onFieldChange,
  onPrimaryCompanyChange,
  onCompanyChange,
  onMaintenanceTaskToggle,
  onMaintenanceTaskChange,
  onUpload,
  onModelUpload,
  onRemoveFile,
  userMultiFieldResources,
}: MemoFormViewProps) {
  // Check if fields are enabled (when primary company is selected)
  const isFieldsEnabled = Boolean(formValues.primaryCompany)

  // Get selected company ticker for display
  const selectedCompanyTicker = useMemo(() => {
    if (!formValues.primaryCompany || !preloadedCompanies) return null
    const company = preloadedCompanies.find((c) => c.id === formValues.primaryCompany)
    return company?.ticker || null
  }, [formValues.primaryCompany, preloadedCompanies])

  const supportingUploadFiles = useMemo(
    () => uploadedFiles.filter((f) => f.type !== 'Model'),
    [uploadedFiles]
  )

  const modelUploadFiles = useMemo(
    () => uploadedFiles.filter((f) => f.type === 'Model'),
    [uploadedFiles]
  )

  // Handle company toggle for multi-select
  const handleToggleCompany = (companyId: string, companyData?: CompanyOption) => {
    const currentCompanies = (formValues.company as string[]) || []
    const isSelected = currentCompanies.includes(companyId)

    if (isSelected) {
      // Remove company
      onCompanyChange(currentCompanies.filter((id) => id !== companyId))
    } else {
      // Add company - pass company data to cache it
      onCompanyChange([...currentCompanies, companyId], companyData)
    }
  }

  // Handle removing a selected company badge
  const handleRemoveCompany = (companyId: string) => {
    const currentCompanies = (formValues.company as string[]) || []
    // No company data needed when removing
    onCompanyChange(
      currentCompanies.filter((id) => id !== companyId),
      undefined
    )
  }

  // Exclude companies for primary selection (exclude ones selected in company field)
  const excludedPrimaryCompanyIds = useMemo(() => {
    return (formValues.company as string[]) || []
  }, [formValues.company])

  // Exclude companies for company selection (exclude primary company)
  const excludedCompanyIds = useMemo(() => {
    return formValues.primaryCompany ? [formValues.primaryCompany] : []
  }, [formValues.primaryCompany])

  // Render template-specific content or standard field list
  const renderTemplateContent = () => {
    const templateProps = {
      formValues,
      validationErrors,
      onFieldChange,
      isViewOnly,
      isFieldsEnabled,
    }

    const TEMPLATE_COMPONENTS: Record<string, ComponentType<typeof templateProps>> = {
      [TEMPLATE_IDS.SCREEN]: ScreenTemplateForm,
      [TEMPLATE_IDS.INVESTMENT_MEMO]: InvestmentMemo,
      [TEMPLATE_IDS.VCP_SCREEN]: GoingInVCP,
    }

    const TemplateComponent = TEMPLATE_COMPONENTS[template.id]

    if (TemplateComponent) {
      return <TemplateComponent {...templateProps} />
    }

    // Render other templates with standard field list
    return fields.map((field) => (
      <MemoField
        key={field.id}
        field={field}
        value={String(formValues[field.id] ?? '')}
        validationErrors={validationErrors}
        onChange={onFieldChange}
        isViewOnly={isViewOnly}
        userMultiFieldResources={userMultiFieldResources}
      />
    ))
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onBack}>
            <ArrowLeft className="mr-1.5 size-3" />
            {isViewOnly ? 'Back to List' : 'Back to Templates'}
          </Button>
          <div className="bg-border h-4 w-px" />
          <div className="space-y-0.5">
            <div className="text-muted-foreground text-xs">
              {isViewOnly ? 'Viewing:' : 'Creating:'}
            </div>
            <div className="text-foreground text-sm font-medium">{template.name}</div>
          </div>
        </div>

        {/* Hide action buttons in view mode */}
        {!isViewOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-8 text-xs"
              onClick={onSaveAsDraft}
              disabled={!formValues.primaryCompany || isSubmitting || isLoadingMemo}
            >
              {isSubmitting && !isPublishing ? (
                <Loader2 className="mr-1.5 size-3 animate-spin" />
              ) : (
                <FileText className="mr-1.5 size-3" />
              )}
              {isSubmitting && !isPublishing
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Save as Draft'}
            </Button>
            {/* Show Publish for new memos or DRAFT status, Republish for REJECTED */}
            {(!isEditing || (memoStatus && canSubmitMemo(memoStatus))) && (
              <Button
                className="h-8 text-xs"
                onClick={onSubmitForApproval}
                disabled={!formValues.primaryCompany || isSubmitting || isLoadingMemo}
              >
                {isPublishing ? (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-3" />
                )}
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
            )}
            {isEditing && memoStatus && canResubmitMemo(memoStatus) && (
              <Button
                className="h-8 text-xs"
                onClick={onSubmitForApproval}
                disabled={!formValues.primaryCompany || isSubmitting || isLoadingMemo}
              >
                {isPublishing ? (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-3" />
                )}
                {isPublishing ? 'Publishing...' : 'Republish'}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-6 gap-4">
        <Card className="col-span-6 rounded-2xl border border-gray-200 bg-white lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="space-y-3">
              <div>
                <Label className="text-foreground mb-1.5 block text-xs">Memo Title</Label>
                <Input
                  type="text"
                  value={memoTitle || ''}
                  readOnly
                  placeholder="Select a company to auto-generate title"
                  className="h-9 cursor-not-allowed bg-gray-50 text-sm dark:bg-gray-800"
                  disabled={isViewOnly}
                />
              </div>

              <div>
                <Label className="text-foreground mb-1.5 block text-xs">
                  Primary Company <span className="text-destructive">*</span>
                </Label>

                <CompanySelector
                  mode="single"
                  selectedCompanyId={formValues.primaryCompany}
                  onSelectCompany={(id, companyData) => onPrimaryCompanyChange(id, companyData)}
                  onRemoveCompany={() => onPrimaryCompanyChange(undefined)}
                  excludeCompanyIds={excludedPrimaryCompanyIds}
                  placeholder="Select primary company…"
                  disabled={isViewOnly}
                  error={hasValidationError('primaryCompany', validationErrors)}
                  preloadedCompanies={preloadedCompanies}
                  isLoadingInitialData={isLoadingMemo}
                />

                {hasValidationError('primaryCompany', validationErrors) && (
                  <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
                    <AlertTriangle className="size-3" />
                    This field is required
                  </p>
                )}
              </div>

              <div>
                <Label className="text-foreground mb-1.5 block text-xs">
                  Add additional companies
                </Label>

                <CompanySelector
                  mode="multiple"
                  selectedCompanyIds={(formValues.company as string[]) || []}
                  onToggleCompany={handleToggleCompany}
                  onRemoveCompany={handleRemoveCompany}
                  excludeCompanyIds={excludedCompanyIds}
                  placeholder="Select companies…"
                  disabled={isViewOnly}
                  preloadedCompanies={preloadedCompanies}
                  isLoadingInitialData={isLoadingMemo}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">{renderTemplateContent()}</CardContent>
        </Card>

        <div className="col-span-6 space-y-4 lg:col-span-2">
          {/* Create Maintenance Task Card */}
          <Card
            className={`rounded-2xl border ${isFieldsEnabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}
          >
            <CardContent className="space-y-3 p-4">
              {/* Toggle Row */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm font-semibold text-gray-900">
                    Create Maintenance Task
                  </Label>
                  {Boolean(showMaintenanceWarning) && isFieldsEnabled && (
                    <span className="text-xs font-medium text-amber-500">
                      Only available for Watchlist and Portfolio companies
                    </span>
                  )}
                </div>
                <Switch
                  checked={formValues.createMaintenanceTask || false}
                  onCheckedChange={onMaintenanceTaskToggle}
                  disabled={!isFieldsEnabled || !canCreateMaintenanceTask || isViewOnly}
                />
              </div>

              {/* Linked Company - Only show when toggle is enabled */}
              {formValues.createMaintenanceTask && (
                <div className="border-t pt-3">
                  <MaintenanceTaskForm
                    companyTicker={selectedCompanyTicker || ''}
                    maintenanceTask={maintenanceTask}
                    analysts={analysts}
                    onTaskChange={onMaintenanceTaskChange}
                    isViewOnly={isViewOnly}
                    showCard={false}
                    showButtons={false}
                    showCompanyInfo={true}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <SupportingDocumentsCard
            isFieldsEnabled={isFieldsEnabled}
            isViewOnly={isViewOnly}
            upload={{
              onUpload,
              disabledMessage: 'Select Primary Company to enable upload',
            }}
            uploadedFiles={
              supportingUploadFiles.length > 0
                ? {
                    files: supportingUploadFiles,
                    getFileIcon,
                    getFileStatusText,
                    onRemoveFile,
                  }
                : undefined
            }
          />

          <ModelUploadCard
            isFieldsEnabled={isFieldsEnabled}
            isViewOnly={isViewOnly}
            upload={{
              onUpload: onModelUpload,
              disabledMessage: 'Select Primary Company to enable upload',
            }}
            uploadedFiles={
              modelUploadFiles.length > 0
                ? {
                    files: modelUploadFiles,
                    getFileIcon,
                    getFileStatusText,
                    onRemoveFile,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </>
  )
}

function MemoField({
  field,
  value,
  validationErrors,
  onChange,
  isViewOnly = false,
  userMultiFieldResources,
}: MemoFieldProps & { isViewOnly?: boolean }) {
  const showError = hasValidationError(field.id, validationErrors)
  const bulletCount = field.maxBullets ? countBullets(value) : undefined
  const wordCount = field.maxWords ? countWords(value) : undefined
  const exceedsWordLimit = field.maxWords && wordCount !== undefined && wordCount > field.maxWords

  const handleValueChange = (nextValue: string) => {
    if (field.maxWords && !isViewOnly) {
      const { value: limited } = truncateToWordLimit(nextValue, field.maxWords)
      onChange(field.id, limited)
      return
    }
    onChange(field.id, nextValue)
  }

  return (
    <div>
      <Label className="text-foreground mb-1.5 block text-xs">
        {field.label}
        {field.required && !isViewOnly ? <span className="text-destructive"> *</span> : null}
      </Label>
      {renderControl(field, value, handleValueChange, isViewOnly, userMultiFieldResources)}
      {(typeof wordCount === 'number' || typeof bulletCount === 'number') && (
        <div
          className={`mt-1 text-[10px] ${exceedsWordLimit ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {typeof wordCount === 'number' && field.maxWords ? (
            <span>
              {wordCount} / {field.maxWords} words
              {exceedsWordLimit && ' (limit exceeded)'}
            </span>
          ) : null}
          {typeof bulletCount === 'number' && field.maxBullets ? (
            <span>
              {typeof wordCount === 'number' && field.maxWords ? ' • ' : ''}
              {bulletCount} / {field.maxBullets} bullet points
            </span>
          ) : null}
        </div>
      )}
      {exceedsWordLimit && !isViewOnly && (
        <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
          <AlertTriangle className="size-3" />
          Word limit exceeded. Maximum {field.maxWords} words allowed.
        </p>
      )}
      {showError && !isViewOnly && (
        <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
          <AlertTriangle className="size-3" />
          This field is required
        </p>
      )}
    </div>
  )
}

function renderControl(
  field: MemoFieldDefinition,
  value: string,
  onChange: (value: string) => void,
  isViewOnly: boolean = false,
  userMultiFieldResources: MemoFieldProps['userMultiFieldResources']
) {
  const wordCount = field.maxWords ? countWords(value) : undefined
  const exceedsWordLimit = field.maxWords && wordCount !== undefined && wordCount > field.maxWords

  const baseProps = {
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    placeholder: field.placeholder,
    disabled: isViewOnly,
    className: isViewOnly ? 'cursor-not-allowed opacity-60 bg-gray-50' : '',
  }

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          {...baseProps}
          rows={field.maxBullets ? 4 : 3}
          className={`text-xs ${baseProps.className} ${exceedsWordLimit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          onKeyDown={(e) =>
            handleWordLimitKeyDown(e, field, value, isViewOnly, ALLOWED_NAVIGATION_KEYS)
          }
          onPaste={(e) => handleWordLimitPaste(e, field, value, onChange, isViewOnly)}
        />
      )
    case 'select':
      return (
        <Select value={value} onValueChange={onChange} disabled={isViewOnly}>
          <SelectTrigger
            className={`h-9 text-xs ${isViewOnly ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
          >
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.selectOptions ?? []).map((option: string) => (
              <SelectItem key={option} value={option} className="text-xs">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'number':
      return (
        <Input
          {...baseProps}
          type="number"
          step={field.step}
          className={`h-9 text-xs ${baseProps.className}`}
        />
      )
    case 'date':
    case 'datetime-local': {
      const today = new Date()
      const minDate =
        field.disallowPastDates && field.type === 'date'
          ? today.toISOString().split('T')[0]
          : undefined
      const minDateTime =
        field.disallowPastDates && field.type === 'datetime-local'
          ? today.toISOString().slice(0, 16)
          : undefined
      const min = minDate ?? minDateTime
      return (
        <Input
          {...baseProps}
          type={field.type}
          min={min}
          className={`h-9 text-xs ${baseProps.className}`}
        />
      )
    }
    case 'url':
      return <Input {...baseProps} type="url" className={`h-9 text-xs ${baseProps.className}`} />
    case 'user_multi':
      return (
        <TemplateUserMultiSelect
          value={value}
          onChange={onChange}
          disabled={isViewOnly}
          placeholder={field.placeholder}
          helperText={field.helperText}
          fetchUsersByIds={userMultiFieldResources.fetchUsersByIds}
          mentionPicker={userMultiFieldResources.mentionPicker}
        />
      )
    case 'yesno':
      return (
        <Select value={value} onValueChange={onChange} disabled={isViewOnly}>
          <SelectTrigger
            className={`h-9 text-xs ${isViewOnly ? 'cursor-not-allowed bg-gray-50 opacity-60' : ''}`}
          >
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes" className="text-xs">
              Yes
            </SelectItem>
            <SelectItem value="no" className="text-xs">
              No
            </SelectItem>
          </SelectContent>
        </Select>
      )
    case 'text':
    default:
      return <Input {...baseProps} type="text" className={`h-9 text-xs ${baseProps.className}`} />
  }
}
