/**
 * Error handling for the Luzia SDK.
 *
 * Uses a single LuziaError class with `status` and `code` discriminators
 * for simple, type-safe error handling.
 */

import type { ApiErrorResponse, RateLimitErrorResponse, RateLimitInfo } from './types/index.ts'

/**
 * Error codes for categorizing errors.
 */
export type ErrorCode =
  | 'auth' // 401 - Authentication failed
  | 'not_found' // 404 - Resource not found
  | 'validation' // 400 - Invalid request
  | 'rate_limit' // 429 - Rate limit exceeded
  | 'timeout' // Request timed out
  | 'network' // Network/connection error
  | 'server' // 5xx - Server error
  | 'unknown' // Unknown error

/**
 * Options for creating a LuziaError.
 */
export interface LuziaErrorOptions {
  /** HTTP status code (if applicable) */
  status?: number
  /** Error code for categorization */
  code?: ErrorCode
  /** Unique request identifier for debugging */
  correlationId?: string
  /** Original error cause */
  cause?: unknown
  /** Rate limit info (for rate_limit errors) */
  rateLimitInfo?: RateLimitInfo
  /** Seconds until rate limit resets (for rate_limit errors) */
  retryAfter?: number
  /** Additional validation details (for validation errors) */
  details?: Record<string, unknown>
  /** Timeout duration in ms (for timeout errors) */
  timeoutMs?: number
}

/**
 * Single error class for all Luzia SDK errors.
 *
 * Use the `code` property to distinguish error types:
 * - `auth` - Authentication failed (401)
 * - `not_found` - Resource not found (404)
 * - `validation` - Invalid request parameters (400)
 * - `rate_limit` - Rate limit exceeded (429)
 * - `timeout` - Request timed out
 * - `network` - Network/connection error
 * - `server` - Server error (5xx)
 *
 * @example
 * ```typescript
 * try {
 *   await luzia.tickers.get('binance', 'BTC/USDT')
 * } catch (error) {
 *   if (error instanceof LuziaError) {
 *     switch (error.code) {
 *       case 'rate_limit':
 *         console.log(`Rate limited. Retry after ${error.retryAfter}s`)
 *         break
 *       case 'auth':
 *         console.log('Invalid API key')
 *         break
 *       case 'not_found':
 *         console.log('Resource not found')
 *         break
 *     }
 *   }
 * }
 * ```
 */
export class LuziaError extends Error {
  /** HTTP status code (if applicable) */
  readonly status?: number
  /** Error code for categorization */
  readonly code: ErrorCode
  /** Unique request identifier for debugging */
  readonly correlationId?: string
  /** Rate limit info (for rate_limit errors) */
  readonly rateLimitInfo?: RateLimitInfo
  /** Seconds until rate limit resets (for rate_limit errors) */
  readonly retryAfter?: number
  /** Additional validation details (for validation errors) */
  readonly details?: Record<string, unknown>
  /** Timeout duration in ms (for timeout errors) */
  readonly timeoutMs?: number

  constructor(message: string, options?: LuziaErrorOptions) {
    super(message, { cause: options?.cause })
    this.name = 'LuziaError'
    this.status = options?.status
    this.code = options?.code ?? 'unknown'
    this.correlationId = options?.correlationId
    this.rateLimitInfo = options?.rateLimitInfo
    this.retryAfter = options?.retryAfter
    this.details = options?.details
    this.timeoutMs = options?.timeoutMs
  }
}

// ─────────────────────────────────────────────────────────────
// Error Factory
// ─────────────────────────────────────────────────────────────

/**
 * Parse rate limit information from response headers.
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('X-RateLimit-Limit')
  const remaining = headers.get('X-RateLimit-Remaining')
  const reset = headers.get('X-RateLimit-Reset')

  if (!limit || !remaining || !reset) {
    return null
  }

  const info: RateLimitInfo = {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
  }

  // Parse daily rate limit headers (Free tier only)
  const dailyLimit = headers.get('X-RateLimit-Daily-Limit')
  const dailyRemaining = headers.get('X-RateLimit-Daily-Remaining')
  const dailyReset = headers.get('X-RateLimit-Daily-Reset')

  if (dailyLimit) info.dailyLimit = parseInt(dailyLimit, 10)
  if (dailyRemaining) info.dailyRemaining = parseInt(dailyRemaining, 10)
  if (dailyReset) info.dailyReset = parseInt(dailyReset, 10)

  return info
}

/**
 * Create an appropriate error from an API response.
 */
export async function createErrorFromResponse(
  response: Response,
  rateLimitInfo?: RateLimitInfo | null
): Promise<LuziaError> {
  const { status } = response
  let body: ApiErrorResponse | RateLimitErrorResponse | null = null

  try {
    body = (await response.json()) as ApiErrorResponse
  } catch {
    // Response body is not JSON or empty
  }

  const message = body?.message || response.statusText || 'Unknown error'
  const correlationId = body?.correlationId

  switch (status) {
    case 400:
      return new LuziaError(message, {
        status,
        code: 'validation',
        correlationId,
        details: body?.details,
      })

    case 401:
      return new LuziaError(message, {
        status,
        code: 'auth',
        correlationId,
      })

    case 404:
      return new LuziaError(message, {
        status,
        code: 'not_found',
        correlationId,
      })

    case 429: {
      const rateLimitBody = body as RateLimitErrorResponse
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10)

      // Build rate limit info from headers if not provided
      const info = rateLimitInfo ||
        parseRateLimitHeaders(response.headers) || {
          limit: rateLimitBody?.limit || 0,
          remaining: 0,
          reset: Math.floor(Date.now() / 1000) + retryAfter,
        }

      return new LuziaError(message, {
        status,
        code: 'rate_limit',
        correlationId,
        rateLimitInfo: info,
        retryAfter,
      })
    }

    case 503:
      return new LuziaError(message, {
        status,
        code: 'server',
        correlationId,
      })

    default: {
      const code: ErrorCode = status >= 500 ? 'server' : 'unknown'
      return new LuziaError(message, { status, code, correlationId })
    }
  }
}

/**
 * Determine if an error is retryable.
 *
 * Retryable errors:
 * - `rate_limit` - Rate limited (429)
 * - `network` - Connection errors
 * - `timeout` - Request timeouts
 * - `server` - Server errors (5xx)
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof LuziaError)) {
    return false
  }

  // Check by error code
  if (
    error.code === 'rate_limit' ||
    error.code === 'network' ||
    error.code === 'timeout' ||
    error.code === 'server'
  ) {
    return true
  }

  // Also check by status for generic errors
  const status = error.status
  if (status !== undefined) {
    return status === 408 || status === 429 || status >= 500
  }

  return false
}

/**
 * Type guard to check if an error is a LuziaError.
 */
export function isLuziaError(error: unknown): error is LuziaError {
  return error instanceof LuziaError
}
