/**
 * @luziadev/sdk - Official TypeScript SDK for the Luzia cryptocurrency pricing API.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { Luzia, LuziaError } from '@luziadev/sdk'
 *
 * const luzia = new Luzia({
 *   apiKey: 'lz_your_api_key',
 * })
 *
 * // List exchanges
 * const exchanges = await luzia.exchanges.list()
 *
 * // Get a single ticker
 * const ticker = await luzia.tickers.get('binance', 'BTC/USDT')
 * console.log(`BTC/USDT: $${ticker.last}`)
 *
 * // Get all tickers for an exchange
 * const { tickers, total } = await luzia.tickers.list('binance')
 *
 * // Get markets with filters
 * const { markets } = await luzia.markets.list('binance', { quote: 'USDT' })
 *
 * // Error handling
 * try {
 *   await luzia.tickers.get('invalid', 'X')
 * } catch (error) {
 *   if (error instanceof LuziaError) {
 *     if (error.code === 'rate_limit') {
 *       console.log(`Retry after ${error.retryAfter}s`)
 *     }
 *   }
 * }
 * ```
 */

// Client
export type { RequestOptions } from './client.ts'
export { Luzia } from './client.ts'

// Errors
export type { ErrorCode, LuziaErrorOptions } from './errors.ts'
export {
  createErrorFromResponse,
  isLuziaError,
  isRetryableError,
  LuziaError,
  parseRateLimitHeaders,
} from './errors.ts'

// Resources
export {
  ExchangesResource,
  HistoryResource,
  MarketsResource,
  TickersResource,
} from './resources/index.ts'

// Retry
export type { OnRetryCallback, ResolvedRetryOptions, RetryContext } from './retry.ts'
export {
  calculateRetryDelay,
  isRetryableStatus,
  resolveRetryOptions,
  withRetry,
} from './retry.ts'

// Types
export type {
  ApiErrorResponse,
  CandleInterval,
  Exchange,
  ExchangeListResponse,
  ExchangeStatus,
  GetHistoryOptions,
  ListMarketsOptions,
  ListTickersFilteredOptions,
  ListTickersOptions,
  LuziaOptions,
  Market,
  MarketListResponse,
  OHLCVCandle,
  OHLCVResponse,
  PaginationOptions,
  RateLimitErrorResponse,
  RateLimitInfo,
  RetryOptions,
  Ticker,
  TickerListResponse,
} from './types/index.ts'
export type {
  WebSocketConstructor,
  WebSocketOptions,
  WSConnectedData,
  WSConnectionState,
  WSErrorData,
  WSEventCallback,
  WSEventMap,
  WSPongData,
  WSServerMessage,
  WSSubscribedData,
  WSTickerData,
  WSUnsubscribedData,
} from './websocket.ts'
// WebSocket
export { LuziaWebSocket } from './websocket.ts'
