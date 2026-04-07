/**
 * API Services Index
 * Central export for all API services
 */

export { dashboardService } from './dashboard.service'
export { chatService } from './chat.service'
export { documentsService } from './documents.service'
export { approvalsService } from './approvals.service'
export { pipelineService } from './pipeline.service'
export { coverageService } from './coverage.service'
export { memosService } from './memos.service'
export { companiesService } from './companies.service'
export { notificationsService } from './notifications.service'
export { usersService } from './users.service'
export { calendarService } from './calendar.service'
export { contentService } from './content.service'
export { layoutService } from './layout.service'
export { authService } from './auth.service'
export { maintenanceService } from './maintenance.service'
export { remindersService } from './reminders.services'

// Export base service for creating new services
export { BaseApiService } from './base'

// Re-export axios client for direct use if needed
export { default as apiClient } from '@/config/axios'
