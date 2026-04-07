'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, FileText } from 'lucide-react'
import type { KeyMetricsProps } from '../lib/type'
import { KEY_METRICS_GRID_CLASSES } from '../lib/constants'
import { formatFileSize, getStatusColor } from '../lib/utils'

export function KeyMetrics({ keyMetrics, onEdit, sourceDoc }: KeyMetricsProps) {
  const handleDocumentClick = (doc: { url?: string }) => {
    if (doc.url) {
      window.open(doc.url, '_blank')
    }
  }

  return (
    <Card className="col-span-2 border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-900">Key Metrics</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0">
        <div className="space-y-0">
          <div
            className={KEY_METRICS_GRID_CLASSES.container}
            onClick={() => onEdit('iv', keyMetrics.iv)}
          >
            <span className={KEY_METRICS_GRID_CLASSES.label}>IV</span>
            <span className={KEY_METRICS_GRID_CLASSES.value}>${keyMetrics.iv}</span>
          </div>
          <div
            className={KEY_METRICS_GRID_CLASSES.container}
            onClick={() => onEdit('downside', keyMetrics.downside)}
          >
            <span className={KEY_METRICS_GRID_CLASSES.label}>Downside</span>
            <span className={KEY_METRICS_GRID_CLASSES.value}>${keyMetrics.downside}</span>
          </div>
          <div
            className={KEY_METRICS_GRID_CLASSES.container}
            onClick={() => onEdit('irr', keyMetrics.irr)}
          >
            <span className={KEY_METRICS_GRID_CLASSES.label}>IRR</span>
            <span className={KEY_METRICS_GRID_CLASSES.value}>{keyMetrics.irr}%</span>
          </div>
          <div
            className={KEY_METRICS_GRID_CLASSES.container}
            onClick={() => onEdit('moc', keyMetrics.moc)}
          >
            <span className={KEY_METRICS_GRID_CLASSES.label}>MoC</span>
            <span className={KEY_METRICS_GRID_CLASSES.value}>{keyMetrics.moc}x</span>
          </div>
          <div
            className={KEY_METRICS_GRID_CLASSES.lastItem}
            onClick={() => onEdit('riskReward', keyMetrics.riskReward)}
          >
            <span className={KEY_METRICS_GRID_CLASSES.label}>Risk/Reward</span>
            <span className={KEY_METRICS_GRID_CLASSES.value}>{keyMetrics.riskReward}x</span>
          </div>
        </div>
        {sourceDoc && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="mb-2 text-xs font-medium text-gray-700">Latest Model</div>
            <div
              className={`flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 p-2 transition-colors ${
                sourceDoc.url ? 'hover:bg-gray-50' : 'cursor-default'
              }`}
              onClick={() => handleDocumentClick(sourceDoc)}
            >
              <FileText className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-gray-900">
                      {sourceDoc.title}
                    </div>
                  </div>
                  {sourceDoc.url && (
                    <ExternalLink className="ml-2 h-3 w-3 flex-shrink-0 text-gray-400" />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">{sourceDoc.date}</span>

                  <Badge
                    variant="outline"
                    className={`h-4 text-xs ${getStatusColor(sourceDoc.status)}`}
                  >
                    {sourceDoc.status}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {formatFileSize(sourceDoc.fileSize)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
