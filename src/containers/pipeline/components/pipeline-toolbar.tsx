'use client'

import { Search, LayoutList, Clock, RefreshCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { PipelineToolbarProps } from '../lib/types'

export function PipelineToolbar({
  filter,
  analyst,
  view,
  analystOptions,
  onFilterChange,
  onSearchSubmit,
  onAnalystChange,
  onViewChange,
  onRefresh,
  showViewToggle = true,
}: PipelineToolbarProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Search by ticker or company name"
            className="pl-9 text-sm"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSearchSubmit?.()
              }
            }}
          />
        </div>
        <Select value={analyst} onValueChange={onAnalystChange}>
          <SelectTrigger className="w-[180px] text-sm">
            <SelectValue placeholder="Filter by analyst" />
          </SelectTrigger>
          <SelectContent>
            {analystOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {showViewToggle ? (
          <>
            <Button
              variant={view === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange('kanban')}
            >
              <LayoutList className="mr-2 h-3.5 w-3.5" />
              Kanban
            </Button>
            <Button
              variant={view === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange('timeline')}
            >
              <Clock className="mr-2 h-3.5 w-3.5" />
              Timeline
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
