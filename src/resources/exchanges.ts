/**
 * Exchanges resource for the Luzia SDK.
 *
 * Provides methods for listing supported exchanges.
 */

import type { Luzia } from '../client.ts'
import type { Exchange, ExchangeListResponse, ExchangeType } from '../types/index.ts'

/** Options accepted by {@link ExchangesResource.list}. */
export interface ListExchangesOptions {
  /**
   * Filter exchanges by kind. `cex` returns only centralized exchanges,
   * `dex` returns only decentralized exchanges. Omit for all.
   */
  type?: ExchangeType
}

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
 * // List only DEX exchanges
 * const dexes = await luzia.exchanges.list({ type: 'dex' })
 *
 * for (const exchange of exchanges) {
 *   console.log(`${exchange.name} (${exchange.id}): ${exchange.status}`)
 * }
 * ```
 */
export class ExchangesResource {
  constructor(private readonly client: Luzia) {}

  /**
   * List supported exchanges, optionally filtered by kind.
   *
   * @param options - Optional filters (e.g. `{ type: 'dex' }`).
   * @returns Array of exchange information
   *
   * @throws {LuziaError} With code 'auth' if API key is invalid
   *
   * @example
   * ```typescript
   * const exchanges = await luzia.exchanges.list()
   * // [
   * //   { id: 'binance', name: 'Binance', status: 'operational', type: 'cex', chainId: null, dexId: null, ... },
   * //   { id: 'raydium-solana', name: 'Raydium (Solana)', status: 'operational', type: 'dex', chainId: 'solana', dexId: 'raydium', ... },
   * // ]
   * ```
   */
  async list(options: ListExchangesOptions = {}): Promise<Exchange[]> {
    const query: Record<string, string> = {}
    if (options.type) query.type = options.type
    const response = await this.client.request<ExchangeListResponse>('/v1/exchanges', { query })
    return response.exchanges ?? []
  }
}
