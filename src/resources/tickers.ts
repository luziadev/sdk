/**
 * Tickers resource for the Luzia SDK.
 *
 * Provides methods for getting real-time price data.
 */

import type { Luzia } from '../client.ts'
import type {
  ListTickersFilteredOptions,
  ListTickersOptions,
  Ticker,
  TickerListResponse,
} from '../types/index.ts'

/**
 * Resource for interacting with ticker endpoints.
 *
 * @example
 * ```typescript
 * const luzia = new Luzia({ apiKey: 'lz_xxx' })
 *
 * // Get a single ticker
 * const ticker = await luzia.tickers.get('binance', 'BTC/USDT')
 * console.log(`BTC/USDT: $${ticker.last}`)
 *
 * // Get all tickers for an exchange
 * const { tickers, total } = await luzia.tickers.list('binance', { limit: 50 })
 *
 * // Get specific tickers across exchanges
 * const { tickers: filtered } = await luzia.tickers.listFiltered({
 *   symbols: ['BTC/USDT', 'ETH/USDT'],
 * })
 * ```
 */
export class TickersResource {
  constructor(private readonly client: Luzia) {}

  /**
   * Get a single ticker for a trading pair on an exchange.
   *
   * @param exchange - Exchange identifier (e.g., "binance")
   * @param symbol - Trading pair symbol in normalized format (e.g., "BTC/USDT")
   * @returns Ticker data for the trading pair
   *
   * @throws {LuziaError} With code 'not_found' if the exchange or symbol is not found
   * @throws {LuziaError} With code 'server' if the exchange is temporarily unavailable
   *
   * @example
   * ```typescript
   * const ticker = await luzia.tickers.get('binance', 'BTC/USDT')
   * console.log(`Last price: $${ticker.last}`)
   * console.log(`24h volume: ${ticker.volume} BTC`)
   * ```
   */
  async get(exchange: string, symbol: string): Promise<Ticker> {
    const urlSymbol = this.client.symbolToUrl(symbol.toUpperCase())
    return this.client.request<Ticker>(`/v1/ticker/${exchange.toLowerCase()}/${urlSymbol}`)
  }

  /**
   * List all tickers for an exchange.
   *
   * @param exchange - Exchange identifier (e.g., "binance")
   * @param options - Pagination options
   * @returns Paginated list of tickers
   *
   * @throws {LuziaError} With code 'not_found' if the exchange is not found
   * @throws {LuziaError} With code 'server' if the exchange is temporarily unavailable
   *
   * @example
   * ```typescript
   * // Get first 50 tickers
   * const { tickers, total } = await luzia.tickers.list('binance', { limit: 50 })
   *
   * // Get next page
   * const { tickers: page2 } = await luzia.tickers.list('binance', {
   *   limit: 50,
   *   offset: 50,
   * })
   * ```
   */
  async list(exchange: string, options?: ListTickersOptions): Promise<TickerListResponse> {
    return this.client.request<TickerListResponse>(`/v1/tickers/${exchange.toLowerCase()}`, {
      query: {
        limit: options?.limit,
        offset: options?.offset,
      },
    })
  }

  /**
   * List tickers with filters (bulk endpoint).
   *
   * This endpoint supports filtering by exchange and specific symbols,
   * making it efficient for fetching multiple specific tickers.
   *
   * @param options - Filter and pagination options
   * @returns Paginated list of tickers matching the filters
   *
   * @example
   * ```typescript
   * // Get specific tickers across all exchanges
   * const { tickers } = await luzia.tickers.listFiltered({
   *   symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
   * })
   *
   * // Get specific tickers from one exchange
   * const { tickers: binanceTickers } = await luzia.tickers.listFiltered({
   *   exchange: 'binance',
   *   symbols: ['BTC/USDT', 'ETH/USDT'],
   * })
   *
   * // Get all tickers with pagination
   * const { tickers: all, total } = await luzia.tickers.listFiltered({
   *   limit: 100,
   *   offset: 0,
   * })
   * ```
   */
  async listFiltered(options?: ListTickersFilteredOptions): Promise<TickerListResponse> {
    const query: Record<string, string | number | undefined> = {
      limit: options?.limit,
      offset: options?.offset,
    }

    if (options?.exchange) {
      query.exchange = options.exchange.toLowerCase()
    }

    if (options?.symbols && options.symbols.length > 0) {
      // Convert symbols to URL format and join with commas
      query.symbols = options.symbols.map((s) => this.client.symbolToUrl(s.toUpperCase())).join(',')
    }

    return this.client.request<TickerListResponse>('/v1/tickers', { query })
  }
}
