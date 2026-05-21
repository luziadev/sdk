import { describe, expect, it, mock } from 'bun:test'
import { Luzia } from '../client.ts'

/**
 * Coverage for the resources added alongside the 1.3.0 platform release:
 * `tokens`, `fiatCurrencies`, and the `type` filter on `exchanges.list()`.
 */

const RATE_LIMIT_HEADERS = {
  'Content-Type': 'application/json',
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '99',
  'X-RateLimit-Reset': '1704067200',
}

/** Build a client whose fetch always returns `responseData`, and expose the mock. */
const createClient = (responseData: unknown, status = 200) => {
  const mockFetch = mock((_url: string, _init?: RequestInit) =>
    Promise.resolve(
      new Response(JSON.stringify(responseData), { status, headers: RATE_LIMIT_HEADERS })
    )
  )
  const client = new Luzia({
    apiKey: 'lz_test',
    baseUrl: 'http://localhost:3000',
    fetch: mockFetch as unknown as typeof fetch,
  })
  return { client, mockFetch }
}

describe('exchanges.list type filter', () => {
  it('omits the type query param when no filter is given', async () => {
    const { client, mockFetch } = createClient({ exchanges: [] })
    await client.exchanges.list()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/v1/exchanges')
  })

  it('passes ?type=dex and surfaces DEX metadata', async () => {
    const { client, mockFetch } = createClient({
      exchanges: [
        {
          id: 'raydium-solana',
          name: 'Raydium (Solana)',
          status: 'operational',
          type: 'dex',
          chainId: 'solana',
          dexId: 'raydium',
        },
      ],
    })

    const exchanges = await client.exchanges.list({ type: 'dex' })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('type=dex')
    expect(exchanges[0].type).toBe('dex')
    expect(exchanges[0].chainId).toBe('solana')
    expect(exchanges[0].dexId).toBe('raydium')
  })
})

describe('tokens resource', () => {
  it('lists tokens and returns data + pagination', async () => {
    const { client } = createClient({
      data: [{ id: 'crypto:USDC', symbol: 'USDC', name: 'USD Coin', decimals: 6 }],
      pagination: { page: 1, limit: 20, pages: 1, total: 1 },
    })

    const { data, pagination } = await client.tokens.list()
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('crypto:USDC')
    expect(pagination.total).toBe(1)
  })

  it('forwards search, chainId, hasChain, and pagination query params', async () => {
    const { client, mockFetch } = createClient({
      data: [],
      pagination: { page: 2, limit: 50, pages: 0, total: 0 },
    })

    await client.tokens.list({
      search: 'USDC',
      chainId: 'solana',
      hasChain: true,
      page: 2,
      limit: 50,
    })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('search=USDC')
    expect(url).toContain('chainId=solana')
    expect(url).toContain('hasChain=true')
    expect(url).toContain('page=2')
    expect(url).toContain('limit=50')
  })

  it('sends hasChain=false when explicitly disabled', async () => {
    const { client, mockFetch } = createClient({
      data: [],
      pagination: { page: 1, limit: 20, pages: 0, total: 0 },
    })

    await client.tokens.list({ hasChain: false })
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('hasChain=false')
  })

  it('gets a single token by composite id and URL-encodes it', async () => {
    const { client, mockFetch } = createClient({
      data: { id: 'crypto:USDC', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    })

    const token = await client.tokens.get('crypto:USDC')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/v1/tokens/crypto%3AUSDC')
    expect(token.id).toBe('crypto:USDC')
    expect(token.symbol).toBe('USDC')
  })
})

describe('fiatCurrencies resource', () => {
  it('lists fiat currencies and returns data + pagination', async () => {
    const { client } = createClient({
      data: [{ code: 'USD', name: 'United States Dollar', symbol: '$', enabled: true }],
      pagination: { page: 1, limit: 50, pages: 1, total: 1 },
    })

    const { data, pagination } = await client.fiatCurrencies.list()
    expect(data).toHaveLength(1)
    expect(data[0].code).toBe('USD')
    expect(pagination.total).toBe(1)
  })

  it('maps the enabled filter to its query value', async () => {
    const { client, mockFetch } = createClient({
      data: [],
      pagination: { page: 1, limit: 50, pages: 0, total: 0 },
    })

    await client.fiatCurrencies.list({ enabled: 'all' })
    expect(mockFetch.mock.calls[0][0]).toContain('enabled=all')

    await client.fiatCurrencies.list({ enabled: false })
    expect(mockFetch.mock.calls[1][0]).toContain('enabled=false')
  })

  it('gets a single currency and upper-cases the code', async () => {
    const { client, mockFetch } = createClient({
      data: { code: 'USD', name: 'United States Dollar', symbol: '$', enabled: true },
    })

    const currency = await client.fiatCurrencies.get('usd')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/v1/fiat-currencies/USD')
    expect(currency.code).toBe('USD')
  })
})
