import { describe, expect, it, mock } from 'bun:test'
import { LuziaError } from '../errors.ts'
import { calculateRetryDelay, isRetryableStatus, resolveRetryOptions, withRetry } from '../retry.ts'

describe('resolveRetryOptions', () => {
  it('should return defaults when no options provided', () => {
    const options = resolveRetryOptions()
    expect(options).toEqual({
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitter: true,
    })
  })

  it('should merge provided options with defaults', () => {
    const options = resolveRetryOptions({ maxRetries: 5, initialDelayMs: 500 })
    expect(options.maxRetries).toBe(5)
    expect(options.initialDelayMs).toBe(500)
    expect(options.maxDelayMs).toBe(30000) // default
    expect(options.backoffMultiplier).toBe(2) // default
  })
})

describe('calculateRetryDelay', () => {
  const options = resolveRetryOptions({ jitter: false })

  it('should calculate exponential backoff', () => {
    expect(calculateRetryDelay(0, options)).toBe(1000) // 1000 * 2^0
    expect(calculateRetryDelay(1, options)).toBe(2000) // 1000 * 2^1
    expect(calculateRetryDelay(2, options)).toBe(4000) // 1000 * 2^2
    expect(calculateRetryDelay(3, options)).toBe(8000) // 1000 * 2^3
  })

  it('should cap at maxDelayMs', () => {
    const shortMaxOptions = resolveRetryOptions({ jitter: false, maxDelayMs: 5000 })
    expect(calculateRetryDelay(5, shortMaxOptions)).toBe(5000)
  })

  it('should respect rate limit retryAfter', () => {
    const rateLimitError = new LuziaError('Rate limited', {
      status: 429,
      code: 'rate_limit',
      retryAfter: 20, // 20 seconds
    })

    const delay = calculateRetryDelay(0, options, rateLimitError)
    expect(delay).toBe(20100) // 20s + 100ms buffer
  })

  it('should cap rate limit delay at maxDelayMs', () => {
    const shortMaxOptions = resolveRetryOptions({ jitter: false, maxDelayMs: 5000 })
    const rateLimitError = new LuziaError('Rate limited', {
      status: 429,
      code: 'rate_limit',
      retryAfter: 60, // 60 seconds > 5 second max
    })

    const delay = calculateRetryDelay(0, shortMaxOptions, rateLimitError)
    expect(delay).toBe(5000)
  })

  it('should add jitter when enabled', () => {
    const jitterOptions = resolveRetryOptions({ jitter: true })
    const delays = new Set<number>()

    // Run multiple times and check that we get different values
    for (let i = 0; i < 10; i++) {
      delays.add(calculateRetryDelay(1, jitterOptions))
    }

    // With jitter, we should see some variation
    expect(delays.size).toBeGreaterThan(1)
  })
})

describe('isRetryableStatus', () => {
  it('should return true for retryable status codes', () => {
    expect(isRetryableStatus(408)).toBe(true) // Request Timeout
    expect(isRetryableStatus(429)).toBe(true) // Too Many Requests
    expect(isRetryableStatus(500)).toBe(true) // Internal Server Error
    expect(isRetryableStatus(502)).toBe(true) // Bad Gateway
    expect(isRetryableStatus(503)).toBe(true) // Service Unavailable
    expect(isRetryableStatus(504)).toBe(true) // Gateway Timeout
  })

  it('should return false for non-retryable status codes', () => {
    expect(isRetryableStatus(200)).toBe(false)
    expect(isRetryableStatus(400)).toBe(false)
    expect(isRetryableStatus(401)).toBe(false)
    expect(isRetryableStatus(403)).toBe(false)
    expect(isRetryableStatus(404)).toBe(false)
  })
})

describe('withRetry', () => {
  it('should return result on success', async () => {
    const fn = mock(() => Promise.resolve('success'))

    const result = await withRetry(fn, { maxRetries: 3 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on retryable errors', async () => {
    let attempts = 0
    const fn = mock(() => {
      attempts++
      if (attempts < 3) {
        return Promise.reject(new LuziaError('Network error', { code: 'network' }))
      }
      return Promise.resolve('success')
    })

    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 1, jitter: false })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw immediately on non-retryable errors', async () => {
    const fn = mock(() =>
      Promise.reject(new LuziaError('Unauthorized', { status: 401, code: 'auth' }))
    )

    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow(LuziaError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should throw after max retries exhausted', async () => {
    const fn = mock(() => Promise.reject(new LuziaError('Network error', { code: 'network' })))

    await expect(
      withRetry(fn, { maxRetries: 2, initialDelayMs: 1, jitter: false })
    ).rejects.toThrow(LuziaError)
    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('should call onRetry callback', async () => {
    let attempts = 0
    const fn = mock(() => {
      attempts++
      if (attempts < 2) {
        return Promise.reject(new LuziaError('Network error', { code: 'network' }))
      }
      return Promise.resolve('success')
    })

    const onRetry = mock(() => {})

    await withRetry(fn, { maxRetries: 3, initialDelayMs: 1, jitter: false }, onRetry)

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith({
      attempt: 0,
      maxRetries: 3,
      error: expect.any(LuziaError),
    })
  })
})
