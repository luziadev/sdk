/**
 * Type definitions for billing-related API responses and options.
 */

/**
 * Balance transaction types.
 */
export type TransactionType = 'debit' | 'credit' | 'refund' | 'bonus'

/**
 * Balance information parsed from response headers.
 *
 * Available after any authenticated API request via `client.balanceInfo`.
 */
export interface BalanceInfo {
  /** Remaining balance in USD (e.g., "4.9900") */
  balance: string
  /** Cost of the last request in USD (e.g., "0.0005") */
  cost: string
}

/**
 * Response from GET /billing/balance.
 */
export interface BalanceResponse {
  /** Current balance formatted as USD string */
  balance_usd: string
  /** Current balance in cents */
  balance_cents: number
  /** Total lifetime spending formatted as USD string */
  lifetime_spent_usd: string
  /** Total lifetime spending in cents */
  lifetime_spent_cents: number
  /** Free credit amount formatted as USD string (always "5.00") */
  free_credit_usd: string
  /** URL to the top-up page */
  top_up_url: string
}

/**
 * A single REST API pricing entry.
 */
export interface RestPricingEntry {
  endpoint: string
  cost_usd?: number
  unit: string
  tiers?: Array<{ limit: string; cost_usd: number }>
}

/**
 * A single WebSocket pricing entry.
 */
export interface WebSocketPricingEntry {
  description: string
  cost_usd: number
  unit: string
}

/**
 * Response from GET /billing/pricing.
 */
export interface PricingResponse {
  currency: string
  free_credit_usd: number
  rest: RestPricingEntry[]
  websocket: WebSocketPricingEntry[]
  free_endpoints: string[]
}

/**
 * A single balance transaction record.
 */
export interface BalanceTransaction {
  id: string
  type: TransactionType
  amount_usd: string
  balance_after_usd: string
  description: string
  endpoint: string | null
  created_at: string
}

/**
 * Response from GET /billing/transactions.
 */
export interface TransactionsResponse {
  transactions: BalanceTransaction[]
  page: number
  limit: number
  total: number
}

/**
 * Options for listing balance transactions.
 */
export interface ListTransactionsOptions {
  /** Page number (1-indexed, default: 1) */
  page?: number
  /** Transactions per page (default: 50, max: 100) */
  limit?: number
  /** Filter by transaction type */
  type?: TransactionType
}

/**
 * Response from POST /billing/top-up.
 */
export interface TopUpResponse {
  /** Polar checkout URL to redirect the user to */
  checkout_url: string
  /** ID of the created top-up record */
  top_up_id: string
  /** Top-up amount formatted as USD string */
  amount_usd: string
}

/**
 * Allowed top-up amounts in cents.
 */
export const ALLOWED_TOP_UP_AMOUNTS = [500, 1000, 2500, 5000, 10000] as const

/**
 * A valid top-up amount in cents ($5, $10, $25, $50, $100).
 */
export type TopUpAmount = (typeof ALLOWED_TOP_UP_AMOUNTS)[number]
