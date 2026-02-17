# @luziadev/sdk

Official TypeScript SDK for the Luzia cryptocurrency pricing API.

## Installation

```bash
bun add @luziadev/sdk
# or
npm install @luziadev/sdk
```

## Quick Start

```typescript
import { Luzia } from '@luziadev/sdk'

const luzia = new Luzia({
  apiKey: 'lz_your_api_key',
})

// List all supported exchanges
const exchanges = await luzia.exchanges.list()
console.log(exchanges)
// [{ id: 'binance', name: 'Binance', status: 'operational', ... }]

// Get a single ticker
const ticker = await luzia.tickers.get('binance', 'BTC/USDT')
console.log(`BTC/USDT: $${ticker.last}`)

// Get all tickers for an exchange
const { tickers, total } = await luzia.tickers.list('binance', { limit: 50 })
console.log(`Found ${total} tickers`)

// Get markets with filters
const { markets } = await luzia.markets.list('binance', { quote: 'USDT' })

// Get historical OHLCV candles
const { candles } = await luzia.history.get('binance', 'BTC/USDT', {
  interval: '1h',
  limit: 24,
})
console.log(`Last close: $${candles[candles.length - 1].close}`)
```

## Configuration

```typescript
const luzia = new Luzia({
  // Required: Your API key
  apiKey: 'lz_xxxxx',

  // Optional: Custom base URL (default: https://api.luzia.dev)
  baseUrl: 'http://localhost:3000',

  // Optional: Request timeout in ms (default: 30000)
  timeout: 10000,

  // Optional: Retry configuration
  retry: {
    maxRetries: 3,        // Number of retry attempts (default: 3)
    initialDelayMs: 1000, // Initial delay before first retry (default: 1000)
    maxDelayMs: 30000,    // Maximum delay between retries (default: 30000)
    backoffMultiplier: 2, // Multiplier for exponential backoff (default: 2)
    jitter: true,         // Add random jitter to delays (default: true)
  },
})
```

## API Reference

### Exchanges

```typescript
// List all supported exchanges
const exchanges = await luzia.exchanges.list()
```

### Tickers

```typescript
// Get a single ticker
const ticker = await luzia.tickers.get('binance', 'BTC/USDT')

// List all tickers for an exchange
const { tickers, total, limit, offset } = await luzia.tickers.list('binance', {
  limit: 50,
  offset: 0,
})

// Get specific tickers across exchanges
const { tickers } = await luzia.tickers.listFiltered({
  exchange: 'binance',           // Optional: filter by exchange
  symbols: ['BTC/USDT', 'ETH/USDT'], // Optional: filter by symbols
  limit: 100,
  offset: 0,
})
```

### Markets

```typescript
// List markets for an exchange
const { markets, total } = await luzia.markets.list('binance', {
  base: 'BTC',    // Optional: filter by base currency
  quote: 'USDT',  // Optional: filter by quote currency
  active: true,   // Optional: filter by active status
  limit: 100,
  offset: 0,
})
```

### History (OHLCV Candles)

```typescript
// Get 24h of hourly candles (default)
const { candles, count } = await luzia.history.get('binance', 'BTC/USDT')

// Specify interval and limit
const { candles } = await luzia.history.get('binance', 'ETH/USDT', {
  interval: '15m',  // '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  limit: 96,        // Number of candles (max: 500)
})

// Specify a time range
const { candles } = await luzia.history.get('binance', 'BTC/USDT', {
  interval: '1d',
  start: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago (Unix ms)
  end: Date.now(),
})

// Each candle contains:
for (const candle of candles) {
  console.log({
    timestamp: candle.timestamp, // Candle open time (Unix ms)
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,       // Base currency volume
    quoteVolume: candle.quoteVolume,
    trades: candle.trades,       // Number of trades in interval
  })
}
```

**Lookback limits by tier:**

| Tier | Max Lookback |
|------|-------------|
| Free | 30 days |
| Pro  | 90 days |

## WebSocket (Real-Time Updates)

Stream live ticker updates over WebSocket. Requires a **Pro plan or higher**.

### Quick Start

```typescript
import { Luzia } from '@luziadev/sdk'

const luzia = new Luzia({ apiKey: 'lz_your_api_key' })
const ws = luzia.createWebSocket()

ws.on('connected', (info) => {
  console.log(`Connected (${info.tier}), max subscriptions: ${info.limits.maxSubscriptions}`)
  ws.subscribe(['ticker:binance:BTC/USDT', 'ticker:coinbase:ETH/USDT'])
})

ws.on('ticker', (data) => {
  console.log(`${data.exchange} ${data.symbol}: $${data.data.last}`)
})

ws.on('error', (err) => {
  console.error(`WebSocket error [${err.code}]: ${err.message}`)
})

ws.connect()
```

### Channel Format

- `ticker:{exchange}:{symbol}` — specific pair (e.g., `ticker:binance:BTC/USDT`)
- `ticker:{exchange}` — all tickers from an exchange (e.g., `ticker:binance`)

### Subscribing and Unsubscribing

```typescript
// Subscribe to channels (can be called before or after connect)
ws.subscribe(['ticker:binance:BTC/USDT', 'ticker:kraken:ETH/USDT'])

// Unsubscribe from channels
ws.unsubscribe(['ticker:binance:BTC/USDT'])

// Check active subscriptions
console.log(ws.subscriptions) // ReadonlySet<string>
```

### Connection Options

```typescript
const ws = luzia.createWebSocket({
  autoReconnect: true,        // Auto-reconnect on disconnection (default: true)
  maxReconnectAttempts: 10,   // Max attempts, 0 = infinite (default: 10)
  reconnectDelayMs: 1000,     // Initial reconnect delay (default: 1000ms)
  maxReconnectDelayMs: 30000, // Max reconnect delay (default: 30000ms)
  heartbeatIntervalMs: 30000, // Heartbeat interval, 0 = disabled (default: 30000ms)
})
```

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ tier, limits }` | Connection established, server ready |
| `ticker` | `{ exchange, symbol, data, timestamp }` | Price update received |
| `subscribed` | `{ channel }` | Channel subscription confirmed |
| `unsubscribed` | `{ channel }` | Channel unsubscription confirmed |
| `error` | `{ code, message }` | Error from server or connection |
| `disconnected` | `{ code, reason }` | Connection closed |
| `reconnecting` | `{ attempt, delayMs }` | Reconnect attempt starting |

### Connection State

```typescript
console.log(ws.state) // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
```

### Disconnecting

```typescript
// Gracefully close and disable auto-reconnect
ws.disconnect()
```

### Connection Limits

| Tier | Connections | Subscriptions / Connection |
|------|-------------|----------------------------|
| Free | Not available | — |
| Pro | 5 | 50 |
| Enterprise | 25 | 500 |

## Error Handling

The SDK uses a single `LuziaError` class with a `code` property to distinguish error types:

```typescript
import { Luzia, LuziaError } from '@luziadev/sdk'

try {
  const ticker = await luzia.tickers.get('invalid', 'BTC/USDT')
} catch (error) {
  if (error instanceof LuziaError) {
    switch (error.code) {
      case 'auth':
        console.log('Invalid API key')
        break
      case 'rate_limit':
        console.log(`Rate limited. Retry after ${error.retryAfter} seconds`)
        console.log(`Limit info:`, error.rateLimitInfo)
        break
      case 'not_found':
        console.log('Resource not found')
        break
      case 'validation':
        console.log('Invalid request parameters:', error.details)
        break
      case 'server':
        console.log('Server error (exchange may be temporarily unavailable)')
        break
      case 'network':
        console.log('Network error:', error.message)
        break
      case 'timeout':
        console.log(`Request timed out after ${error.timeoutMs}ms`)
        break
    }
  }
}
```

### Checking Error Types

```typescript
import { isLuziaError, isRetryableError } from '@luziadev/sdk'

if (isLuziaError(error)) {
  console.log(`Luzia error: ${error.message}`)
}

if (isRetryableError(error)) {
  console.log('This error can be retried')
}
```

## Rate Limit Information

Access rate limit information from the most recent request:

```typescript
const ticker = await luzia.tickers.get('binance', 'BTC/USDT')

const info = luzia.rateLimitInfo
if (info) {
  console.log(`Requests remaining: ${info.remaining}/${info.limit}`)
  console.log(`Resets at: ${new Date(info.reset * 1000)}`)

  // Free tier also has daily limits
  if (info.dailyLimit) {
    console.log(`Daily remaining: ${info.dailyRemaining}/${info.dailyLimit}`)
  }
}
```

## Automatic Retries

The SDK automatically retries requests on:
- Rate limit errors (429) - respects `Retry-After` header
- Timeout errors (408)
- Server errors (500, 502, 503, 504)
- Network errors

Non-retryable errors (400, 401, 403, 404) are thrown immediately.

### Custom Retry Handling

```typescript
import { withRetry } from '@luziadev/sdk'

// Use the retry utility directly
const result = await withRetry(
  () => luzia.tickers.get('binance', 'BTC/USDT'),
  { maxRetries: 5 },
  (context) => {
    console.log(`Retry attempt ${context.attempt + 1}/${context.maxRetries}`)
  }
)
```

## Types

All types are exported for use in your application:

```typescript
import type {
  // REST API
  Exchange,
  ExchangeStatus,
  Market,
  Ticker,
  OHLCVCandle,
  OHLCVResponse,
  CandleInterval,
  GetHistoryOptions,
  RateLimitInfo,
  LuziaOptions,
  RetryOptions,
  // WebSocket
  WebSocketOptions,
  WSTickerData,
  WSConnectedData,
  WSErrorData,
  WSEventMap,
  WSConnectionState,
} from '@luziadev/sdk'
```

## Development

```bash
# Install dependencies
bun install

# Generate types from OpenAPI spec
bun run generate

# Type check
bun run typecheck

# Run tests
bun test
```

## Links

- [npm package](https://www.npmjs.com/package/@luziadev/sdk)
- [GitHub repository](https://github.com/luziadev/luzia/tree/main/packages/sdk)
- [REST API documentation](https://luzia.dev/docs)
- [WebSocket API documentation](https://luzia.dev/docs/websocket)
- [Changelog](./CHANGELOG.md)
- [Contributing guide](./CONTRIBUTING.md)

## License

MIT
