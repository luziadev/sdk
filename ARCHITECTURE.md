# SDK Architecture

This document describes the internal architecture, design decisions, and patterns used in `@luziadev/sdk`.

## Design Goals

1. **Zero runtime dependencies** - Uses only native browser/Node.js APIs (`fetch`, `AbortController`)
2. **Type safety** - Full TypeScript with types generated from OpenAPI spec
3. **Small bundle size** - ~6.6 KB minified, ~2.5 KB gzipped
4. **Predictable error handling** - Typed error classes for every failure mode
5. **Automatic retries** - Exponential backoff with jitter for transient failures

## Package Structure

```
packages/sdk/
├── scripts/
│   ├── generate-types.ts    # OpenAPI → TypeScript generator
│   └── manual-test.ts       # Manual testing script
├── src/
│   ├── index.ts             # Public exports
│   ├── client.ts            # Luzia class
│   ├── errors.ts            # Error classes and factories
│   ├── retry.ts             # Retry logic with exponential backoff
│   ├── types/
│   │   ├── index.ts         # Type re-exports and aliases
│   │   ├── generated.ts     # Auto-generated from OpenAPI
│   │   └── options.ts       # SDK-specific config types
│   ├── resources/
│   │   ├── index.ts         # Resource exports
│   │   ├── exchanges.ts     # ExchangesResource
│   │   ├── markets.ts       # MarketsResource
│   │   └── tickers.ts       # TickersResource
│   └── __tests__/           # Unit tests
├── package.json
├── tsconfig.json
├── README.md                # Usage documentation
└── ARCHITECTURE.md          # This file
```

## Type Generation (Single Source of Truth)

Types are generated from the OpenAPI specification to ensure the SDK stays in sync with the API contract.

### Flow

```
┌─────────────────────┐
│  apps/api/          │
│  openapi.yaml       │  ← Single source of truth
└─────────┬───────────┘
          │
          │  bun run generate
          │  (openapi-typescript)
          ▼
┌─────────────────────┐
│  src/types/         │
│  generated.ts       │  ← Auto-generated types
└─────────┬───────────┘
          │
          │  Re-export with aliases
          ▼
┌─────────────────────┐
│  src/types/         │
│  index.ts           │  ← Developer-friendly exports
└─────────────────────┘
```

### Why This Approach?

1. **Catches breaking changes** - If the API contract changes, TypeScript compilation fails
2. **No type drift** - Types always match what the API actually returns
3. **Single maintenance point** - Update OpenAPI spec, regenerate types

### Regenerating Types

```bash
bun run generate
```

This reads `/apps/api/openapi.yaml` and outputs `src/types/generated.ts`.

### Type Re-exports

`src/types/index.ts` re-exports generated types with friendly names:

```typescript
// Re-export from generated (single source of truth)
export type Exchange = components['schemas']['Exchange']
export type Ticker = components['schemas']['Ticker']

// SDK-specific types (not in OpenAPI)
export type { LuziaOptions, RetryOptions } from './options.ts'
```

## Client Architecture

### Resource Pattern

The SDK uses a resource-based pattern similar to Stripe's SDK:

```typescript
luzia.exchanges.list()
luzia.tickers.get('binance', 'BTC/USDT')
luzia.markets.list('binance', { quote: 'USDT' })
```

Each resource is a class that receives the client instance:

```typescript
class TickersResource {
  constructor(private readonly client: Luzia) {}

  async get(exchange: string, symbol: string): Promise<Ticker> {
    return this.client.request(`/v1/ticker/${exchange}/${symbol}`)
  }
}
```

### Request Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Resource   │ ──▶ │    Client    │ ──▶ │    Retry     │
│   Method     │     │   request()  │     │   withRetry  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌──────────────┐     ┌───────▼───────┐
                     │   Response   │ ◀── │   _doRequest  │
                     │   or Error   │     │   (fetch)     │
                     └──────────────┘     └───────────────┘
```

### Custom Fetch

Users can inject a custom `fetch` implementation for testing or framework integration:

```typescript
const client = new Luzia({
  apiKey: 'lz_xxx',
  fetch: customFetch, // For testing or React Query integration
})
```

## Error Handling

### Single Error Class with Code Discriminator

The SDK uses a single `LuziaError` class with a `code` property to distinguish error types:

```typescript
class LuziaError extends Error {
  readonly status?: number    // HTTP status (e.g., 401, 404, 429)
  readonly code: ErrorCode    // Error category (e.g., 'auth', 'not_found')
  readonly correlationId?: string
  readonly retryAfter?: number  // For rate_limit errors
  readonly details?: Record<string, unknown>  // For validation errors
  readonly timeoutMs?: number   // For timeout errors
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `auth` | Authentication failed | 401 |
| `not_found` | Resource not found | 404 |
| `validation` | Invalid request | 400 |
| `rate_limit` | Rate limit exceeded | 429 |
| `timeout` | Request timed out | - |
| `network` | Connection error | - |
| `server` | Server error | 5xx |
| `unknown` | Unknown error | varies |

### Usage

```typescript
try {
  await luzia.tickers.get('binance', 'BTC/USDT')
} catch (error) {
  if (error instanceof LuziaError) {
    switch (error.code) {
      case 'rate_limit':
        console.log(`Retry after ${error.retryAfter}s`)
        break
      case 'auth':
        console.log('Invalid API key')
        break
      case 'not_found':
        console.log('Resource not found')
        break
    }
  }
}
```

### Retryable vs Non-Retryable

```typescript
// Retryable codes
- 'rate_limit'  // 429
- 'network'     // Connection failures
- 'timeout'     // Request timeouts
- 'server'      // 5xx errors

// Non-retryable codes
- 'auth'        // 401
- 'validation'  // 400
- 'not_found'   // 404
- 'unknown'     // Other errors
```

## Retry Logic

### Exponential Backoff with Jitter

```typescript
function calculateRetryDelay(attempt: number, options: RetryOptions): number {
  // Base delay doubles each attempt: 1s, 2s, 4s, 8s...
  let delay = options.initialDelayMs * options.backoffMultiplier ** attempt

  // Add jitter (±50%) to prevent thundering herd
  if (options.jitter) {
    delay = delay * (0.5 + Math.random())
  }

  // Cap at maximum delay
  return Math.min(delay, options.maxDelayMs)
}
```

### Retry-After Header

For 429 responses, the SDK respects the `Retry-After` header:

```typescript
if (rateLimitError) {
  delay = rateLimitError.retryAfter * 1000 + 100 // Add 100ms buffer
}
```

## Rate Limit Tracking

The client parses rate limit headers and exposes them:

```typescript
// After any request
const info = luzia.rateLimitInfo
// {
//   limit: 100,
//   remaining: 95,
//   reset: 1704067260,
//   dailyLimit: 5000,      // Free tier only
//   dailyRemaining: 4900,  // Free tier only
//   dailyReset: 1704153600 // Free tier only
// }
```

## Bundle Size

The SDK is optimized for minimal bundle size:

| Metric | Size |
|--------|------|
| Minified | ~6.6 KB |
| Gzipped | ~2.5 KB |

### How We Keep It Small

1. **Zero dependencies** - No lodash, axios, etc.
2. **Native APIs only** - fetch, AbortController, setTimeout
3. **Tree-shakeable exports** - Import only what you need
4. **No polyfills** - Requires Node 18+ or modern browsers

## Extending the SDK

### Adding a New Resource

1. Create `src/resources/newresource.ts`:

```typescript
import type { Luzia } from '../client.ts'
import type { NewType } from '../types/index.ts'

export class NewResource {
  constructor(private readonly client: Luzia) {}

  async get(id: string): Promise<NewType> {
    return this.client.request(`/v1/new/${id}`)
  }
}
```

2. Add to client in `src/client.ts`:

```typescript
import { NewResource } from './resources/newresource.ts'

class Luzia {
  readonly newResource: NewResource

  constructor(options: LuziaOptions) {
    this.newResource = new NewResource(this)
  }
}
```

3. Export from `src/resources/index.ts` and `src/index.ts`

### Adding New Types

1. Update `/apps/api/openapi.yaml` with new schema
2. Run `bun run generate` to regenerate types
3. Add re-export in `src/types/index.ts` if needed

## Testing

### Unit Tests

```bash
bun test
```

Tests use mocked fetch to verify:
- Request URL construction
- Header injection
- Error handling
- Retry behavior

### Manual Testing

```bash
# Start API server
bun dev:api

# Run manual test
bun run scripts/manual-test.ts lz_your_api_key
```

## Dependencies

### Runtime Dependencies

**None** - Zero runtime dependencies.

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `openapi-typescript` | Generate types from OpenAPI |
| `typescript` | Type checking |
| `@types/bun` | Bun runtime types |
