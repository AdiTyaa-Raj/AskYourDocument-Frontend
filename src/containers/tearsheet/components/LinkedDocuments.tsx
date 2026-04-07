'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, ExternalLink } from 'lucide-react'
import type { LinkedDocumentsProps } from '../lib/type'
import { formatFileSize, getStatusColor } from '../lib/utils'

export function LinkedDocuments({ linkedDocs }: LinkedDocumentsProps) {
  const handleDocumentClick = (doc: { url?: string }) => {
    if (doc.url) {
      window.open(doc.url, '_blank')
    }
  }

  if (linkedDocs.length === 0) {
    return (
      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-900">Linked Documents</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-0">
          <div className="flex items-center justify-center py-6 text-sm text-gray-500">
            <FileText className="mr-2 h-4 w-4" />
            No documents available for this company
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-900">
          Linked Documents ({linkedDocs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0">
        <div className="space-y-2">
          {linkedDocs.map((doc) => (
            <div
              key={doc.id}
              className={`flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 p-2 transition-colors ${
                doc.url ? 'hover:bg-gray-50' : 'cursor-default'
              }`}
              onClick={() => handleDocumentClick(doc)}
            >
              <FileText className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-gray-900">{doc.title}</div>
                    {doc.description && (
                      <div className="mt-1 line-clamp-2 text-xs text-gray-600">
                        {doc.description}
                      </div>
                    )}
                  </div>
                  {doc.url && <ExternalLink className="ml-2 h-3 w-3 flex-shrink-0 text-gray-400" />}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">{doc.date}</span>
                  <Badge variant="outline" className="h-4 text-xs">
                    {doc.type}
                  </Badge>
                  <Badge variant="outline" className={`h-4 text-xs ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </Badge>
                  <span className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
