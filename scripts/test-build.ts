#!/usr/bin/env bun
/**
 * Integration test for the built SDK package.
 *
 * This script imports from dist/ (the built output) to verify:
 * 1. The build output is valid JavaScript
 * 2. All exports are accessible
 * 3. Types are correctly generated
 *
 * Usage:
 *   1. Build the SDK: bun run build
 *   2. Run this test: bun run scripts/test-build.ts
 */

/* biome-ignore-all lint/suspicious/noConsole: This is a test script */

// Import from the package as consumers would
import {
  calculateRetryDelay,
  type ErrorCode,
  type Exchange,
  ExchangesResource,
  isLuziaError,
  isRetryableError,
  Luzia,
  LuziaError,
  type LuziaOptions,
  type Market,
  MarketsResource,
  type RateLimitInfo,
  type RetryOptions,
  resolveRetryOptions,
  type Ticker,
  TickersResource,
  withRetry,
} from '@luziadev/sdk'

console.log('='.repeat(60))
console.log('SDK Build Integration Test')
console.log('='.repeat(60))
console.log()

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`✓ ${name}`)
    passed++
  } catch (error) {
    console.log(`✗ ${name}`)
    console.log(`  Error: ${error}`)
    failed++
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Test: Luzia class exists and is constructable
test('Luzia class is exported and constructable', () => {
  const luzia = new Luzia({ apiKey: 'lz_test' })
  assert(luzia !== undefined, 'Client should be defined')
  assert(typeof luzia.exchanges === 'object', 'exchanges resource should exist')
  assert(typeof luzia.tickers === 'object', 'tickers resource should exist')
  assert(typeof luzia.markets === 'object', 'markets resource should exist')
})

// Test: Luzia requires API key
test('Luzia throws without API key', () => {
  let threw = false
  try {
    new Luzia({ apiKey: '' })
  } catch (e) {
    threw = true
    assert(e instanceof LuziaError, 'Should throw LuziaError')
  }
  assert(threw, 'Should have thrown')
})

// Test: LuziaError class is exported
test('LuziaError class is exported', () => {
  assert(typeof LuziaError === 'function', 'LuziaError should be a function')

  const error = new LuziaError('test')
  assert(error instanceof Error, 'LuziaError should extend Error')
  assert(error.code === 'unknown', 'Default code should be unknown')
})

// Test: Error codes work correctly
test('Error codes work correctly', () => {
  const authError = new LuziaError('Unauthorized', { status: 401, code: 'auth' })
  assert(authError.code === 'auth', 'Code should be auth')
  assert(authError.status === 401, 'Status should be 401')

  const rateLimitError = new LuziaError('Rate limited', {
    status: 429,
    code: 'rate_limit',
    retryAfter: 60,
  })
  assert(rateLimitError.code === 'rate_limit', 'Code should be rate_limit')
  assert(rateLimitError.retryAfter === 60, 'retryAfter should be 60')

  const networkError = new LuziaError('Network error', { code: 'network' })
  assert(networkError.code === 'network', 'Code should be network')

  const timeoutError = new LuziaError('Timeout', { code: 'timeout', timeoutMs: 30000 })
  assert(timeoutError.code === 'timeout', 'Code should be timeout')
  assert(timeoutError.timeoutMs === 30000, 'timeoutMs should be 30000')
})

// Test: Utility functions are exported
test('Utility functions are exported', () => {
  assert(typeof isLuziaError === 'function', 'isLuziaError should be a function')
  assert(typeof isRetryableError === 'function', 'isRetryableError should be a function')
  assert(typeof withRetry === 'function', 'withRetry should be a function')
  assert(typeof calculateRetryDelay === 'function', 'calculateRetryDelay should be a function')
  assert(typeof resolveRetryOptions === 'function', 'resolveRetryOptions should be a function')
})

// Test: Resource classes are exported
test('Resource classes are exported', () => {
  assert(typeof ExchangesResource === 'function', 'ExchangesResource should be a function')
  assert(typeof MarketsResource === 'function', 'MarketsResource should be a function')
  assert(typeof TickersResource === 'function', 'TickersResource should be a function')
})

// Test: isLuziaError works correctly
test('isLuziaError identifies Luzia errors', () => {
  const luziaError = new LuziaError('test')
  const regularError = new Error('test')

  assert(isLuziaError(luziaError) === true, 'Should identify LuziaError')
  assert(isLuziaError(regularError) === false, 'Should not identify regular Error')
})

// Test: isRetryableError works correctly
test('isRetryableError identifies retryable errors', () => {
  const networkError = new LuziaError('test', { code: 'network' })
  const timeoutError = new LuziaError('test', { code: 'timeout' })
  const authError = new LuziaError('test', { code: 'auth' })

  assert(isRetryableError(networkError) === true, 'Network error should be retryable')
  assert(isRetryableError(timeoutError) === true, 'Timeout error should be retryable')
  assert(isRetryableError(authError) === false, 'Auth error should not be retryable')
})

// Test: resolveRetryOptions provides defaults
test('resolveRetryOptions provides defaults', () => {
  const options = resolveRetryOptions({})
  assert(options.maxRetries === 3, 'Default maxRetries should be 3')
  assert(options.initialDelayMs === 1000, 'Default initialDelayMs should be 1000')
  assert(options.maxDelayMs === 30000, 'Default maxDelayMs should be 30000')
})

// Test: Type definitions compile (this is a compile-time check)
test('Type definitions are valid', () => {
  // These type annotations verify the types are exported correctly
  const options: LuziaOptions = { apiKey: 'lz_test' }
  const exchange: Partial<Exchange> = { id: 'binance', name: 'Binance' }
  const ticker: Partial<Ticker> = { symbol: 'BTC/USDT', exchange: 'binance' }
  const market: Partial<Market> = { symbol: 'BTC/USDT', exchange: 'binance' }
  const rateLimitInfo: RateLimitInfo = { limit: 100, remaining: 99, reset: 123456 }
  const retryOptions: RetryOptions = { maxRetries: 5 }
  const errorCode: ErrorCode = 'auth'

  assert(options.apiKey === 'lz_test', 'Options type should work')
  assert(exchange.id === 'binance', 'Exchange type should work')
  assert(ticker.symbol === 'BTC/USDT', 'Ticker type should work')
  assert(market.symbol === 'BTC/USDT', 'Market type should work')
  assert(rateLimitInfo.limit === 100, 'RateLimitInfo type should work')
  assert(retryOptions.maxRetries === 5, 'RetryOptions type should work')
  assert(errorCode === 'auth', 'ErrorCode type should work')
})

// Test: Client methods exist
test('Client has all expected methods', () => {
  const luzia = new Luzia({ apiKey: 'lz_test' })

  assert(typeof luzia.symbolToUrl === 'function', 'symbolToUrl should exist')
  assert(typeof luzia.symbolFromUrl === 'function', 'symbolFromUrl should exist')
  assert(typeof luzia.request === 'function', 'request should exist')
  assert(luzia.rateLimitInfo === null, 'rateLimitInfo should be null initially')
})

// Test: Symbol conversion
test('Symbol conversion works', () => {
  const luzia = new Luzia({ apiKey: 'lz_test' })

  assert(luzia.symbolToUrl('BTC/USDT') === 'BTC-USDT', 'symbolToUrl should convert / to -')
  assert(luzia.symbolFromUrl('BTC-USDT') === 'BTC/USDT', 'symbolFromUrl should convert - to /')
})

// Summary
console.log()
console.log('='.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log('='.repeat(60))

if (failed > 0) {
  process.exit(1)
}
