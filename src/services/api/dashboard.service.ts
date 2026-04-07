/**
 * Dashboard API Service
 * Handles all dashboard-related API calls
 */

import { BaseApiService } from './base'
import type { Activity, Approval, OutstandingDoc } from '@/containers/dashboard/lib/types'

class DashboardService extends BaseApiService {
  /**
   * Fetch recent activities
   */
  async getActivities(): Promise<Activity[]> {
    return this.get<Activity[]>('/dashboard/activities')
  }

  /**
   * Fetch outstanding documentation
   */
  async getOutstandingDocs(): Promise<OutstandingDoc[]> {
    return this.get<OutstandingDoc[]>('/dashboard/outstanding-docs')
  }

  /**
   * Fetch pending approvals
   */
  async getPendingApprovals(): Promise<Approval[]> {
    return this.get<Approval[]>('/dashboard/approvals')
  }

  /**
   * Fetch public events
   */
  async getPublicEvents() {
    return this.get('/dashboard/public-events')
  }

  /**
   * Fetch internal meetings
   */
  async getInternalMeetings() {
    return this.get('/dashboard/internal-meetings')
  }

  /**
   * Fetch field research trips
   */
  async getFieldResearch() {
    return this.get('/dashboard/field-research')
  }
}

// Export singleton instance
export const dashboardService = new DashboardService()
