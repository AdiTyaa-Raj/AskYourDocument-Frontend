import {
  AlertCircle,
  FileSearch,
  FileText,
  Target,
  TrendingUp,
  Users,
  Search,
  FileBarChart,
} from 'lucide-react'

import type { MemoTemplate } from '@/containers/memos/lib/types'

/**
 * Extended memo templates for the new template selection page
 * Includes all templates shown in the updated UI design
 */
export const extendedMemoTemplates: MemoTemplate[] = [
  {
    id: 'earnings-preview',
    name: 'Earnings Preview',
    description: 'Pre-earnings report',
    icon: TrendingUp,
  },
  {
    id: 'earnings-summary',
    name: 'Earnings Summary',
    description: 'Post-earnings analysis',
    icon: FileText,
  },
  {
    id: 'target-weight-change',
    name: 'Target Weight Change',
    description: 'Portfolio weight adjustment',
    icon: Target,
  },
  {
    id: 'meeting-owned',
    name: 'Company Meeting - Owned',
    description: 'Meeting notes for owned companies',
    icon: Users,
  },
  {
    id: 'meeting-watchlist',
    name: 'Company Meeting - Watchlist',
    description: 'Meeting notes for watchlist',
    icon: Users,
  },
  {
    id: 'meeting-first',
    name: 'Company Meeting - First',
    description: 'First-time meeting notes',
    icon: Users,
  },
  {
    id: 'meeting-lesser',
    name: 'Company Meeting - Lesser',
    description: 'Lightweight meeting notes',
    icon: Users,
  },
  {
    id: 'drawdown-40',
    name: '40% Drawdown',
    description: 'Significant position decline',
    icon: AlertCircle,
  },
  {
    id: 'investment-memo',
    name: 'Investment Memo',
    description: 'Comprehensive investment analysis',
    icon: FileBarChart,
  },
  {
    id: 'screen',
    name: 'Screen',
    description: 'Initial company screening',
    icon: Search,
  },
  {
    id: 'vcp-screen',
    name: 'Going-in Value Creation Plan',
    description: 'Value Creation Plan screening',
    icon: FileSearch,
  },
]
