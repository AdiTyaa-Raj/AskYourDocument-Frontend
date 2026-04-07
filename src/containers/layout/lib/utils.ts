import { CheckCircle, TrendingUp, AlertTriangle, FileText, type LucideIcon } from 'lucide-react'
import type {
  NotificationIcon,
  Notification,
  NotificationFilter,
} from '@/containers/notifications/lib/types'

export const POPOVER_FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: 'unread', label: 'Unread' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'documents', label: 'Documents' },
  { id: 'maintenance', label: 'Maintenance' },
]

export const POPOVER_LIMIT = 10
export const LOAD_MORE_LIMIT = 10

export const getIconComponent = (iconType: NotificationIcon): LucideIcon => {
  switch (iconType) {
    case 'approval':
      return CheckCircle
    case 'pipeline':
      return TrendingUp
    case 'alert':
      return AlertTriangle
    default:
      return FileText
  }
}

export const filterNotifications = (
  notifications: Notification[],
  activeFilter: string
): Notification[] => {
  return notifications.filter((notif) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'approvals') return notif.type === 'approval'
    if (activeFilter === 'alerts') return notif.type === 'alert'
    if (activeFilter === 'pipeline') return notif.type === 'pipeline'
    return true
  })
}
