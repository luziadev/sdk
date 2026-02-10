/**
 * Exchanges resource for the Luzia SDK.
 *
 * Provides methods for listing supported exchanges.
 */

import type { Luzia } from '../client.ts'
import type { Exchange, ExchangeListResponse } from '../types/index.ts'

/**
 * Resource for interacting with exchange endpoints.
 *
 * @example
 * ```typescript
 * const luzia = new Luzia({ apiKey: 'lz_xxx' })
 *
 * // List all supported exchanges
 * const exchanges = await luzia.exchanges.list()
 *
 * for (const exchange of exchanges) {
 *   console.log(`${exchange.name} (${exchange.id}): ${exchange.status}`)
 * }
 * ```
 */
export class ExchangesResource {
  constructor(private readonly client: Luzia) {}

  /**
   * List all supported exchanges.
   *
   * @returns Array of exchange information
   *
   * @throws {LuziaError} With code 'auth' if API key is invalid
   *
   * @example
   * ```typescript
   * const exchanges = await luzia.exchanges.list()
   * // [
   * //   { id: 'binance', name: 'Binance', status: 'operational', websiteUrl: 'https://binance.com' },
   * //   { id: 'coinbase', name: 'Coinbase', status: 'operational', websiteUrl: 'https://coinbase.com' },
   * // ]
   * ```
   */
  async list(): Promise<Exchange[]> {
    const response = await this.client.request<ExchangeListResponse>('/v1/exchanges')
    return response.exchanges ?? []
  }
}
