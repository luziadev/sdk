/**
 * Orderbook resource for the Luzia SDK.
 *
 * Provides methods for fetching real-time orderbook (depth) data.
 */

import type { Luzia } from '../client.ts'
import type { GetOrderBookOptions, OrderBookResponse } from '../types/index.ts'

/**
 * Resource for interacting with the orderbook endpoint.
 *
 * @example
 * ```typescript
 * const luzia = new Luzia({ apiKey: 'lz_xxx' })
 *
 * // Get orderbook with default depth (20 levels)
 * const orderbook = await luzia.orderbook.get('binance', 'BTC/USDT')
 *
 * // Get orderbook with custom depth
 * const orderbook = await luzia.orderbook.get('binance', 'BTC/USDT', { depth: 10 })
 * ```
 */
export class OrderBookResource {
  constructor(private readonly client: Luzia) {}

  /**
   * Get the real-time orderbook for a trading pair on an exchange.
   *
   * @param exchange - Exchange identifier (e.g., "binance")
   * @param symbol - Trading pair symbol in normalized format (e.g., "BTC/USDT")
   * @param options - Query options (depth)
   * @returns Orderbook snapshot with bids and asks
   *
   * @throws {LuziaError} With code 'not_found' if the exchange or symbol is not found
   * @throws {LuziaError} With code 'server' if no orderbook data is available (503)
   *
   * @example
   * ```typescript
   * const { bids, asks, depth } = await luzia.orderbook.get('binance', 'BTC/USDT', { depth: 5 })
   * console.log(`Best bid: ${bids[0][0]} @ ${bids[0][1]}`)
   * console.log(`Best ask: ${asks[0][0]} @ ${asks[0][1]}`)
   * console.log(`Spread: ${asks[0][0] - bids[0][0]}`)
   * ```
   */
  async get(
    exchange: string,
    symbol: string,
    options?: GetOrderBookOptions
  ): Promise<OrderBookResponse> {
    const urlSymbol = this.client.symbolToUrl(symbol.toUpperCase())
    return this.client.request<OrderBookResponse>(
      `/v1/orderbook/${exchange.toLowerCase()}/${urlSymbol}`,
      {
        query: {
          depth: options?.depth,
        },
      }
    )
  }
}
