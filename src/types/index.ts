/**
 * Type definitions for the Luzia SDK.
 *
 * API types are auto-generated from the OpenAPI specification.
 * SDK-specific types (client options, retry config) are defined in options.ts.
 */

import type { components } from './generated.ts'

// ─────────────────────────────────────────────────────────────
// Re-export generated types from OpenAPI (Single Source of Truth)
// ─────────────────────────────────────────────────────────────

/** Exchange information */
export type Exchange = components['schemas']['Exchange']

/** Response from the list exchanges endpoint */
export type ExchangeListResponse = components['schemas']['ExchangeListResponse']

/** Trading pair (market) information */
export type Market = components['schemas']['Market']

/** Response from the list markets endpoint */
export type MarketListResponse = components['schemas']['MarketListResponse']

/** Real-time price data for a trading pair */
export type Ticker = components['schemas']['Ticker']

/** Response from the list tickers endpoint */
export type TickerListResponse = components['schemas']['TickerListResponse']

/** API error response format */
export type ApiErrorResponse = components['schemas']['Error']

// ─────────────────────────────────────────────────────────────
// SDK-specific types (not in OpenAPI)
// ─────────────────────────────────────────────────────────────

export type {
  ListMarketsOptions,
  ListTickersFilteredOptions,
  ListTickersOptions,
  LuziaOptions,
  PaginationOptions,
  RateLimitInfo,
  RetryOptions,
} from './options.ts'

// ─────────────────────────────────────────────────────────────
// Additional type aliases for convenience
// ─────────────────────────────────────────────────────────────

/** Exchange operational status */
export type ExchangeStatus = NonNullable<Exchange['status']>

/** Rate limit error response format */
export interface RateLimitErrorResponse extends ApiErrorResponse {
  /** Type of rate limit exceeded */
  type?: 'minute' | 'daily'
  /** The rate limit that was exceeded */
  limit?: number
  /** Unix timestamp when the limit resets */
  resetAt?: number
}
