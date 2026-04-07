'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, FileText } from 'lucide-react'
import type { InvestmentThesis, InvestmentThesisProps } from '../lib/type'

export function InvestmentThesis({ investmentThesis, sourceDoc }: InvestmentThesisProps) {
  const [isClamped, setIsClamped] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  const handleSourceClick = () => {
    if (sourceDoc?.url) {
      window.open(sourceDoc.url, '_blank')
    }
  }

  const hasThesis = investmentThesis.text.trim().length > 0

  useEffect(() => {
    const element = textRef.current
    if (!element) return
    setIsClamped(element.scrollHeight > element.clientHeight + 1)
  }, [investmentThesis.text])

  return (
    <>
      <Card className="col-span-2 border border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-900">Investment Thesis</CardTitle>
          </div>
          {sourceDoc && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <FileText className="h-3.5 w-3.5 text-gray-400" />
              <span>Retrieved from:</span>
              <button
                type="button"
                onClick={handleSourceClick}
                className={`inline-flex items-center gap-1 ${
                  sourceDoc.url ? 'text-blue-600 hover:underline' : 'text-gray-700'
                }`}
              >
                <span className="max-w-[200px] truncate">{sourceDoc.title}</span>
                {sourceDoc.url && <ExternalLink className="h-3 w-3" />}
              </button>
              {sourceDoc.date && <span>• {sourceDoc.date}</span>}
              {sourceDoc.authorName && <span>• {sourceDoc.authorName}</span>}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-3 pt-0">
          {hasThesis ? (
            <>
              <p ref={textRef} className="line-clamp-3 text-xs leading-relaxed text-gray-600">
                {investmentThesis.text}
              </p>
              {isClamped && (
                <button
                  type="button"
                  onClick={handleSourceClick}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  Read more
                  {<ExternalLink className="h-3 w-3" />}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500">No investment thesis available.</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
