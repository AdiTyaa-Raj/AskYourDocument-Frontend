'use client'

import { useState, type KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

import type {
  MaintenanceFilters,
  MaintenanceSelectOption,
} from '@/containers/pipeline/lib/maintenance-types'

interface MaintenanceToolbarProps {
  filters: MaintenanceFilters
  companyOptions: MaintenanceSelectOption[]
  analystOptions: MaintenanceSelectOption[]
  countryOptions: MaintenanceSelectOption[]
  statusOptions: MaintenanceSelectOption[]
  onFiltersChange: (next: MaintenanceFilters) => void
  onCreateTask: () => void
  onCompanySearch?: (query: string) => void
  onCompanyLoadMore?: () => void
  companyHasMore?: boolean
  companyLoading?: boolean
  hideStatusFilter?: boolean
  onAnalystSearch?: (query: string) => void
  onAnalystLoadMore?: () => void
  analystHasMore?: boolean
  analystLoading?: boolean
  onCountryLoadMore?: () => void
  onCountrySearch?: (query: string) => void
  countryHasMore?: boolean
  countryLoading?: boolean
  showCreateButton?: boolean
}

export function MaintenanceToolbar({
  filters,
  companyOptions,
  analystOptions,
  countryOptions,
  statusOptions,
  onFiltersChange,
  onCreateTask,
  onCompanySearch,
  onCompanyLoadMore,
  companyHasMore,
  companyLoading,
  hideStatusFilter = false,
  onAnalystSearch,
  onAnalystLoadMore,
  analystHasMore,
  analystLoading,
  onCountryLoadMore,
  onCountrySearch,
  countryHasMore,
  countryLoading,
  showCreateButton = true,
}: MaintenanceToolbarProps) {
  const [companySearchTerm, setCompanySearchTerm] = useState('')
  const [analystSearchTerm, setAnalystSearchTerm] = useState('')
  const [countrySearchTerm, setCountrySearchTerm] = useState('')

  const handleSelectChange = (key: keyof MaintenanceFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
    const resetters: Partial<Record<keyof MaintenanceFilters, () => void>> = {
      company: () => setCompanySearchTerm(''),
      analyst: () => setAnalystSearchTerm(''),
      country: () => setCountrySearchTerm(''),
    }
    resetters[key]?.()
  }

  const handleEnterSearch = (
    event: KeyboardEvent<HTMLInputElement>,
    term: string,
    onSearch?: (query: string) => void
  ) => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      const query = term.trim()
      if (query && onSearch) onSearch(query)
    }
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.company ?? 'all'}
          onValueChange={(value) => handleSelectChange('company', value)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            {onCompanySearch ? (
              <div className="p-2">
                <Input
                  placeholder="Search company"
                  className="h-8 text-xs"
                  value={companySearchTerm}
                  onChange={(e) => setCompanySearchTerm(e.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    handleEnterSearch(event, companySearchTerm, onCompanySearch)
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
            ) : null}
            {companyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
            {onCompanyLoadMore && companyHasMore ? (
              <div className="border-t px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs"
                  disabled={companyLoading}
                  onClick={() => onCompanyLoadMore()}
                >
                  {companyLoading ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </SelectContent>
        </Select>

        <Select
          value={filters.analyst ?? 'all'}
          onValueChange={(value) => handleSelectChange('analyst', value)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Analyst" />
          </SelectTrigger>
          <SelectContent>
            {onAnalystSearch ? (
              <div className="p-2">
                <Input
                  placeholder="Search analyst"
                  className="h-8 text-xs"
                  value={analystSearchTerm}
                  onChange={(e) => setAnalystSearchTerm(e.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    handleEnterSearch(event, analystSearchTerm, onAnalystSearch)
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
            ) : null}
            {analystOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
            {onAnalystLoadMore && analystHasMore ? (
              <div className="border-t px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs"
                  disabled={analystLoading}
                  onClick={() => onAnalystLoadMore()}
                >
                  {analystLoading ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </SelectContent>
        </Select>

        <Select
          value={filters.country ?? 'all'}
          onValueChange={(value) => handleSelectChange('country', value)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            {onCountrySearch ? (
              <div className="p-2">
                <Input
                  placeholder="Search country"
                  className="h-8 text-xs"
                  value={countrySearchTerm}
                  onChange={(e) => setCountrySearchTerm(e.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    handleEnterSearch(event, countrySearchTerm, onCountrySearch)
                  }}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
            ) : null}
            {countryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
            {onCountryLoadMore && countryHasMore ? (
              <div className="border-t px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs"
                  disabled={countryLoading}
                  onClick={() => onCountryLoadMore()}
                >
                  {countryLoading ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </SelectContent>
        </Select>

        {hideStatusFilter ? null : (
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(value) => handleSelectChange('status', value)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {showCreateButton ? (
        <Button
          size="sm"
          className="h-8 gap-2 rounded-md bg-gray-900 text-xs text-white hover:bg-gray-800"
          onClick={onCreateTask}
        >
          <Plus className="h-3.5 w-3.5" />
          Create Task
        </Button>
      ) : null}
    </div>
  )
}

export default MaintenanceToolbar
