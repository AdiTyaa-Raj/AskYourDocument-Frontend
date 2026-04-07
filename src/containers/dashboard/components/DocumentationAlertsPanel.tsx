import { AlertTriangle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { DocumentationAlert } from '../lib/types'

type DocumentationAlertsPanelProps = {
  alerts: DocumentationAlert[]
  onSelect: (alert: DocumentationAlert) => void
}

export function DocumentationAlertsPanel({ alerts, onSelect }: DocumentationAlertsPanelProps) {
  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardContent className="space-y-2 p-4">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide">
          Outstanding Documentation
        </h4>
        <div className="space-y-1.5">
          {alerts.map((alert) => {
            const isSevere = alert.daysOverdue > 5
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => onSelect(alert)}
                className={`flex w-full items-center gap-2 rounded border-l-2 px-2 py-1.5 text-left text-xs transition-opacity hover:opacity-90 ${
                  isSevere
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-amber-500 bg-amber-500/10 text-amber-900'
                }`}
              >
                <AlertTriangle
                  className={`h-3.5 w-3.5 ${
                    isSevere ? 'text-destructive' : 'text-amber-500'
                  } flex-shrink-0`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {alert.company} • {alert.analyst}
                  </p>
                  <p className="text-[11px] opacity-80">
                    {alert.daysOverdue}d overdue • meeting {alert.meetingDate}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
