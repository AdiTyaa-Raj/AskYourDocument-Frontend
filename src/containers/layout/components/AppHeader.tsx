'use client'

import { Search, Building2, TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { memo, useRef, useEffect, useState } from 'react'
import { UserMenu } from '@/components/layout/UserMenu'
import { BreadcrumbNavigation } from '@/components/layout/BreadcrumbNavigation'
import { NotificationPopover } from './NotificationPopover'
import { type AppHeaderProps } from '../lib/types'

// Pure presentation component for the app header
export const AppHeader = memo(function AppHeader({
  title = 'Dashboard',
  user,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchResults,
  onCompanySelect,
}: AppHeaderProps) {
  const [showResults, setShowResults] = useState(false)
  const [showMinCharWarning, setShowMinCharWarning] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Show dropdown whenever user is in company-search mode (e.g. typed @xx), so we show
  // loading state first and then the list when the API succeeds
  useEffect(() => {
    setShowResults(searchResults.isSearchingCompanies)
    if (searchResults.isSearchingCompanies) setShowMinCharWarning(false)
  }, [searchResults.isSearchingCompanies])

  // Handle clicks outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleCompanySelect(company: (typeof searchResults.companies)[number]) {
    onCompanySelect(company)
    setShowResults(false)
    setShowMinCharWarning(false)
    inputRef.current?.focus()
  }

  function handleSearchChange(value: string) {
    onSearchChange(value)
    if (showMinCharWarning) setShowMinCharWarning(false)
  }

  function handleDropdownScroll() {
    const el = dropdownRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    if (nearBottom && searchResults.hasMore && !searchResults.isLoadingMore) {
      searchResults.loadMore()
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchValue.trim().length < 2) {
        setShowMinCharWarning(true)
        setShowResults(false)
        return
      }
      setShowMinCharWarning(false)
      setShowResults(true)
      onSearchSubmit()
    }
  }

  return (
    <header className="app-header">
      {/* Page Title */}
      <div className="flex-shrink-0">
        <BreadcrumbNavigation title={title} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Search, Notifications and User */}
      <div className="flex flex-shrink-0 items-center gap-4">
        <div ref={searchContainerRef} className="relative hidden w-[520px] text-sm lg:block">
          <Search className="text-muted-foreground absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search company or ticker (enter 2+ characters, press Enter)"
            className="border-border bg-muted/40 placeholder:text-muted-foreground h-11 rounded-lg border pr-4 pl-10 text-sm"
            onFocus={() => {
              if (searchResults.isSearchingCompanies) {
                setShowResults(true)
              }
            }}
          />

          {/* Min char warning dropdown */}
          {showMinCharWarning && !showResults && (
            <div className="border-border absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border bg-white shadow-lg">
              <div className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
                <Search className="size-4 shrink-0" />
                Please enter at least 2 characters before searching.
              </div>
            </div>
          )}

          {/* Company search results dropdown */}
          {showResults && (
            <div
              ref={dropdownRef}
              onScroll={handleDropdownScroll}
              className="border-border absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-white shadow-lg"
            >
              {searchResults.isLoading ? (
                <div className="text-muted-foreground p-3 text-center">Searching companies...</div>
              ) : searchResults.companies.length > 0 ? (
                <>
                  <div className="text-muted-foreground border-border bg-muted/20 border-b p-2 text-xs">
                    Companies matching &quot;{searchResults.mentionTerm}&quot;
                  </div>
                  {searchResults.companies.map((company) => {
                    const hasPrice =
                      typeof company.price === 'number' &&
                      company.price > 0 &&
                      Number.isFinite(company.price)
                    const exchange = (company as { exchange?: string }).exchange
                    return (
                      <button
                        key={company.id}
                        onClick={() => handleCompanySelect(company)}
                        className="hover:bg-muted/50 border-border w-full border-b p-3 text-left transition-colors last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 rounded-md p-2">
                            <Building2 className="text-primary size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{company.ticker}</div>
                            <div className="text-muted-foreground truncate text-xs">
                              {company.securityDescription}
                            </div>
                          </div>
                          <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                            {hasPrice ? (
                              <>
                                <TrendingUp className="size-3" />${company.price!.toFixed(2)}
                              </>
                            ) : exchange ? (
                              <span className="bg-muted rounded px-1.5 py-0.5 font-medium">
                                {exchange}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </>
              ) : (
                <div className="text-muted-foreground p-3 text-center">
                  No companies found for &quot;{searchResults.mentionTerm}&quot;
                </div>
              )}
              {searchResults.isLoadingMore && (
                <div className="text-muted-foreground border-border border-t p-3 text-center text-xs">
                  Loading more...
                </div>
              )}
            </div>
          )}
        </div>
        <NotificationPopover />
        <UserMenu user={user} />
      </div>
    </header>
  )
})

export default AppHeader
