import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { ReminderTab } from '../lib/types'

export function EmptyState({ tab }: { tab: ReminderTab }) {
  return (
    <div className="rounded-sm border border-gray-200 bg-white py-16 text-center">
      {tab === 'in_progress' && (
        <>
          <AlertCircle className="mx-auto mb-2 h-10 w-10 text-gray-300" />
          <div className="mb-0.5 text-sm text-gray-900">No overdue reminders</div>
          <div className="text-xs text-gray-500">You&apos;re all caught up!</div>
        </>
      )}
      {tab === 'upcoming' && (
        <>
          <Clock className="mx-auto mb-2 h-10 w-10 text-gray-300" />
          <div className="mb-0.5 text-sm text-gray-900">No upcoming reminders</div>
          <div className="text-xs text-gray-500">Schedule a reminder to get started</div>
        </>
      )}
      {tab === 'completed' && (
        <>
          <CheckCircle className="mx-auto mb-2 h-10 w-10 text-gray-300" />
          <div className="mb-0.5 text-sm text-gray-900">No completed reminders</div>
          <div className="text-xs text-gray-500">Completed reminders will appear here</div>
        </>
      )}
    </div>
  )
}
