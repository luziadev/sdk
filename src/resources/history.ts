/**
 * History resource for the Luzia SDK.
 *
 * Provides methods for fetching historical OHLCV candle data.
 */

import type { Luzia } from '../client.ts'
import type { GetHistoryOptions, OHLCVResponse } from '../types/index.ts'

/**
 * Resource for interacting with the history endpoint.
 *
 * @example
 * ```typescript
 * const luzia = new Luzia({ apiKey: 'lz_xxx' })
 *
 * // Get hourly candles for last 24h (defaults)
 * const data = await luzia.history.get('binance', 'BTC/USDT')
 *
 * // Get 5-minute candles with custom time range
 * const data = await luzia.history.get('binance', 'BTC/USDT', {
 *   interval: '5m',
 *   start: Date.now() - 3600000,
 *   end: Date.now(),
 *   limit: 100,
 * })
 * ```
 */
export class HistoryResource {
  constructor(private readonly client: Luzia) {}

  /**
   * Get historical OHLCV candle data for a trading pair on an exchange.
   *
   * @param exchange - Exchange identifier (e.g., "binance")
   * @param symbol - Trading pair symbol in normalized format (e.g., "BTC/USDT")
   * @param options - History query options (interval, start, end, limit)
   * @returns OHLCV response with candle data
   *
   * @throws {LuziaError} With code 'not_found' if the exchange or symbol is not found
   * @throws {LuziaError} With code 'auth' if lookback exceeds tier limit (LOOKBACK_EXCEEDED)
   *
   * @example
   * ```typescript
   * const { candles, count } = await luzia.history.get('binance', 'BTC/USDT', {
   *   interval: '1h',
   *   limit: 24,
   * })
   * for (const candle of candles) {
   *   console.log(`${new Date(candle.timestamp).toISOString()} O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close}`)
   * }
   * ```
   */
  async get(exchange: string, symbol: string, options?: GetHistoryOptions): Promise<OHLCVResponse> {
    const urlSymbol = this.client.symbolToUrl(symbol.toUpperCase())
    return this.client.request<OHLCVResponse>(
      `/v1/history/${exchange.toLowerCase()}/${urlSymbol}`,
      {
        query: {
          interval: options?.interval,
          start: options?.start,
          end: options?.end,
          limit: options?.limit,
        },
      }
    )
  }
}
