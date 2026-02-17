/**
 * SDK configuration and options types.
 */

/**
 * Options for configuring retry behavior.
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts.
   * @default 3
   */
  maxRetries?: number

  /**
   * Initial delay in milliseconds before the first retry.
   * @default 1000
   */
  initialDelayMs?: number

  /**
   * Maximum delay in milliseconds between retries.
   * @default 30000
   */
  maxDelayMs?: number

  /**
   * Multiplier for exponential backoff.
   * @default 2
   */
  backoffMultiplier?: number

  /**
   * Whether to add random jitter to retry delays.
   * @default true
   */
  jitter?: boolean
}

/**
 * Rate limit information from API response headers.
 */
export interface RateLimitInfo {
  /** Maximum requests per minute for the current tier */
  limit: number
  /** Requests remaining in the current minute window */
  remaining: number
  /** Unix timestamp when the minute window resets */
  reset: number
  /** Maximum requests per day (Free tier only) */
  dailyLimit?: number
  /** Requests remaining today (Free tier only) */
  dailyRemaining?: number
  /** Unix timestamp for midnight UTC (Free tier only) */
  dailyReset?: number
}

/**
 * Options for configuring the Luzia client.
 */
export interface LuziaOptions {
  /**
   * Your Luzia API key (format: lz_xxxxx).
   */
  apiKey: string

  /**
   * Base URL for the Luzia API.
   * @default "https://api.luzia.dev"
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number

  /**
   * Retry configuration options.
   */
  retry?: RetryOptions

  /**
   * Custom fetch implementation (for testing or custom environments).
   */
  fetch?: typeof globalThis.fetch
}

/**
 * Pagination options for list endpoints.
 */
export interface PaginationOptions {
  /**
   * Maximum number of results to return.
   */
  limit?: number

  /**
   * Number of results to skip.
   */
  offset?: number
}

/**
 * Options for listing tickers.
 */
export interface ListTickersOptions extends PaginationOptions {}

/**
 * Options for listing tickers with filters (bulk endpoint).
 */
export interface ListTickersFilteredOptions extends PaginationOptions {
  /** Filter by exchange ID */
  exchange?: string
  /** Filter by specific symbols (normalized format, e.g., "BTC/USDT") */
  symbols?: string[]
}

/**
 * Options for listing markets.
 */
export interface ListMarketsOptions extends PaginationOptions {
  /** Filter by base currency (e.g., "BTC") */
  base?: string
  /** Filter by quote currency (e.g., "USDT") */
  quote?: string
  /** Filter by active status */
  active?: boolean
}

/**
 * Valid candle intervals for OHLCV history data.
 */
export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

/**
 * Options for fetching historical OHLCV candle data.
 */
export interface GetHistoryOptions {
  /** Candle interval (default: "1h") */
  interval?: CandleInterval
  /** Start timestamp in Unix milliseconds (default: 24h ago) */
  start?: number
  /** End timestamp in Unix milliseconds (default: now) */
  end?: number
  /** Maximum number of candles to return (default: 300, max: 500) */
  limit?: number
}
