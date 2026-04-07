'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { formatTickerWithExchange } from '@/lib/utils'
import type { CompanyHeaderProps } from '../lib/type'

export function CompanyHeader({ companyInfo }: CompanyHeaderProps) {
  const isNegative =
    companyInfo.priceChange.startsWith('-') ||
    parseFloat(companyInfo.priceChange.replace('%', '')) < 0

  return (
    <Card className="h-full border border-gray-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl text-gray-900">{companyInfo.name}</h1>
          <Badge variant="outline" className="text-sm">
            {formatTickerWithExchange(companyInfo.ticker, companyInfo.exchange)}
          </Badge>
          <Badge className="text-xs">{companyInfo.status}</Badge>
          <div className="ml-2 flex items-center gap-2">
            <span className="text-2xl text-gray-900">{companyInfo.currentPrice}</span>
            <span
              className={`flex items-center gap-1 ${isNegative ? 'text-red-600' : 'text-green-600'}`}
            >
              {isNegative ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              {companyInfo.priceChange}
            </span>
          </div>
          <span className="text-xs text-gray-500">Last updated: {companyInfo.lastUpdated}</span>
        </div>
      </CardContent>
    </Card>
  )
}
