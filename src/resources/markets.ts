/**
 * Markets resource for the Luzia SDK.
 *
 * Provides methods for listing trading pairs (markets) on exchanges.
 */

import type { Luzia } from '../client.ts'
import type { ListMarketsOptions, MarketListResponse } from '../types/index.ts'

/**
 * Resource for interacting with market endpoints.
 *
 * @example
 * ```typescript
 * const luzia = new Luzia({ apiKey: 'lz_xxx' })
 *
 * // List markets for an exchange
 * const { markets, total } = await luzia.markets.list('binance', { quote: 'USDT' })
 *
 * for (const market of markets) {
 *   console.log(`${market.symbol}: ${market.base}/${market.quote}`)
 * }
 * ```
 */
export class MarketsResource {
  constructor(private readonly client: Luzia) {}

  /**
   * List markets for a specific exchange.
   *
   * @param exchange - Exchange identifier (e.g., "binance")
   * @param options - Filter and pagination options
   * @returns Paginated list of markets
   *
   * @example
   * ```typescript
   * // Get all USDT pairs on Binance
   * const { markets, total } = await luzia.markets.list('binance', {
   *   quote: 'USDT',
   *   limit: 100,
   * })
   *
   * // Get BTC markets
   * const { markets: btcMarkets } = await luzia.markets.list('coinbase', {
   *   base: 'BTC',
   * })
   * ```
   */
  async list(exchange: string, options?: ListMarketsOptions): Promise<MarketListResponse> {
    const query: Record<string, string | number | boolean | undefined> = {
      limit: options?.limit,
      offset: options?.offset,
    }

    if (options?.base) {
      query.base = options.base.toUpperCase()
    }
    if (options?.quote) {
      query.quote = options.quote.toUpperCase()
    }
    if (options?.active !== undefined) {
      query.active = options.active
    }

    return this.client.request<MarketListResponse>(`/v1/markets/${exchange.toLowerCase()}`, {
      query,
    })
  }
}
