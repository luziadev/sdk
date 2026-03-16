import { describe, expect, it, mock } from 'bun:test'
import { Luzia } from '../client.ts'
import { InsufficientBalanceError, isInsufficientBalanceError, LuziaError } from '../errors.ts'

/**
 * Create a Luzia client with a mock fetch that returns the given response.
 */
function createClient(responseData: unknown, status = 200, headers: Record<string, string> = {}) {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': '1000',
    'X-RateLimit-Remaining': '999',
    'X-RateLimit-Reset': '1704067200',
    ...headers,
  }

  const mockFetch = mock((_url: string, _init?: RequestInit) =>
    Promise.resolve(new Response(JSON.stringify(responseData), { status, headers: defaultHeaders }))
  )

  const client = new Luzia({
    apiKey: 'lz_test',
    baseUrl: 'http://localhost:3000',
    fetch: mockFetch as unknown as typeof fetch,
    retry: { maxRetries: 0 },
  })

  return { client, mockFetch }
}

describe('BillingResource', () => {
  describe('getBalance', () => {
    it('should return balance information', async () => {
      const balanceData = {
        balance_usd: '4.50',
        balance_cents: 450,
        lifetime_spent_usd: '0.50',
        lifetime_spent_cents: 50,
        free_credit_usd: '5.00',
        top_up_url: 'https://luzia.dev/billing/top-up',
      }

      const { client, mockFetch } = createClient(balanceData)
      const result = await client.billing.getBalance()

      expect(result).toEqual(balanceData)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/billing/balance')
    })
  })

  describe('getPricing', () => {
    it('should return pricing table without authentication', async () => {
      const pricingData = {
        currency: 'USD',
        free_credit_usd: 5.0,
        rest: [{ endpoint: 'GET /v1/exchanges', cost_usd: 0.0001, unit: 'per request' }],
        websocket: [
          { description: 'Per subscription per minute', cost_usd: 0.0005, unit: 'per sub/min' },
        ],
        free_endpoints: ['Auth endpoints (/auth/*)', 'Billing endpoints (/billing/*)'],
      }

      const { client, mockFetch } = createClient(pricingData)
      const result = await client.billing.getPricing()

      expect(result).toEqual(pricingData)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/billing/pricing')
      // Pricing endpoint should not include Authorization header
      expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
    })
  })

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const transactionsData = {
        transactions: [
          {
            id: 'tx-001',
            type: 'debit',
            amount_usd: '-0.01',
            balance_after_usd: '4.99',
            description: 'API request: /v1/tickers',
            endpoint: '/v1/tickers/binance/BTC-USDT',
            created_at: '2026-03-13T10:00:00.000Z',
          },
        ],
        page: 1,
        limit: 50,
        total: 1,
      }

      const { client, mockFetch } = createClient(transactionsData)
      const result = await client.billing.getTransactions()

      expect(result.transactions).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/billing/transactions')
    })

    it('should pass pagination and filter options as query params', async () => {
      const { client, mockFetch } = createClient({
        transactions: [],
        page: 2,
        limit: 10,
        total: 0,
      })

      await client.billing.getTransactions({ page: 2, limit: 10, type: 'credit' })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('page=2')
      expect(url).toContain('limit=10')
      expect(url).toContain('type=credit')
    })
  })

  describe('topUp', () => {
    it('should create a top-up checkout session', async () => {
      const topUpData = {
        checkout_url: 'https://sandbox.polar.sh/checkout/abc123',
        top_up_id: 'topup-001',
        amount_usd: '10.00',
      }

      const { client, mockFetch } = createClient(topUpData)
      const result = await client.billing.topUp(1000)

      expect(result).toEqual(topUpData)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('http://localhost:3000/billing/top-up')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(init?.body as string)).toEqual({ amount_cents: 1000 })
    })
  })
})

describe('Balance response headers', () => {
  it('should parse X-Balance-Remaining and X-Request-Cost headers', async () => {
    const { client } = createClient({ exchanges: [{ id: 'binance', name: 'Binance' }] }, 200, {
      'X-Balance-Remaining': '4.9900',
      'X-Request-Cost': '0.0001',
    })

    expect(client.balanceInfo).toBeNull()

    await client.exchanges.list()

    expect(client.balanceInfo).toEqual({
      balance: '4.9900',
      cost: '0.0001',
    })
  })

  it('should not set balanceInfo when headers are absent', async () => {
    const { client } = createClient({ exchanges: [] })

    await client.exchanges.list()

    expect(client.balanceInfo).toBeNull()
  })

  it('should update balanceInfo on each request', async () => {
    let callCount = 0
    const mockFetch = mock(() => {
      callCount++
      const balance = callCount === 1 ? '4.9900' : '4.9800'
      const cost = callCount === 1 ? '0.0001' : '0.0002'
      return Promise.resolve(
        new Response(JSON.stringify({ exchanges: [] }), {
          status: 200,
          headers: {
            'X-RateLimit-Limit': '1000',
            'X-RateLimit-Remaining': '999',
            'X-RateLimit-Reset': '1704067200',
            'X-Balance-Remaining': balance,
            'X-Request-Cost': cost,
          },
        })
      )
    })

    const client = new Luzia({
      apiKey: 'lz_test',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })

    await client.exchanges.list()
    expect(client.balanceInfo).toEqual({ balance: '4.9900', cost: '0.0001' })

    await client.exchanges.list()
    expect(client.balanceInfo).toEqual({ balance: '4.9800', cost: '0.0002' })
  })
})

describe('InsufficientBalanceError', () => {
  it('should throw InsufficientBalanceError on 402 response', async () => {
    const { client } = createClient(
      {
        error: 'insufficient_balance',
        message: 'Insufficient balance',
        balance_usd: '0.01',
        top_up_url: 'https://luzia.dev/billing/top-up',
      },
      402
    )

    try {
      await client.exchanges.list()
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientBalanceError)
      expect(error).toBeInstanceOf(LuziaError)
      const err = error as InsufficientBalanceError
      expect(err.code).toBe('insufficient_balance')
      expect(err.status).toBe(402)
      expect(err.balance).toBe('0.01')
      expect(err.topUpUrl).toBe('https://luzia.dev/billing/top-up')
    }
  })

  it('should be detected by isInsufficientBalanceError', async () => {
    const err = new InsufficientBalanceError('test', '0.00', 'https://example.com/top-up')
    expect(isInsufficientBalanceError(err)).toBe(true)
    expect(isInsufficientBalanceError(new LuziaError('test'))).toBe(false)
    expect(isInsufficientBalanceError(new Error('test'))).toBe(false)
  })

  it('should not be retryable', async () => {
    const { isRetryableError } = await import('../errors.ts')
    const err = new InsufficientBalanceError('test', '0.00', 'https://example.com/top-up')
    expect(isRetryableError(err)).toBe(false)
  })
})
