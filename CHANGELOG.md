# Changelog

All notable changes to `@luziadev/sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-02-18

### Changed

- **Breaking:** All timestamps now use RFC 3339 strings instead of Unix milliseconds (`number` → `string`)
  - `OHLCVCandle.timestamp`, `OHLCVResponse.start`, `OHLCVResponse.end`
  - `Ticker.timestamp`
  - WebSocket types: `WSTickerData.timestamp`, `WSPongData.timestamp`
- Removed `4h` candle interval from `CandleInterval` type
- Regenerated types from latest OpenAPI specification
- Updated README examples to reflect string timestamps

## [1.1.0] - 2026-02-17

### Added

- **History resource:** `luzia.history.get(exchange, symbol, options?)` - Fetch historical OHLCV candlestick data
  - Supports intervals: `1m`, `5m`, `15m`, `1h`, `1d`
  - Configurable time range with `start`/`end` timestamps (Unix ms)
  - Configurable `limit` for number of candles returned
  - Tier-based lookback limits (Free: 30 days, Pro: 90 days, Enterprise: unlimited)
- New types: `OHLCVCandle`, `OHLCVResponse`, `CandleInterval`, `GetHistoryOptions`
- Exported `HistoryResource` class

### Changed

- Updated repository URL to `github.com/luziadev/sdk`
- Regenerated types from latest OpenAPI specification

## [0.1.0] - 2026-01-26

### Added

- Initial release of `@luziadev/sdk`
- `Luzia` client class with configurable options (apiKey, baseUrl, timeout, retry)
- **Resources:**
  - `luzia.exchanges.list()` - List all supported exchanges
  - `luzia.tickers.get(exchange, symbol)` - Get single ticker
  - `luzia.tickers.list(exchange, options?)` - List tickers for exchange
  - `luzia.tickers.listFiltered(options?)` - List tickers with filters
  - `luzia.markets.list(exchange, options?)` - List markets for exchange
- **Error handling:**
  - Single `LuziaError` class with `code` discriminator
  - Error codes: `auth`, `not_found`, `validation`, `rate_limit`, `timeout`, `network`, `server`, `unknown`
  - Helper functions: `isLuziaError()`, `isRetryableError()`
- **Retry logic:**
  - Exponential backoff with jitter
  - Configurable max retries, delays, and backoff multiplier
  - Respects `Retry-After` header for rate limit errors
  - `withRetry()` utility for custom retry handling
- **Rate limit tracking:**
  - `luzia.rateLimitInfo` exposes limit/remaining/reset from last request
  - Supports daily limits for Free tier
- **Type safety:**
  - Types auto-generated from OpenAPI specification
  - Full TypeScript support with strict mode
- **Zero runtime dependencies**
- **Small bundle size:** ~6.6 KB minified, ~2.5 KB gzipped
