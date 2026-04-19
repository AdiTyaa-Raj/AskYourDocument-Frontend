/**
 * API Services Index
 * Central export for all API services
 */

export { chatService } from './chat.service'
export { documentsService } from './documents.service'
export { usersService } from './users.service'
export { rolesService } from './roles.service'
export { tenantsService } from './tenants.service'
export { authService } from './auth.service'

// Export base service for creating new services
export { BaseApiService } from './base'

// Re-export axios client for direct use if needed
export { default as apiClient } from '@/config/axios'
