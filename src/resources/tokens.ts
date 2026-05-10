/**
 * Tokens resource for the Luzia SDK.
 *
 * Provides methods for listing canonical assets and on-chain tokens.
 */

import type { Luzia } from '../client.ts'
import type { Pagination, Token, TokenListResponse } from '../types/index.ts'

/** Options accepted by {@link TokensResource.list}. */
export interface ListTokensOptions {
  /** Search across symbol, name, and id (case-insensitive). */
  search?: string
  /** Filter by chain id (e.g. `'ethereum'`, `'solana'`). */
  chainId?: string
  /**
   * `true` returns on-chain tokens only, `false` returns chainless canonical
   * tokens only. Omit for both.
   */
  hasChain?: boolean
  /** Page number (1-based). Defaults to 1. */
  page?: number
  /** Items per page (1-100). Defaults to 20. */
  limit?: number
}

export interface TokensListPage {
  data: Token[]
  pagination: Pagination
}

/**
 * Resource for token endpoints.
 *
 * @example
 * ```typescript
 * const luzia = new Luzia({ apiKey: 'lz_xxx' })
 *
 * // List the first 20 tokens by symbol
 * const { data, pagination } = await luzia.tokens.list()
 *
 * // Search for USDC across chains
 * const usdc = await luzia.tokens.list({ search: 'USDC' })
 *
 * // Look up a specific token by id
 * const eth = await luzia.tokens.get('crypto:ETH')
 * ```
 */
export class TokensResource {
  constructor(private readonly client: Luzia) {}

  async list(options: ListTokensOptions = {}): Promise<TokensListPage> {
    const query: Record<string, string> = {}
    if (options.search) query.search = options.search
    if (options.chainId) query.chainId = options.chainId
    if (options.hasChain !== undefined) query.hasChain = options.hasChain ? 'true' : 'false'
    if (options.page !== undefined) query.page = String(options.page)
    if (options.limit !== undefined) query.limit = String(options.limit)

    const response = await this.client.request<TokenListResponse>('/v1/tokens', { query })
    return {
      data: response.data ?? [],
      pagination: response.pagination,
    }
  }

  async get(id: string): Promise<Token> {
    const response = await this.client.request<{ data: Token }>(
      `/v1/tokens/${encodeURIComponent(id)}`
    )
    return response.data
  }
}
