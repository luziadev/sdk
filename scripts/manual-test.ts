#!/usr/bin/env bun
/**
 * Manual test script for the Luzia SDK.
 *
 * Usage:
 *   1. Start the API server: bun dev:api
 *   2. Run this script: bun run scripts/manual-test.ts
 *
 * You can also pass an API key as an argument:
 *   bun run scripts/manual-test.ts lz_your_api_key
 */

/* biome-ignore-all lint/suspicious/noConsole: This is a CLI test script */

import { Luzia, LuziaError } from '../src/index.ts'

// Get API key from command line or use a test key
const apiKey = process.argv[2] || 'lz_test_key_replace_me'
const baseUrl = process.env.API_URL || 'http://localhost:50050'

console.log('='.repeat(60))
console.log('Luzia SDK Manual Test')
console.log('='.repeat(60))
console.log(`Base URL: ${baseUrl}`)
console.log(`API Key: ${apiKey.slice(0, 10)}...`)
console.log()

const luzia = new Luzia({
  apiKey,
  baseUrl,
  timeout: 10000,
  retry: { maxRetries: 2 },
})

async function testExchanges() {
  console.log('--- Testing Exchanges ---')
  try {
    const exchanges = await luzia.exchanges.list()
    console.log(`Found ${exchanges.length} exchanges:`)
    for (const exchange of exchanges) {
      console.log(`  - ${exchange.name} (${exchange.id}): ${exchange.status}`)
    }
    console.log()
    return exchanges
  } catch (error) {
    console.error('Failed to list exchanges:', error)
    return []
  }
}

async function testTickers(exchange: string) {
  console.log(`--- Testing Tickers for ${exchange} ---`)
  try {
    // Get a single ticker
    const ticker = await luzia.tickers.get(exchange, 'BTC/USDT')
    console.log(`BTC/USDT ticker:`)
    console.log(`  Last: $${ticker.last}`)
    console.log(`  Bid/Ask: $${ticker.bid} / $${ticker.ask}`)
    console.log(`  24h High/Low: $${ticker.high} / $${ticker.low}`)
    console.log(`  Volume: ${ticker.volume}`)
    console.log()

    // List tickers
    const response = await luzia.tickers.list(exchange, { limit: 5 })
    const tickers = response.tickers ?? []
    const total = response.total ?? 0
    console.log(`Listed ${tickers.length} of ${total} tickers:`)
    for (const t of tickers) {
      console.log(`  - ${t.symbol}: $${t.last}`)
    }
    console.log()

    // Show rate limit info
    if (luzia.rateLimitInfo) {
      console.log('Rate limit info:')
      console.log(`  Remaining: ${luzia.rateLimitInfo.remaining}/${luzia.rateLimitInfo.limit}`)
      if (luzia.rateLimitInfo.dailyLimit) {
        console.log(
          `  Daily: ${luzia.rateLimitInfo.dailyRemaining}/${luzia.rateLimitInfo.dailyLimit}`
        )
      }
      console.log()
    }
  } catch (error) {
    if (error instanceof LuziaError && error.code === 'not_found') {
      console.log(`Ticker not found (this is expected if no data yet)`)
    } else {
      console.error('Failed to get tickers:', error)
    }
  }
}

async function testMarkets(exchange: string) {
  console.log(`--- Testing Markets for ${exchange} ---`)
  try {
    const response = await luzia.markets.list(exchange, {
      quote: 'USDT',
      limit: 5,
    })
    const markets = response.markets ?? []
    const total = response.total ?? 0
    console.log(`Found ${total} USDT markets, showing ${markets.length}:`)
    for (const market of markets) {
      console.log(
        `  - ${market.symbol} (${market.base}/${market.quote}) - active: ${market.active}`
      )
    }
    console.log()
  } catch (error) {
    console.error('Failed to list markets:', error)
  }
}

async function testErrorHandling() {
  console.log('--- Testing Error Handling ---')

  // Test not found error
  try {
    await luzia.tickers.get('invalid_exchange', 'BTC/USDT')
  } catch (error) {
    if (error instanceof LuziaError && error.code === 'not_found') {
      console.log('✓ Not found error caught correctly (code: not_found)')
    } else if (error instanceof LuziaError) {
      console.log(`✓ LuziaError caught (code: ${error.code}, status: ${error.status})`)
    } else {
      console.log('✗ Expected LuziaError, got:', error)
    }
  }

  console.log()
}

async function main() {
  // Test exchanges
  const exchanges = await testExchanges()

  if (exchanges.length > 0) {
    const exchangeId = exchanges[0].id
    if (exchangeId) {
      // Test tickers
      await testTickers(exchangeId)

      // Test markets
      await testMarkets(exchangeId)
    }
  }

  // Test error handling
  await testErrorHandling()

  console.log('='.repeat(60))
  console.log('Manual test complete!')
  console.log('='.repeat(60))
}

main().catch(console.error)
