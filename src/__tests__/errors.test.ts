import { describe, expect, it } from 'bun:test'
import {
  createErrorFromResponse,
  isLuziaError,
  isRetryableError,
  LuziaError,
  parseRateLimitHeaders,
} from '../errors.ts'

describe('LuziaError', () => {
  it('should create error with message only', () => {
    const error = new LuziaError('Something went wrong')
    expect(error.message).toBe('Something went wrong')
    expect(error.name).toBe('LuziaError')
    expect(error.code).toBe('unknown')
    expect(error.status).toBeUndefined()
  })

  it('should create error with all options', () => {
    const error = new LuziaError('Error', {
      status: 500,
      code: 'server',
      correlationId: 'abc123',
    })
    expect(error.status).toBe(500)
    expect(error.code).toBe('server')
    expect(error.correlationId).toBe('abc123')
  })

  it('should create auth error', () => {
    const error = new LuziaError('Invalid API key', { status: 401, code: 'auth' })
    expect(error.message).toBe('Invalid API key')
    expect(error.status).toBe(401)
    expect(error.code).toBe('auth')
  })

  it('should create rate limit error with retryAfter', () => {
    const error = new LuziaError('Rate limit exceeded', {
      status: 429,
      code: 'rate_limit',
      retryAfter: 60,
      rateLimitInfo: {
        limit: 100,
        remaining: 0,
        reset: 1704067200,
      },
    })
    expect(error.message).toBe('Rate limit exceeded')
    expect(error.status).toBe(429)
    expect(error.code).toBe('rate_limit')
    expect(error.retryAfter).toBe(60)
    expect(error.rateLimitInfo?.limit).toBe(100)
  })

  it('should create not found error', () => {
    const error = new LuziaError('Exchange not found', { status: 404, code: 'not_found' })
    expect(error.message).toBe('Exchange not found')
    expect(error.status).toBe(404)
    expect(error.code).toBe('not_found')
  })

  it('should create validation error with details', () => {
    const error = new LuziaError('Invalid parameter', {
      status: 400,
      code: 'validation',
      details: { field: 'limit', reason: 'must be positive' },
    })
    expect(error.message).toBe('Invalid parameter')
    expect(error.status).toBe(400)
    expect(error.code).toBe('validation')
    expect(error.details).toEqual({ field: 'limit', reason: 'must be positive' })
  })

  it('should create network error with cause', () => {
    const cause = new TypeError('fetch failed')
    const error = new LuziaError('Network error', { code: 'network', cause })
    expect(error.message).toBe('Network error')
    expect(error.code).toBe('network')
    expect(error.cause).toBe(cause)
  })

  it('should create timeout error', () => {
    const error = new LuziaError('Request timed out', { code: 'timeout', timeoutMs: 30000 })
    expect(error.message).toBe('Request timed out')
    expect(error.code).toBe('timeout')
    expect(error.timeoutMs).toBe(30000)
  })
})

describe('isLuziaError', () => {
  it('should return true for LuziaError instances', () => {
    expect(isLuziaError(new LuziaError('test'))).toBe(true)
    expect(isLuziaError(new LuziaError('test', { code: 'auth' }))).toBe(true)
    expect(isLuziaError(new LuziaError('test', { code: 'not_found' }))).toBe(true)
  })

  it('should return false for non-LuziaError instances', () => {
    expect(isLuziaError(new Error('test'))).toBe(false)
    expect(isLuziaError('test')).toBe(false)
    expect(isLuziaError(null)).toBe(false)
  })
})

describe('isRetryableError', () => {
  it('should return true for rate limit errors', () => {
    const error = new LuziaError('Rate limited', {
      status: 429,
      code: 'rate_limit',
      retryAfter: 60,
    })
    expect(isRetryableError(error)).toBe(true)
  })

  it('should return true for network errors', () => {
    expect(isRetryableError(new LuziaError('Network error', { code: 'network' }))).toBe(true)
  })

  it('should return true for timeout errors', () => {
    expect(isRetryableError(new LuziaError('Timeout', { code: 'timeout' }))).toBe(true)
  })

  it('should return true for server errors', () => {
    expect(isRetryableError(new LuziaError('Server error', { status: 500, code: 'server' }))).toBe(
      true
    )
    expect(isRetryableError(new LuziaError('Bad gateway', { status: 502, code: 'server' }))).toBe(
      true
    )
    expect(isRetryableError(new LuziaError('Unavailable', { status: 503, code: 'server' }))).toBe(
      true
    )
  })

  it('should return false for auth errors', () => {
    expect(isRetryableError(new LuziaError('Unauthorized', { status: 401, code: 'auth' }))).toBe(
      false
    )
  })

  it('should return false for not found errors', () => {
    expect(isRetryableError(new LuziaError('Not found', { status: 404, code: 'not_found' }))).toBe(
      false
    )
  })

  it('should return false for validation errors', () => {
    expect(isRetryableError(new LuziaError('Invalid', { status: 400, code: 'validation' }))).toBe(
      false
    )
  })

  it('should return false for non-LuziaError', () => {
    expect(isRetryableError(new Error('test'))).toBe(false)
  })
})

describe('parseRateLimitHeaders', () => {
  it('should parse rate limit headers', () => {
    const headers = new Headers({
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '95',
      'X-RateLimit-Reset': '1704067200',
    })

    const info = parseRateLimitHeaders(headers)
    expect(info).toEqual({
      limit: 100,
      remaining: 95,
      reset: 1704067200,
    })
  })

  it('should parse daily rate limit headers', () => {
    const headers = new Headers({
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '95',
      'X-RateLimit-Reset': '1704067200',
      'X-RateLimit-Daily-Limit': '5000',
      'X-RateLimit-Daily-Remaining': '4500',
      'X-RateLimit-Daily-Reset': '1704067200',
    })

    const info = parseRateLimitHeaders(headers)
    expect(info).toEqual({
      limit: 100,
      remaining: 95,
      reset: 1704067200,
      dailyLimit: 5000,
      dailyRemaining: 4500,
      dailyReset: 1704067200,
    })
  })

  it('should return null if headers are missing', () => {
    const headers = new Headers()
    expect(parseRateLimitHeaders(headers)).toBeNull()
  })
})

describe('createErrorFromResponse', () => {
  it('should create auth error for 401', async () => {
    const response = new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid API key' }),
      { status: 401 }
    )

    const error = await createErrorFromResponse(response)
    expect(error).toBeInstanceOf(LuziaError)
    expect(error.code).toBe('auth')
    expect(error.status).toBe(401)
    expect(error.message).toBe('Invalid API key')
  })

  it('should create validation error for 400', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid limit',
        details: { field: 'limit' },
      }),
      { status: 400 }
    )

    const error = await createErrorFromResponse(response)
    expect(error).toBeInstanceOf(LuziaError)
    expect(error.code).toBe('validation')
    expect(error.status).toBe(400)
    expect(error.message).toBe('Invalid limit')
    expect(error.details).toEqual({ field: 'limit' })
  })

  it('should create not found error for 404', async () => {
    const response = new Response(
      JSON.stringify({ error: 'Not Found', message: 'Exchange not found' }),
      { status: 404 }
    )

    const error = await createErrorFromResponse(response)
    expect(error).toBeInstanceOf(LuziaError)
    expect(error.code).toBe('not_found')
    expect(error.status).toBe(404)
    expect(error.message).toBe('Exchange not found')
  })

  it('should create rate limit error for 429', async () => {
    const headers = new Headers({
      'Retry-After': '60',
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1704067200',
    })
    const response = new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        type: 'minute',
      }),
      { status: 429, headers }
    )

    const error = await createErrorFromResponse(response)
    expect(error).toBeInstanceOf(LuziaError)
    expect(error.code).toBe('rate_limit')
    expect(error.status).toBe(429)
    expect(error.message).toBe('Rate limit exceeded')
    expect(error.retryAfter).toBe(60)
  })

  it('should create server error for 503', async () => {
    const response = new Response(
      JSON.stringify({ error: 'Service Unavailable', message: 'Exchange down' }),
      { status: 503 }
    )

    const error = await createErrorFromResponse(response)
    expect(error).toBeInstanceOf(LuziaError)
    expect(error.code).toBe('server')
    expect(error.status).toBe(503)
    expect(error.message).toBe('Exchange down')
  })

  it('should create server error for 500', async () => {
    const response = new Response(
      JSON.stringify({ error: 'Internal Error', message: 'Unknown error' }),
      { status: 500 }
    )

    const error = await createErrorFromResponse(response)
    expect(error).toBeInstanceOf(LuziaError)
    expect(error.code).toBe('server')
    expect(error.status).toBe(500)
    expect(error.message).toBe('Unknown error')
  })

  it('should handle non-JSON response', async () => {
    const response = new Response('Not Found', { status: 404, statusText: 'Not Found' })

    const error = await createErrorFromResponse(response)
    expect(error).toBeInstanceOf(LuziaError)
    expect(error.code).toBe('not_found')
    expect(error.message).toBe('Not Found')
  })
})
