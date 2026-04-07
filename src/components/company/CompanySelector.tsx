'use client'

import { useMemo, useState, useCallback, useEffect, type KeyboardEvent, type UIEvent } from 'react'
import { Building2, ChevronDown, Check, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useUniverseCompanies } from '@/lib/hooks/getUniverseCompanies'
import type { CompanyOption } from '@/containers/memos/lib/types'

function cleanupCache(
  cache: Map<string, CompanyOption>,
  mode: 'single' | 'multiple',
  selectedId: string | undefined,
  selectedIds: string[]
): Map<string, CompanyOption> | null {
  if (cache.size === 0) return null

  const idsToRemove: string[] = []

  cache.forEach((_, id) => {
    const isStillSelected = mode === 'single' ? id === selectedId : selectedIds.includes(id)
    if (!isStillSelected) {
      idsToRemove.push(id)
    }
  })

  if (idsToRemove.length === 0) return null

  const newCache = new Map(cache)
  idsToRemove.forEach((id) => newCache.delete(id))
  return newCache
}

function getCompanySelectorDisplayText(
  mode: 'single' | 'multiple',
  selectedCompanies: CompanyOption[],
  placeholder: string,
  isLoading: boolean,
  isFetchingSelected: boolean,
  hasData: boolean
): string {
  if (isFetchingSelected) {
    return 'Loading...'
  }

  if (isLoading && !hasData) {
    return 'Loading companies...'
  }

  if (mode === 'single') {
    if (selectedCompanies.length === 0) return placeholder
    const [company] = selectedCompanies
    const exchangeSuffix = company.exchange ? ` (${company.exchange})` : ''
    return `${company.ticker} – ${company.name}${exchangeSuffix}`
  }

  if (selectedCompanies.length > 0) {
    const count = selectedCompanies.length
    return `${count} compan${count === 1 ? 'y' : 'ies'} selected`
  }

  return placeholder
}

export interface CompanySelectorProps {
  mode: 'single' | 'multiple'
  selectedCompanyId?: string
  selectedCompanyIds?: string[]
  onSelectCompany?: (companyId: string, companyData?: CompanyOption) => void
  onToggleCompany?: (companyId: string, companyData?: CompanyOption) => void
  onRemoveCompany?: (companyId: string) => void
  excludeCompanyIds?: string[]
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
  hasError?: boolean
  error?: boolean
  preloadedCompanies?: CompanyOption[]
  isLoadingInitialData?: boolean
}

export function CompanySelector({
  mode,
  selectedCompanyId,
  selectedCompanyIds = [],
  onSelectCompany,
  onToggleCompany,
  onRemoveCompany,
  excludeCompanyIds = [],
  placeholder = 'Select company...',
  disabled = false,
  className = '',
  hasError = false,
  error = false, // Backward compatibility
  preloadedCompanies = [],
  isLoadingInitialData = false,
}: CompanySelectorProps) {
  // Use either hasError or error prop
  const showError = hasError || error
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('') // Local input value (updates on every keystroke)
  const [searchTerm, setSearchTerm] = useState('') // Actual search term (only updates on Enter)

  // Cache selected company data so it persists even when not in search results
  const [selectedCompanyCache, setSelectedCompanyCache] = useState<Map<string, CompanyOption>>(
    new Map()
  )

  const shouldFetchCompanies = open && !disabled && !isLoadingInitialData

  // Fetch companies with infinite scroll and backend search
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useUniverseCompanies(
    searchTerm,
    shouldFetchCompanies
  )

  // Flatten all pages into a single array
  const allCompanies = useMemo(() => {
    if (!data?.pages) {
      return []
    }

    const companies = data.pages.flatMap((page) =>
      page.companies.map((company) => ({
        id: String(company.id),
        ticker: company.ticker,
        name: company.securityDescription,
        exchange: company.exchange,
        gics: company.gics,
        stage: company.stage,
      }))
    )

    return companies
  }, [data])

  // Update cache with preloaded company details from container
  useEffect(() => {
    if (preloadedCompanies && preloadedCompanies.length > 0) {
      setSelectedCompanyCache((prevCache) => {
        const newCache = new Map(prevCache)
        preloadedCompanies.forEach((company) => {
          newCache.set(company.id, company)
        })
        return newCache
      })
    }
  }, [preloadedCompanies])

  // Clean up cache when selections change (remove deselected companies)
  useEffect(() => {
    setSelectedCompanyCache((prevCache) => {
      const cleaned = cleanupCache(prevCache, mode, selectedCompanyId, selectedCompanyIds)
      return cleaned || prevCache
    })
  }, [mode, selectedCompanyId, selectedCompanyIds])

  // Filter out excluded companies
  const filteredCompanies = useMemo(() => {
    return allCompanies.filter((company) => !excludeCompanyIds.includes(company.id))
  }, [allCompanies, excludeCompanyIds])

  // Get selected company/companies for display - use cache first, then search results
  const selectedCompanies = useMemo(() => {
    if (mode === 'single') {
      if (!selectedCompanyId) return []

      // Try to get from cache first
      const cachedCompany = selectedCompanyCache.get(selectedCompanyId)
      if (cachedCompany) return [cachedCompany]

      // Fallback to search results
      const fromResults = filteredCompanies.find((c) => c.id === selectedCompanyId)
      return fromResults ? [fromResults] : []
    }

    // Multiple mode
    const companies: CompanyOption[] = []
    selectedCompanyIds.forEach((id) => {
      // Try cache first
      const cachedCompany = selectedCompanyCache.get(id)
      if (cachedCompany) {
        companies.push(cachedCompany)
      } else {
        // Fallback to search results
        const fromResults = filteredCompanies.find((c) => c.id === id)
        if (fromResults) {
          companies.push(fromResults)
        }
      }
    })
    return companies
  }, [mode, selectedCompanyId, selectedCompanyIds, selectedCompanyCache, filteredCompanies])

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget
      if (!hasNextPage || isFetchingNextPage) return

      // Calculate scroll position
      const scrollTop = target.scrollTop
      const scrollHeight = target.scrollHeight
      const clientHeight = target.clientHeight
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

      // Load more when scrolled 80% down
      if (scrollPercentage > 0.8) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  // Handle company selection
  const handleSelect = useCallback(
    (companyId: string) => {
      // Update cache with the selected company data
      const company = allCompanies.find((c) => c.id === companyId)

      if (!company) {
        return
      }

      setSelectedCompanyCache((prevCache) => {
        const newCache = new Map(prevCache)
        newCache.set(company.id, company)
        return newCache
      })

      if (mode === 'single') {
        // Pass both company ID and company data for instant updates
        onSelectCompany?.(companyId, company)
        setOpen(false)
      } else if (onToggleCompany) {
        // Pass both company ID and company data for multi-select too
        onToggleCompany(companyId, company)
      }
    },
    [mode, onSelectCompany, onToggleCompany, allCompanies]
  )

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setInputValue('')
      setSearchTerm('')
    }
  }, [open])

  // Handle search on Enter key press
  const handleSearchKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        setSearchTerm(inputValue.trim())
      }
    },
    [inputValue]
  )

  const isSelected = (companyId: string) => {
    if (mode === 'single') {
      return selectedCompanyId === companyId
    }
    return selectedCompanyIds.includes(companyId)
  }

  return (
    <div className={className}>
      {/* Display selected companies - only show badges for multiple mode */}
      {mode === 'multiple' && selectedCompanies.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedCompanies.map((company) => (
            <Badge
              key={company.id}
              variant="secondary"
              className="bg-secondary/80 hover:bg-secondary flex items-center gap-1.5 px-2 py-1 text-xs font-normal"
            >
              <Building2 className="text-muted-foreground size-3 shrink-0" />
              <span
                className="max-w-[200px] truncate"
                title={`${company.ticker} – ${company.name}`}
              >
                {company.ticker} – {company.name}
              </span>
              {!disabled && onRemoveCompany && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveCompany(company.id)
                  }}
                  className="hover:bg-destructive/20 focus:ring-ring ml-0.5 shrink-0 rounded-full p-0.5 transition-colors focus:ring-2 focus:outline-none"
                  aria-label={`Remove ${company.ticker}`}
                >
                  <X className="text-muted-foreground hover:text-destructive size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Company selector popover */}
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={`h-9 w-full justify-between text-xs ${
              showError ? 'border-destructive focus-visible:ring-destructive' : ''
            } ${
              selectedCompanies.length > 0 ? 'bg-secondary/50 border-primary/20' : ''
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span className="truncate text-left">
              {getCompanySelectorDisplayText(
                mode,
                selectedCompanies,
                placeholder,
                isLoading,
                false,
                !!data
              )}
            </span>
            <ChevronDown
              className={`ml-2 size-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0"
          align="start"
          sideOffset={5}
          style={{ zIndex: 100 }}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
          }}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search companies... (press Enter)"
              className="h-9 text-xs"
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleSearchKeyDown}
            />
            <CommandList
              onScroll={handleScroll}
              className="max-h-[300px] overflow-y-auto"
              style={{
                overflowY: 'auto',
                maxHeight: '300px',
              }}
            >
              <CommandEmpty className="text-muted-foreground py-6 text-center text-xs">
                {isLoading ? 'Loading companies...' : 'No companies found.'}
              </CommandEmpty>
              {filteredCompanies.length > 0 && (
                <CommandGroup>
                  {filteredCompanies.map((company) => {
                    const selected = isSelected(company.id)
                    const itemKey = company.id
                    const itemValue = company.id
                    return (
                      <CommandItem
                        key={itemKey}
                        value={itemValue}
                        onSelect={() => handleSelect(company.id)}
                        className="text-xs"
                      >
                        <div className="flex w-full items-center gap-2">
                          <div
                            className={`flex size-4 items-center justify-center ${
                              mode === 'single'
                                ? `rounded-full border ${
                                    selected
                                      ? 'border-primary bg-primary'
                                      : 'border-muted-foreground'
                                  }`
                                : `rounded border ${
                                    selected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-muted-foreground'
                                  }`
                            }`}
                          >
                            {mode === 'single'
                              ? selected && (
                                  <div className="bg-primary-foreground size-1.5 rounded-full" />
                                )
                              : selected && <Check className="size-3" />}
                          </div>
                          <Building2 className="text-muted-foreground size-3.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">
                              {company.ticker} – {company.name}
                            </div>
                          </div>
                          {company.stage?.name && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {company.stage.name}
                            </Badge>
                          )}
                          {company.exchange && (
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              {company.exchange}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                  {hasNextPage && !isFetchingNextPage && (
                    <div className="text-muted-foreground py-2 text-center text-xs">
                      Scroll for more...
                    </div>
                  )}
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="text-muted-foreground size-4 animate-spin" />
                      <span className="text-muted-foreground ml-2 text-xs">Loading more...</span>
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
