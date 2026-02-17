/**
 * Luzia API Client.
 *
 * The main entry point for interacting with the Luzia cryptocurrency pricing API.
 * Provides type-safe access to all API endpoints with automatic retry handling.
 */

import { createErrorFromResponse, LuziaError, parseRateLimitHeaders } from './errors.ts'
import { ExchangesResource } from './resources/exchanges.ts'
import { HistoryResource } from './resources/history.ts'
import { MarketsResource } from './resources/markets.ts'
import { TickersResource } from './resources/tickers.ts'
import { type OnRetryCallback, withRetry } from './retry.ts'
import type { LuziaOptions, RateLimitInfo, RetryOptions } from './types/index.ts'
import { LuziaWebSocket, type WebSocketOptions } from './websocket.ts'

/**
 * Default client configuration.
 */
const DEFAULT_OPTIONS = {
  baseUrl: 'https://api.luzia.dev',
  timeout: 30000,
} as const

/**
 * Query parameter value types.
 */
type QueryValue = string | number | boolean | undefined

/**
 * Request options for internal use.
 */
export interface RequestOptions {
  /** Whether to include authentication header */
  auth?: boolean
  /** Query parameters */
  query?: Record<string, QueryValue>
  /** Override retry options for this request */
  retry?: RetryOptions
  /** Callback invoked before each retry */
  onRetry?: OnRetryCallback
}

/**
 * Build URL with query parameters.
 */
function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  let url = `${baseUrl}${path}`
  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value))
    }
  }
  const queryString = params.toString()
  if (queryString) {
    url += `?${queryString}`
  }
  return url
}

/**
 * Build request headers.
 */
function buildHeaders(apiKey: string, auth: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (auth) {
    headers.Authorization = `Bearer ${apiKey}`
  }
  return headers
}

/**
 * Handle errors from fetch and convert to SDK errors.
 */
function handleFetchError(error: unknown, timeout: number): never {
  // Handle abort (timeout)
  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new LuziaError(`Request timed out after ${timeout}ms`, {
      code: 'timeout',
      timeoutMs: timeout,
    })
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new LuziaError(`Network error: ${error.message}`, {
      code: 'network',
      cause: error,
    })
  }

  // Re-throw LuziaErrors as-is
  if (error instanceof LuziaError) {
    throw error
  }

  // Wrap unknown errors
  throw new LuziaError(error instanceof Error ? error.message : 'Unknown network error', {
    code: 'network',
    cause: error,
  })
}

/**
 * Luzia API Client.
 *
 * @example
 * ```typescript
 * import { Luzia } from '@luziadev/sdk'
 *
 * const luzia = new Luzia({
 *   apiKey: 'lz_your_api_key',
 *   baseUrl: 'https://api.luzia.dev', // optional
 *   retry: { maxRetries: 3 },         // optional
 * })
 *
 * // Get exchanges
 * const exchanges = await luzia.exchanges.list()
 *
 * // Get a single ticker
 * const ticker = await luzia.tickers.get('binance', 'BTC/USDT')
 *
 * // Get all tickers for an exchange
 * const { tickers, total } = await luzia.tickers.list('binance', { limit: 50 })
 * ```
 */
export class Luzia {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly retryOptions?: RetryOptions
  private readonly fetchImpl: typeof globalThis.fetch

  /** Most recent rate limit information from the last request */
  private _lastRateLimitInfo: RateLimitInfo | null = null

  /** Exchange resource for listing supported exchanges */
  readonly exchanges: ExchangesResource
  /** History resource for fetching OHLCV candle data */
  readonly history: HistoryResource
  /** Markets resource for listing trading pairs */
  readonly markets: MarketsResource
  /** Tickers resource for getting price data */
  readonly tickers: TickersResource

  constructor(options: LuziaOptions) {
    if (!options.apiKey) {
      throw new LuziaError('API key is required')
    }

    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl || DEFAULT_OPTIONS.baseUrl).replace(/\/$/, '')
    this.timeout = options.timeout ?? DEFAULT_OPTIONS.timeout
    this.retryOptions = options.retry
    this.fetchImpl = options.fetch ?? globalThis.fetch

    // Initialize resource instances
    this.exchanges = new ExchangesResource(this)
    this.history = new HistoryResource(this)
    this.markets = new MarketsResource(this)
    this.tickers = new TickersResource(this)
  }

  /**
   * Create a WebSocket connection for real-time ticker updates.
   * Requires a Pro plan or higher.
   */
  createWebSocket(options?: WebSocketOptions): LuziaWebSocket {
    const wsBaseUrl = this.baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    return new LuziaWebSocket(`${wsBaseUrl}/v1/ws`, {
      ...options,
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
  }

  /**
   * Get the most recent rate limit information.
   *
   * Returns null if no requests have been made yet.
   */
  get rateLimitInfo(): RateLimitInfo | null {
    return this._lastRateLimitInfo
  }

  /**
   * Convert a symbol from normalized format (BTC/USDT) to URL format (BTC-USDT).
   */
  symbolToUrl(symbol: string): string {
    return symbol.replaceAll('/', '-')
  }

  /**
   * Convert a symbol from URL format (BTC-USDT) to normalized format (BTC/USDT).
   */
  symbolFromUrl(symbol: string): string {
    return symbol.replaceAll('-', '/')
  }

  /**
   * Make an authenticated request to the Luzia API.
   *
   * @internal This method is intended for use by resource classes.
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { auth = true, query, retry, onRetry } = options

    // Merge retry options
    const mergedRetryOptions = {
      ...this.retryOptions,
      ...retry,
    }

    return withRetry(() => this._doRequest<T>(path, auth, query), mergedRetryOptions, onRetry)
  }

  /**
   * Execute a single request (without retry logic).
   */
  private async _doRequest<T>(
    path: string,
    auth: boolean,
    query?: Record<string, QueryValue>
  ): Promise<T> {
    const url = buildUrl(this.baseUrl, path, query)
    const headers = buildHeaders(this.apiKey, auth)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      const rateLimitInfo = parseRateLimitHeaders(response.headers)
      if (rateLimitInfo) {
        this._lastRateLimitInfo = rateLimitInfo
      }

      if (!response.ok) {
        throw await createErrorFromResponse(response, rateLimitInfo)
      }

      return (await response.json()) as T
    } catch (error) {
      handleFetchError(error, this.timeout)
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
