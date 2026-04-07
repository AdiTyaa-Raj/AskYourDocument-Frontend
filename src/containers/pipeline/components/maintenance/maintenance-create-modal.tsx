'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Check, Search } from 'lucide-react'

import { Sheet, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FloatingSideSheetContent } from '@/components/shared/FloatingSideSheet'

import type {
  MaintenanceAssignee,
  MaintenanceCompany,
} from '@/containers/pipeline/lib/maintenance-types'

interface MaintenanceCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: MaintenanceCompany[]
  analysts: MaintenanceAssignee[]
  onAssigneeDropdownOpen?: () => void
  onAssigneeSearch?: (query: string) => void
  onAssigneeLoadMore?: () => void
  analystHasMore?: boolean
  analystLoading?: boolean
  onCompanySearch?: (query: string) => void
  companySearchTerm?: string
  companySearchSubmitted?: boolean
  isCompanyLoading?: boolean
  isSubmitting?: boolean
  onCreate: (payload: {
    title: string
    companyId?: number | string
    ticker: string
    action: string
    due_date: string
    assignees: MaintenanceAssignee[]
    important?: boolean
  }) => void
}

export function MaintenanceCreateModal({
  open,
  onOpenChange,
  companies,
  analysts,
  onAssigneeDropdownOpen,
  onAssigneeSearch,
  onAssigneeLoadMore,
  analystHasMore = false,
  analystLoading = false,
  onCompanySearch,
  companySearchTerm,
  companySearchSubmitted = false,
  isCompanyLoading = false,
  isSubmitting = false,
  onCreate,
}: MaintenanceCreateModalProps) {
  const assigneeInputRef = useRef<HTMLInputElement | null>(null)
  const getStageBadgeLabel = (label?: string) => {
    if (!label) return 'PORTFOLIO'
    const lower = label.toLowerCase()
    if (lower.includes('watchlist')) return 'WATCHLIST'
    if (lower.includes('invested') || lower.includes('portfolio')) return 'PORTFOLIO'
    return label
  }

  const availableCompanies = useMemo(() => companies, [companies])
  const [selectedTicker, setSelectedTicker] = useState('')
  const [companySearch, setCompanySearch] = useState(companySearchTerm ?? '')
  const [title, setTitle] = useState('')
  const [actionItem, setActionItem] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignees, setAssignees] = useState<MaintenanceAssignee[]>([])
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [assigneeSearchSubmitted, setAssigneeSearchSubmitted] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showAssigneeHint, setShowAssigneeHint] = useState(false)
  const [isImportant, setIsImportant] = useState(false)
  const lastCompanyId = useRef<string | number | undefined>(undefined)

  const selectedCompany = useMemo(
    () => availableCompanies.find((company) => company.ticker === selectedTicker),
    [availableCompanies, selectedTicker]
  )

  useEffect(() => {
    if (selectedCompany) {
      setCompanySearch(`${selectedCompany.ticker} · ${selectedCompany.name}`)
      type NamedAssignee = { id?: string | number; name: string }
      const defaultsRaw: NamedAssignee[] = []

      const addDefaultAssignee = (id?: string | number, name?: string) => {
        if (!name) return
        defaultsRaw.push({
          id: id ?? name,
          name,
        })
      }

      addDefaultAssignee(selectedCompany.primaryAnalystId, selectedCompany.primaryAnalyst)
      addDefaultAssignee(selectedCompany.secondaryAnalystId, selectedCompany.secondaryAnalyst)
      ;(selectedCompany.assignees ?? []).forEach((person) => {
        const name = person.full_name ?? person.name ?? person.email ?? String(person.id ?? '')
        if (name) {
          defaultsRaw.push({ id: person.id ?? name, name })
        }
      })

      const uniqueByIdOrName = defaultsRaw.reduce<Array<NamedAssignee>>((acc, curr) => {
        const exists = acc.some(
          (item) =>
            (item.id && curr.id && String(item.id) === String(curr.id)) ||
            item.name.toLowerCase() === curr.name.toLowerCase()
        )
        if (!exists) acc.push(curr)
        return acc
      }, [])

      const currentCompanyKey = selectedCompany.id ?? selectedCompany.ticker ?? selectedCompany.name
      if (lastCompanyId.current !== currentCompanyKey) {
        setAssignees(uniqueByIdOrName.slice(0, 2))
        setAssigneeSearch('')
        setAssigneeSearchSubmitted(false)
        lastCompanyId.current = currentCompanyKey
      }
    }
  }, [selectedCompany])

  useEffect(() => {
    if (!open) {
      setSelectedTicker('')
      setCompanySearch(companySearchTerm ?? '')
      setTitle('')
      setActionItem('')
      setDueDate('')
      setAssignees([])
      setAssigneeSearch('')
      setAssigneeSearchSubmitted(false)
      setShowAssigneeDropdown(false)
      setShowAssigneeHint(false)
      setIsImportant(false)
      lastCompanyId.current = undefined
    }
  }, [open, companySearchTerm])

  const isFormValid = Boolean(
    selectedTicker && title.trim() && actionItem.trim() && dueDate && assignees.length === 2
  )

  const handleCreate = () => {
    if (!isFormValid) return
    onCreate({
      title: title.trim(),
      companyId: selectedCompany?.id,
      ticker: selectedTicker,
      action: actionItem.trim(),
      due_date: dueDate,
      assignees,
      important: isImportant,
    })
  }

  const handleToggleAssignee = (personKey: string, person: MaintenanceAssignee) => {
    setAssignees((prev) => {
      if (prev.some((item) => String(item.id ?? item.name) === personKey)) {
        return prev.filter((item) => String(item.id ?? item.name) !== personKey)
      }
      if (prev.length >= 2) return prev
      return [
        ...prev,
        {
          ...person,
          id: person.id ?? personKey,
        },
      ]
    })
    setShowAssigneeDropdown(true)
  }

  const handleRemoveAssignee = (person: MaintenanceAssignee) => {
    setAssignees((prev) =>
      prev.filter((item) => String(item.id ?? item.name) !== String(person.id ?? person.name))
    )
    setShowAssigneeDropdown(false)
  }

  const handleAssigneeSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const query = assigneeSearch.trim()
    setAssigneeSearch(query)
    setAssigneeSearchSubmitted(true)
    setShowAssigneeDropdown(true)
    onAssigneeSearch?.(query)
  }

  const availableAnalysts = useMemo(() => {
    const base = analysts.map((analyst) => ({
      ...analyst,
      id: analyst.id ?? analyst.name ?? analyst.email ?? String(analyst.id ?? ''),
      name: analyst.name || analyst.email || String(analyst.id),
    }))

    const extras = assignees.filter(
      (assignee) =>
        !base.some((opt) => {
          const optKey = String(opt.id ?? opt.name)
          const assigneeKey = String(assignee.id ?? assignee.name)
          return optKey === assigneeKey
        })
    )

    return [...base, ...extras]
  }, [analysts, assignees])

  const filteredCompanies = useMemo(() => {
    const term = companySearch.trim().toLowerCase()
    if (!term) return availableCompanies
    return availableCompanies.filter(
      (company) =>
        company.ticker.toLowerCase().includes(term) || company.name.toLowerCase().includes(term)
    )
  }, [availableCompanies, companySearch])

  const handleSelectCompany = (ticker: string) => {
    const company = availableCompanies.find((item) => item.ticker === ticker)
    setSelectedTicker(ticker)
    if (company) {
      setCompanySearch(`${company.ticker} · ${company.name}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <FloatingSideSheetContent side="right" className="flex h-full flex-col p-0">
        <SheetTitle className="sr-only">Create Maintenance Task</SheetTitle>
        <SheetDescription className="sr-only">
          Create a new maintenance task and assign collaborators.
        </SheetDescription>

        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">Create Maintenance Task</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="maintenance-company" className="text-xs font-medium text-gray-700">
              Company / Ticker <span className="text-red-600">*</span>
            </Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="maintenance-company"
                value={companySearch}
                onChange={(event) => {
                  setCompanySearch(event.target.value)
                  setSelectedTicker('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const query = companySearch.trim()
                    if (query) {
                      onCompanySearch?.(query)
                    }
                  }
                }}
                placeholder="Search by ticker or company name..."
                className="h-10 w-full pl-10 text-xs"
                autoComplete="off"
              />
              {selectedCompany ? (
                <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] font-medium',
                      (selectedCompany.stageLabel ?? '').toLowerCase() === 'watchlist' ||
                        (selectedCompany.stageLabel ?? '').toLowerCase() === 'airplane mode'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {getStageBadgeLabel(selectedCompany.stageLabel)}
                  </Badge>
                </div>
              ) : null}
              {companySearch.trim().length > 0 && !selectedTicker && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-sm">
                  {!companySearchSubmitted ? (
                    <div className="px-3 py-2 text-xs text-gray-500">Press Enter to search</div>
                  ) : isCompanyLoading ? (
                    <div className="px-3 py-2 text-xs text-gray-500">Loading...</div>
                  ) : filteredCompanies.length > 0 ? (
                    filteredCompanies.map((company) => (
                      <button
                        key={company.ticker}
                        type="button"
                        onClick={() => handleSelectCompany(company.ticker)}
                        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{company.ticker}</span>
                          <span className="text-gray-600">- {company.name}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] font-medium',
                            (company.stageLabel ?? '').toLowerCase() === 'watchlist' ||
                              (company.stageLabel ?? '').toLowerCase() === 'airplane mode'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {getStageBadgeLabel(company.stageLabel)}
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-500">No results</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
              Assignment
            </p>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">
              Assign To <span className="text-red-600">*</span>
            </Label>
            {assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignees.map((person) => {
                  const personKey = String(person.id ?? person.name)
                  return (
                    <div
                      key={personKey}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] text-gray-800"
                    >
                      <span>{person.name}</span>
                      <button
                        type="button"
                        className="cursor-pointer text-gray-500 transition-colors hover:text-gray-800"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          handleRemoveAssignee(person)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : null}

            <div className="relative">
              <div
                className={cn(
                  'border-input bg-background flex h-10 cursor-text items-center rounded-md border pr-2 pl-3 text-xs shadow-sm transition-colors',
                  !selectedCompany && 'cursor-not-allowed bg-gray-50'
                )}
                onClick={() => {
                  if (!selectedCompany) {
                    setShowAssigneeHint(true)
                    return
                  }
                  onAssigneeDropdownOpen?.()
                  setShowAssigneeDropdown(true)
                }}
              >
                <Search className="mr-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  ref={assigneeInputRef}
                  value={assigneeSearch}
                  onChange={(event) => {
                    setAssigneeSearch(event.target.value)
                    setAssigneeSearchSubmitted(false)
                    setShowAssigneeDropdown(true)
                  }}
                  onFocus={() => {
                    if (selectedCompany) {
                      onAssigneeDropdownOpen?.()
                      setShowAssigneeDropdown(true)
                    }
                  }}
                  onKeyDown={(event) => handleAssigneeSearchKeyDown(event)}
                  onBlur={() =>
                    setTimeout(() => {
                      setShowAssigneeDropdown(false)
                    }, 150)
                  }
                  className="h-full w-full border-none bg-transparent text-xs outline-none placeholder:text-gray-400"
                  placeholder="Select assignees..."
                  disabled={!selectedCompany}
                />
              </div>

              {!selectedCompany && showAssigneeHint ? (
                <div className="mt-1.5 rounded border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] text-blue-700">
                  Choose company first to select assignees
                </div>
              ) : null}

              {showAssigneeDropdown && selectedCompany && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {assigneeSearch.trim().length > 0 && !assigneeSearchSubmitted ? (
                    <div className="px-3 py-2 text-xs text-gray-500">Press Enter to search</div>
                  ) : analystLoading ? (
                    <div className="px-3 py-2 text-xs text-gray-500">Loading...</div>
                  ) : availableAnalysts.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No results</div>
                  ) : (
                    <>
                      {availableAnalysts
                        .filter((person) =>
                          assigneeSearch.trim()
                            ? person.name
                                .toLowerCase()
                                .includes(assigneeSearch.trim().toLowerCase())
                            : true
                        )
                        .map((person) => {
                          const personKey = String(person.id ?? person.name)
                          const isSelected = assignees.some(
                            (item) => String(item.id ?? item.name) === personKey
                          )
                          const atLimit = assignees.length >= 2 && !isSelected
                          return (
                            <button
                              key={personKey}
                              type="button"
                              disabled={atLimit}
                              onMouseDown={(event) => {
                                event.preventDefault()
                                handleToggleAssignee(personKey, person)
                              }}
                              className={cn(
                                'flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50',
                                atLimit && 'cursor-not-allowed opacity-50'
                              )}
                            >
                              <span
                                className={cn(
                                  'flex items-center gap-2',
                                  isSelected && 'text-blue-700'
                                )}
                              >
                                {person.name}
                              </span>
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[10px] font-medium text-blue-700">
                                  Selected
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-700 text-white">
                                    <Check className="h-3 w-3" />
                                  </span>
                                </span>
                              ) : null}
                            </button>
                          )
                        })}
                      {analystHasMore ? (
                        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-full text-[11px]"
                            onMouseDown={(event) => {
                              event.preventDefault()
                              onAssigneeLoadMore?.()
                            }}
                          >
                            Load more
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>

            <p className="text-[10px] text-gray-500">
              {assignees.length < 2 && 'Select at least 2 assignees'}
              {assignees.length === 2 && 'Exactly 2 assignees required ✓'}
              {assignees.length > 2 && 'Remove assignees to meet the requirement of exactly 2'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-title" className="text-xs font-medium text-gray-700">
              Title <span className="text-red-600">*</span>
            </Label>
            <Input
              id="maintenance-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter task title (e.g., Update financial model...)"
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-action" className="text-xs font-medium text-gray-700">
              Action Item <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="maintenance-action"
              value={actionItem}
              onChange={(event) => setActionItem(event.target.value)}
              placeholder="e.g., Verify CFO's comment on margin expansion..."
              className="min-h-[100px] resize-none text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-due-date" className="text-xs font-medium text-gray-700">
              Due Date <span className="text-red-600">*</span>
            </Label>
            <div className="relative">
              <Calendar className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                id="maintenance-due-date"
                type="date"
                value={dueDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-10 pl-10 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
            <div>
              <p className="text-xs font-medium text-gray-900">High Importance</p>
              <p className="text-xs text-gray-500">Highlight critical tasks</p>
            </div>
            <Switch checked={isImportant} onCheckedChange={setIsImportant} />
          </div>
        </div>

        <div className="border-border mt-auto flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-gray-900 text-xs text-white hover:bg-gray-800"
            onClick={handleCreate}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </FloatingSideSheetContent>
    </Sheet>
  )
}

export default MaintenanceCreateModal
