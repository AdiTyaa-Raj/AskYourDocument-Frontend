import { BaseApiService } from './base'
import { TearsheetApiResponse, ApiDocumentsResponse } from '@/containers/tearsheet/lib/type'

class TearsheetService extends BaseApiService {
  /**
   * Get tearsheet data for a specific company
   * @param companyId - The company ID to fetch tearsheet data for
   * @returns Promise<TearsheetApiResponse>
   */
  async getTearsheetData(companyId: number): Promise<TearsheetApiResponse> {
    return this.get<TearsheetApiResponse>(`/tearsheet/${companyId}`)
  }

  /**
   * Update key metrics for a company
   * @param companyId - The company ID
   * @param field - The metric field to update
   * @param value - The new value
   * @param reason - Reason for the change
   * @returns Promise<void>
   */
  async updateKeyMetric(
    companyId: number,
    field: string,
    value: string | number,
    reason: string
  ): Promise<void> {
    return this.patch(`/tearsheet/${companyId}/key-metrics`, {
      field,
      value,
      reason,
    })
  }

  /**
   * Update investment thesis for a company
   * @param companyId - The company ID
   * @param thesis - The updated investment thesis
   * @param reason - Reason for the change
   * @returns Promise<void>
   */
  async updateInvestmentThesis(
    companyId: number,
    thesis: {
      summary: string
      key_drivers: string[]
      key_risks: string[]
    },
    reason: string
  ): Promise<void> {
    return this.patch(`/tearsheet/${companyId}/investment-thesis`, {
      thesis,
      reason,
    })
  }

  /**
   * Update investment thesis meta for a company (matches PUT /meta endpoint)
   * @param companyId - The company ID
   * @param investmentThesis - The updated investment thesis with reason
   * @returns Promise<void>
   */
  async updateInvestmentThesisMeta(
    companyId: number,
    investmentThesis: {
      text: string | null
      reason: string
    }
  ): Promise<void> {
    return this.put(`/tearsheet/${companyId}/meta`, {
      investment_thesis: investmentThesis,
    })
  }

  /**
   * Update key metrics meta for a company (matches PUT /meta endpoint)
   * @param companyId - The company ID
   * @param keyMetrics - The updated key metrics
   * @returns Promise<void>
   */
  async updateKeyMetricsMeta(
    companyId: number,
    keyMetrics: {
      iv: number | null
      downside: number | null
      irr: number | null
      moc: number | null
      risk_reward: number | null
      internal_eps_q1_2025: number | null
      consensus_eps_q1_2025: number | null
    }
  ): Promise<void> {
    return this.put(`/tearsheet/${companyId}/meta`, {
      key_metrics: keyMetrics,
    })
  }

  /**
   * Update financial ratios meta for a company (matches PUT /meta endpoint)
   * @param companyId - The company ID
   * @param financialRatios - The updated financial ratios
   * @returns Promise<void>
   */
  async updateFinancialRatiosMeta(
    companyId: number,
    financialRatios: {
      last_year: Record<string, number | null>
      next_year: Record<string, number | null>
      year_after: Record<string, number | null>
    }
  ): Promise<void> {
    return this.put(`/tearsheet/${companyId}/meta`, {
      financials_ratios: financialRatios,
    })
  }

  /**
   * Update earnings data (forward_eps and historical_eps) for a company
   * @param companyId - The company ID
   * @param earningsData - The updated earnings data
   * @returns Promise<void>
   */
  async updateEarningsDataMeta(
    companyId: number,
    earningsData: {
      forward_eps: { quarter: string; internal: number | null; consensus: number | null }[]
      historical_eps: { quarter: string; internal: number | null; consensus: number | null }[]
    }
  ): Promise<void> {
    return this.put(`/tearsheet/${companyId}/meta`, {
      yfinance: earningsData,
    })
  }

  /**
   * Get documents for a specific company
   * @param companyId - The company ID to fetch documents for
   * @param skip - Number of documents to skip (for pagination)
   * @param limit - Maximum number of documents to return
   * @returns Promise<ApiDocumentsResponse>
   */
  async getDocuments(
    companyId: number,
    skip: number = 0,
    limit: number = 25
  ): Promise<ApiDocumentsResponse> {
    const filters = JSON.stringify({
      company_ids__contains_value: [companyId],
    })

    return this.get<ApiDocumentsResponse>(
      `/documents/?skip=${skip}&limit=${limit}&filters=${encodeURIComponent(filters)}`
    )
  }
}

export const tearsheetService = new TearsheetService()
