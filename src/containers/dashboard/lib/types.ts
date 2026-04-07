// Dashboard type definitions mirroring the Figma snapshot

export type ActivityItem = {
  id: number
  analyst: string
  action: string
  company: string
  exchange?: string
  timestamp: string
  actionUrl?: string
}

export type PublicEvent = {
  id: number
  company: string
  exchange?: string
  title: string
  date: string
  type?: 'earnings' | 'conference' | 'dividend'
}

export type InternalMeeting = {
  id: number
  title: string
  time: string
  analyst: string
}

export type FieldResearchTrip = {
  id: number
  analyst: string
  location: string
  dates: string
  companies: number
}

export type DocumentationAlert = {
  id: number
  company: string
  ticker: string
  analyst: string
  daysOverdue: number
  meetingDate: string
}

export type PendingReviewItem = {
  id: number
  ticker: string
  exchange?: string
  company: string
  title: string
  submittedBy: string
  submittedDate: string
  priority: 'high' | 'medium' | 'low'
  category: 'stage' | 'memo'
  approvalLabel: string
  approvalTooltip: string
  fromStage?: string
  toStage?: string
  memoType?: string
}

export type DashboardUser = {
  name: string
  role: 'portfolio_manager' | 'senior_analyst' | 'junior_analyst'
}

export type RoleAssignments = {
  primary: string[]
  secondary: string[]
}

// Legacy aliases for API service compatibility
export type Activity = ActivityItem
export type OutstandingDoc = {
  id: number
  company: string
  person: string
  overdue: string
  type: 'error' | 'warning'
}
export type Approval = PendingReviewItem
