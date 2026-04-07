/**
 * Base API Service
 * Common API methods used across all services
 */

import apiClient from '@/config/axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

export class BaseApiService {
  /**
   * GET request
   */
  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.get(url, config)
    return response.data
  }

  /**
   * POST request
   */
  protected async post<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.post(url, data, config)
    return response.data
  }

  /**
   * PUT request
   */
  protected async put<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.put(url, data, config)
    return response.data
  }

  /**
   * PATCH request
   */
  protected async patch<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.patch(url, data, config)
    return response.data
  }

  /**
   * DELETE request
   */
  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.delete(url, config)
    return response.data
  }
}
