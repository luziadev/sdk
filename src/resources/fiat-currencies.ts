/**
 * Fiat currencies resource for the Luzia SDK.
 *
 * Provides methods for listing ISO 4217 fiat currencies referenced by markets
 * (e.g. USD, EUR, GBP). Stablecoins are tokens — see {@link TokensResource}.
 */

import type { Luzia } from '../client.ts'
import type { FiatCurrency, FiatCurrencyListResponse, Pagination } from '../types/index.ts'

/** Options accepted by {@link FiatCurrenciesResource.list}. */
export interface ListFiatCurrenciesOptions {
  /** Search across code and name (case-insensitive). */
  search?: string
  /** `true` returns enabled only, `false` disabled only, `'all'` for both. Defaults to `true`. */
  enabled?: boolean | 'all'
  /** Page number (1-based). Defaults to 1. */
  page?: number
  /** Items per page (1-200). Defaults to 50. */
  limit?: number
}

export interface FiatCurrenciesListPage {
  data: FiatCurrency[]
  pagination: Pagination
}

export class FiatCurrenciesResource {
  constructor(private readonly client: Luzia) {}

  async list(options: ListFiatCurrenciesOptions = {}): Promise<FiatCurrenciesListPage> {
    const query: Record<string, string> = {}
    if (options.search) query.search = options.search
    if (options.enabled !== undefined) {
      query.enabled = options.enabled === 'all' ? 'all' : options.enabled ? 'true' : 'false'
    }
    if (options.page !== undefined) query.page = String(options.page)
    if (options.limit !== undefined) query.limit = String(options.limit)

    const response = await this.client.request<FiatCurrencyListResponse>('/v1/fiat-currencies', {
      query,
    })
    return {
      data: response.data ?? [],
      pagination: response.pagination,
    }
  }

  async get(code: string): Promise<FiatCurrency> {
    const response = await this.client.request<{ data: FiatCurrency }>(
      `/v1/fiat-currencies/${encodeURIComponent(code.toUpperCase())}`
    )
    return response.data
  }
}
