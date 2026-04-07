'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import type { SECFilingsProps } from '../lib/type'

export function SECFilings({ filings }: SECFilingsProps) {
  const handleFilingClick = (url: string) => {
    // Only open if URL is provided and is a valid URL (starts with http:// or https://)
    if (
      url &&
      (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('www.'))
    ) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-900">SEC Filings & IR Updates</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0">
        <div className="space-y-2">
          {filings.map((filing, idx) => (
            <div
              key={idx}
              onClick={() => handleFilingClick(filing.url)}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 p-2 hover:bg-gray-50"
            >
              <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-500" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-900">{filing.title}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500">{formatDate(filing.date)}</span>
                  <Badge variant="outline" className="h-4 text-xs">
                    {filing.source}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
