import { describe, expect, it, mock } from 'bun:test'
import { Luzia } from '../client.ts'
import { LuziaError } from '../errors.ts'

describe('Luzia', () => {
  describe('constructor', () => {
    it('should require an API key', () => {
      expect(() => new Luzia({ apiKey: '' })).toThrow(LuziaError)
    })

    it('should use default base URL', () => {
      const client = new Luzia({ apiKey: 'lz_test' })
      expect(client).toBeDefined()
    })

    it('should accept custom base URL', () => {
      const client = new Luzia({
        apiKey: 'lz_test',
        baseUrl: 'http://localhost:3000',
      })
      expect(client).toBeDefined()
    })

    it('should remove trailing slash from base URL', () => {
      const client = new Luzia({
        apiKey: 'lz_test',
        baseUrl: 'http://localhost:3000/',
      })
      expect(client).toBeDefined()
    })
  })

  describe('symbolToUrl', () => {
    it('should convert normalized symbol to URL format', () => {
      const client = new Luzia({ apiKey: 'lz_test' })
      expect(client.symbolToUrl('BTC/USDT')).toBe('BTC-USDT')
      expect(client.symbolToUrl('ETH/BTC')).toBe('ETH-BTC')
    })
  })

  describe('symbolFromUrl', () => {
    it('should convert URL format to normalized symbol', () => {
      const client = new Luzia({ apiKey: 'lz_test' })
      expect(client.symbolFromUrl('BTC-USDT')).toBe('BTC/USDT')
      expect(client.symbolFromUrl('ETH-BTC')).toBe('ETH/BTC')
    })
  })

  describe('rateLimitInfo', () => {
    it('should be null initially', () => {
      const client = new Luzia({ apiKey: 'lz_test' })
      expect(client.rateLimitInfo).toBeNull()
    })
  })
})

describe('Luzia requests', () => {
  const createMockFetch = (response: Response | (() => Response)) => {
    return mock((_url: string, _init?: RequestInit) => {
      const res = typeof response === 'function' ? response() : response
      return Promise.resolve(res)
    })
  }

  it('should make authenticated requests', async () => {
    const mockResponse = new Response(
      JSON.stringify({ exchanges: [{ id: 'binance', name: 'Binance' }] }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '99',
          'X-RateLimit-Reset': '1704067200',
        },
      }
    )

    const mockFetch = createMockFetch(mockResponse)

    const client = new Luzia({
      apiKey: 'lz_test_key',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })

    await client.exchanges.list()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/v1/exchanges')
  })

  it('should include authorization header for authenticated requests', async () => {
    const mockFetch = mock((_url: string, _init?: RequestInit) => {
      return Promise.resolve(
        new Response(JSON.stringify({ symbol: 'BTC/USDT', last: 50000 }), {
          status: 200,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '99',
            'X-RateLimit-Reset': '1704067200',
          },
        })
      )
    })

    const client = new Luzia({
      apiKey: 'lz_test_key',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })

    await client.tickers.get('binance', 'BTC/USDT')

    const [, init] = mockFetch.mock.calls[0]
    expect(init?.headers).toBeDefined()
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer lz_test_key')
  })

  it('should build query parameters correctly', async () => {
    const mockFetch = mock((_url: string) => {
      return Promise.resolve(
        new Response(JSON.stringify({ tickers: [], total: 0, limit: 50, offset: 10 }), {
          status: 200,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '99',
            'X-RateLimit-Reset': '1704067200',
          },
        })
      )
    })

    const client = new Luzia({
      apiKey: 'lz_test_key',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })

    await client.tickers.list('binance', { limit: 50, offset: 10 })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('limit=50')
    expect(url).toContain('offset=10')
  })

  it('should update rate limit info from response headers', async () => {
    const mockFetch = createMockFetch(
      new Response(JSON.stringify({ exchanges: [] }), {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '95',
          'X-RateLimit-Reset': '1704067200',
          'X-RateLimit-Daily-Limit': '5000',
          'X-RateLimit-Daily-Remaining': '4500',
          'X-RateLimit-Daily-Reset': '1704153600',
        },
      })
    )

    const client = new Luzia({
      apiKey: 'lz_test_key',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })

    await client.exchanges.list()

    expect(client.rateLimitInfo).toEqual({
      limit: 100,
      remaining: 95,
      reset: 1704067200,
      dailyLimit: 5000,
      dailyRemaining: 4500,
      dailyReset: 1704153600,
    })
  })

  it('should throw LuziaError with code auth for 401 response', async () => {
    const mockFetch = createMockFetch(
      new Response(JSON.stringify({ error: 'Unauthorized', message: 'Invalid API key' }), {
        status: 401,
      })
    )

    const client = new Luzia({
      apiKey: 'lz_invalid',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })

    try {
      await client.tickers.get('binance', 'BTC/USDT')
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(LuziaError)
      expect((error as LuziaError).code).toBe('auth')
      expect((error as LuziaError).status).toBe(401)
    }
  })

  it('should throw LuziaError with code not_found for 404 response', async () => {
    const mockFetch = createMockFetch(
      new Response(JSON.stringify({ error: 'Not Found', message: 'Exchange not found' }), {
        status: 404,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '99',
          'X-RateLimit-Reset': '1704067200',
        },
      })
    )

    const client = new Luzia({
      apiKey: 'lz_test',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })

    try {
      await client.tickers.get('invalid', 'BTC/USDT')
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(LuziaError)
      expect((error as LuziaError).code).toBe('not_found')
      expect((error as LuziaError).status).toBe(404)
    }
  })

  it('should throw LuziaError with code rate_limit for 429 response', async () => {
    const mockFetch = createMockFetch(
      new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          type: 'minute',
        }),
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1704067200',
            'Retry-After': '60',
          },
        }
      )
    )

    const client = new Luzia({
      apiKey: 'lz_test',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
      retry: { maxRetries: 0 }, // Disable retry for this test
    })

    try {
      await client.tickers.get('binance', 'BTC/USDT')
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(LuziaError)
      expect((error as LuziaError).code).toBe('rate_limit')
      expect((error as LuziaError).status).toBe(429)
      expect((error as LuziaError).retryAfter).toBe(60)
    }
  })
})

describe('Luzia resources', () => {
  const createClient = (responseData: unknown, status = 200) => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify(responseData), {
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '99',
            'X-RateLimit-Reset': '1704067200',
          },
        })
      )
    )

    return new Luzia({
      apiKey: 'lz_test',
      baseUrl: 'http://localhost:3000',
      fetch: mockFetch as unknown as typeof fetch,
    })
  }

  describe('exchanges', () => {
    it('should list exchanges', async () => {
      const client = createClient({
        exchanges: [
          {
            id: 'binance',
            name: 'Binance',
            status: 'operational',
            websiteUrl: 'https://binance.com',
          },
          {
            id: 'coinbase',
            name: 'Coinbase',
            status: 'operational',
            websiteUrl: 'https://coinbase.com',
          },
        ],
      })

      const exchanges = await client.exchanges.list()
      expect(exchanges).toHaveLength(2)
      expect(exchanges[0].id).toBe('binance')
      expect(exchanges[1].id).toBe('coinbase')
    })
  })

  describe('tickers', () => {
    it('should get a single ticker', async () => {
      const client = createClient({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        last: 50000.5,
        bid: 50000,
        ask: 50001,
        high: 51000,
        low: 49000,
        volume: 1000,
        timestamp: 1704067200000,
      })

      const ticker = await client.tickers.get('binance', 'BTC/USDT')
      expect(ticker.symbol).toBe('BTC/USDT')
      expect(ticker.exchange).toBe('binance')
      expect(ticker.last).toBe(50000.5)
    })

    it('should list tickers for an exchange', async () => {
      const client = createClient({
        tickers: [
          { symbol: 'BTC/USDT', exchange: 'binance', last: 50000 },
          { symbol: 'ETH/USDT', exchange: 'binance', last: 3000 },
        ],
        total: 100,
        limit: 20,
        offset: 0,
      })

      const response = await client.tickers.list('binance')
      expect(response.tickers).toHaveLength(2)
      expect(response.total).toBe(100)
    })

    it('should list filtered tickers', async () => {
      const mockFetch = mock((_url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              tickers: [{ symbol: 'BTC/USDT', exchange: 'binance', last: 50000 }],
              total: 1,
              limit: 20,
              offset: 0,
            }),
            {
              status: 200,
              headers: {
                'X-RateLimit-Limit': '100',
                'X-RateLimit-Remaining': '99',
                'X-RateLimit-Reset': '1704067200',
              },
            }
          )
        )
      )

      const client = new Luzia({
        apiKey: 'lz_test',
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as unknown as typeof fetch,
      })

      await client.tickers.listFiltered({
        exchange: 'binance',
        symbols: ['BTC/USDT', 'ETH/USDT'],
      })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('exchange=binance')
      expect(url).toContain('symbols=BTC-USDT%2CETH-USDT')
    })
  })

  describe('markets', () => {
    it('should list markets for an exchange', async () => {
      const client = createClient({
        markets: [
          { symbol: 'BTC/USDT', exchange: 'binance', base: 'BTC', quote: 'USDT', active: true },
          { symbol: 'ETH/USDT', exchange: 'binance', base: 'ETH', quote: 'USDT', active: true },
        ],
        total: 500,
        limit: 100,
        offset: 0,
      })

      const response = await client.markets.list('binance')
      expect(response.markets).toHaveLength(2)
      expect(response.total).toBe(500)
    })

    it('should list markets with filters', async () => {
      const mockFetch = mock((_url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              markets: [
                {
                  symbol: 'BTC/USDT',
                  exchange: 'binance',
                  base: 'BTC',
                  quote: 'USDT',
                  active: true,
                },
              ],
              total: 1,
              limit: 100,
              offset: 0,
            }),
            {
              status: 200,
              headers: {
                'X-RateLimit-Limit': '100',
                'X-RateLimit-Remaining': '99',
                'X-RateLimit-Reset': '1704067200',
              },
            }
          )
        )
      )

      const client = new Luzia({
        apiKey: 'lz_test',
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as unknown as typeof fetch,
      })

      await client.markets.list('binance', {
        base: 'btc',
        quote: 'usdt',
        active: true,
      })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('base=BTC')
      expect(url).toContain('quote=USDT')
      expect(url).toContain('active=true')
    })
  })
})
