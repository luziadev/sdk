/**
 * Billing resource for the Luzia SDK.
 *
 * Provides methods for balance management, pricing discovery,
 * transaction history, and balance top-ups.
 */

import type { Luzia } from '../client.ts'
import type {
  BalanceResponse,
  ListTransactionsOptions,
  PricingResponse,
  TopUpAmount,
  TopUpResponse,
  TransactionsResponse,
} from '../types/index.ts'

/**
 * Resource for interacting with billing endpoints.
 *
 * All billing endpoints are free (no balance deduction).
 *
 * @example
 * ```typescript
 * const luzia = new Luzia({ apiKey: 'lz_xxx' })
 *
 * // Check balance
 * const balance = await luzia.billing.getBalance()
 * console.log(`Balance: $${balance.balance_usd}`)
 *
 * // View pricing
 * const pricing = await luzia.billing.getPricing()
 *
 * // Get transaction history
 * const { transactions } = await luzia.billing.getTransactions({ limit: 10 })
 *
 * // Top up balance
 * const { checkout_url } = await luzia.billing.topUp(1000) // $10.00
 * ```
 */
export class BillingResource {
  constructor(private readonly client: Luzia) {}

  /**
   * Get the current user's balance and lifetime spending summary.
   *
   * @returns Balance information including current balance, lifetime spend, and top-up URL
   * @throws {LuziaError} With code 'auth' if API key is invalid
   */
  async getBalance(): Promise<BalanceResponse> {
    return this.client.request<BalanceResponse>('/billing/balance')
  }

  /**
   * Get the full pricing table.
   *
   * This endpoint is public and does not require authentication.
   * Response is cached (1 hour) since pricing rarely changes.
   *
   * @returns Complete pricing table with REST, WebSocket, and free endpoint information
   */
  async getPricing(): Promise<PricingResponse> {
    return this.client.request<PricingResponse>('/billing/pricing', { auth: false })
  }

  /**
   * Get paginated balance transaction history.
   *
   * @param options - Pagination and filter options
   * @returns Paginated list of balance transactions (newest first)
   * @throws {LuziaError} With code 'auth' if API key is invalid
   * @throws {LuziaError} With code 'validation' if options are invalid
   */
  async getTransactions(options?: ListTransactionsOptions): Promise<TransactionsResponse> {
    return this.client.request<TransactionsResponse>('/billing/transactions', {
      query: options ? { ...options } : undefined,
    })
  }

  /**
   * Initiate a balance top-up via Polar checkout.
   *
   * Creates a one-time payment checkout session and returns the URL
   * to redirect the user to. Allowed amounts: $5, $10, $25, $50, $100.
   *
   * @param amountCents - Top-up amount in cents (500, 1000, 2500, 5000, or 10000)
   * @returns Checkout URL, top-up ID, and formatted amount
   * @throws {LuziaError} With code 'auth' if API key is invalid
   * @throws {LuziaError} With code 'validation' if amount is not an allowed tier
   */
  async topUp(amountCents: TopUpAmount): Promise<TopUpResponse> {
    return this.client.request<TopUpResponse>('/billing/top-up', {
      method: 'POST',
      body: { amount_cents: amountCents },
    })
  }
}
