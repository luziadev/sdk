/**
 * Auto-generated TypeScript types from the Luzia OpenAPI specification.
 * DO NOT EDIT MANUALLY - regenerate with: bun run generate
 *
 * Generated at: 2026-02-02T18:42:34.250Z
 */

export type paths = {
  '/v1/exchanges': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * List supported exchanges
     * @description Returns a list of all enabled exchanges supported by Luzia. Requires authentication.
     */
    get: operations['getExchanges']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  [path: `/v1/markets/${string}`]: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * List markets for exchange
     * @description Returns all trading pairs available on a specific exchange. Supports filtering by base/quote currency and pagination.
     */
    get: operations['getMarketsByExchange']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  [path: `/v1/ticker/${string}/${string}`]: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get ticker for symbol
     * @description Returns the current price data for a specific trading pair on an exchange.
     */
    get: operations['getTicker']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  '/v1/tickers': {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get multiple tickers
     * @description Returns price data for multiple symbols across exchanges. Supports filtering by exchange and specific symbols. Results are paginated with a default limit of 20 tickers per response.
     */
    get: operations['getTickers']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
  [path: `/v1/tickers/${string}`]: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    /**
     * Get all tickers for exchange
     * @description Returns price data for all enabled markets on a specific exchange. Results are paginated with a default limit of 20 tickers per response.
     */
    get: operations['getTickersByExchange']
    put?: never
    post?: never
    delete?: never
    options?: never
    head?: never
    patch?: never
    trace?: never
  }
}
export type webhooks = Record<string, never>
export type components = {
  schemas: {
    /** @description Standard error response format */
    Error: {
      /** @description Machine-readable error code (e.g., "UNAUTHORIZED", "NOT_FOUND") */
      code?: string
      /** @description Unique request identifier for debugging */
      correlationId?: string
      /** @description Additional error details */
      details?: {
        [key: string]: unknown
      }
      /** @description HTTP status text (e.g., "Not Found", "Unauthorized") */
      error: string
      /** @description Human-readable error description */
      message: string
    }
    /** @description Exchange information */
    Exchange: {
      /**
       * @description Unique exchange identifier
       * @example binance
       */
      id?: string
      /**
       * @description Display name of the exchange
       * @example Binance
       */
      name?: string
      /**
       * @description Current operational status
       * @example operational
       * @enum {string}
       */
      status?: 'operational' | 'degraded' | 'down' | 'maintenance'
      /**
       * Format: uri
       * @description Exchange website URL
       * @example https://binance.com
       */
      websiteUrl?: string | null
    }
    ExchangeListResponse: {
      exchanges?: components['schemas']['Exchange'][]
    }
    /** @description Trading pair information */
    Market: {
      /**
       * @description Whether the market is currently active
       * @example true
       */
      active: boolean
      /**
       * @description Base currency
       * @example BTC
       */
      base: string
      /**
       * @description Exchange-specific base currency identifier
       * @example BTC
       */
      baseId: string
      /**
       * @description Exchange identifier
       * @example binance
       */
      exchange: string
      /** @description Trading limits */
      limits: {
        amount?: {
          max?: number
          min?: number
        }
        price?: {
          max?: number
          min?: number
        }
      }
      /** @description Decimal precision for price and amount */
      precision: {
        /** @example 8 */
        amount?: number
        /** @example 2 */
        price?: number
      }
      /**
       * @description Quote currency
       * @example USDT
       */
      quote: string
      /**
       * @description Exchange-specific quote currency identifier
       * @example USDT
       */
      quoteId: string
      /**
       * @description Normalized trading pair symbol
       * @example BTC/USDT
       */
      symbol: string
    }
    MarketListResponse: {
      /** @description Maximum results per page */
      limit?: number
      markets?: components['schemas']['Market'][]
      /** @description Number of results skipped */
      offset?: number
      /** @description Total number of markets matching filters */
      total?: number
    }
    /** @description Real-time price data for a trading pair */
    Ticker: {
      /**
       * Format: double
       * @description Best ask price
       * @example 43251
       */
      ask?: number | null
      /**
       * Format: double
       * @description Best bid price
       * @example 43250
       */
      bid?: number | null
      /**
       * Format: double
       * @description 24-hour absolute price change
       * @example 750.5
       */
      change?: number | null
      /**
       * Format: double
       * @description 24-hour percentage price change
       * @example 1.76
       */
      changePercent?: number | null
      /**
       * Format: double
       * @description 24-hour close price
       * @example 43250.5
       */
      close?: number | null
      /**
       * @description Exchange identifier
       * @example binance
       */
      exchange: string
      /**
       * Format: double
       * @description 24-hour high price
       * @example 44000
       */
      high?: number | null
      /**
       * Format: double
       * @description Last traded price
       * @example 43250.5
       */
      last?: number | null
      /**
       * Format: double
       * @description 24-hour low price
       * @example 42000
       */
      low?: number | null
      /**
       * Format: double
       * @description 24-hour open price
       * @example 42500
       */
      open?: number | null
      /**
       * Format: double
       * @description 24-hour trading volume in quote currency
       * @example 534123456.78
       */
      quoteVolume?: number | null
      /**
       * @description Normalized trading pair symbol
       * @example BTC/USDT
       */
      symbol: string
      /**
       * Format: int64
       * @description Unix timestamp in milliseconds
       * @example 1704067200000
       */
      timestamp?: number
      /**
       * Format: double
       * @description 24-hour trading volume in base currency
       * @example 12345.678
       */
      volume?: number | null
    }
    TickerListResponse: {
      /** @description Maximum results per page */
      limit?: number
      /** @description Number of results skipped */
      offset?: number
      tickers?: components['schemas']['Ticker'][]
      /** @description Total number of tickers matching filters */
      total?: number
    }
  }
  responses: {
    /** @description Invalid request parameters */
    BadRequest: {
      headers: {
        'X-RateLimit-Limit': components['headers']['X-RateLimit-Limit']
        'X-RateLimit-Remaining': components['headers']['X-RateLimit-Remaining']
        'X-RateLimit-Reset': components['headers']['X-RateLimit-Reset']
        [name: string]: unknown
      }
      content: {
        /**
         * @example {
         *       "error": "Bad Request",
         *       "message": "Query parameter 'active' must be 'true' or 'false'"
         *     }
         */
        'application/json': components['schemas']['Error']
      }
    }
    /** @description Internal server error */
    InternalServerError: {
      headers: {
        'X-RateLimit-Limit': components['headers']['X-RateLimit-Limit']
        'X-RateLimit-Remaining': components['headers']['X-RateLimit-Remaining']
        'X-RateLimit-Reset': components['headers']['X-RateLimit-Reset']
        [name: string]: unknown
      }
      content: {
        /**
         * @example {
         *       "error": "Internal Server Error",
         *       "message": "An unexpected error occurred"
         *     }
         */
        'application/json': components['schemas']['Error']
      }
    }
    /** @description Resource not found */
    NotFound: {
      headers: {
        'X-RateLimit-Limit': components['headers']['X-RateLimit-Limit']
        'X-RateLimit-Remaining': components['headers']['X-RateLimit-Remaining']
        'X-RateLimit-Reset': components['headers']['X-RateLimit-Reset']
        [name: string]: unknown
      }
      content: {
        /**
         * @example {
         *       "error": "Not Found",
         *       "message": "Exchange 'invalid' not found"
         *     }
         */
        'application/json': components['schemas']['Error']
      }
    }
    /** @description Rate limit exceeded */
    RateLimited: {
      headers: {
        /** @description Seconds until retry is allowed */
        'Retry-After'?: number
        'X-RateLimit-Daily-Limit': components['headers']['X-RateLimit-Daily-Limit']
        'X-RateLimit-Daily-Remaining': components['headers']['X-RateLimit-Daily-Remaining']
        'X-RateLimit-Daily-Reset': components['headers']['X-RateLimit-Daily-Reset']
        'X-RateLimit-Limit': components['headers']['X-RateLimit-Limit']
        'X-RateLimit-Remaining': components['headers']['X-RateLimit-Remaining']
        'X-RateLimit-Reset': components['headers']['X-RateLimit-Reset']
        [name: string]: unknown
      }
      content: {
        /**
         * @example {
         *       "error": "Too Many Requests",
         *       "message": "Rate limit exceeded. Please retry after the reset time.",
         *       "type": "minute",
         *       "limit": 100,
         *       "resetAt": 1704067260
         *     }
         */
        'application/json': components['schemas']['Error']
      }
    }
    /** @description Exchange is temporarily unavailable (disabled) */
    ServiceUnavailable: {
      headers: {
        'X-RateLimit-Limit': components['headers']['X-RateLimit-Limit']
        'X-RateLimit-Remaining': components['headers']['X-RateLimit-Remaining']
        'X-RateLimit-Reset': components['headers']['X-RateLimit-Reset']
        [name: string]: unknown
      }
      content: {
        /**
         * @example {
         *       "error": "Service Unavailable",
         *       "message": "Exchange 'binance' is currently unavailable"
         *     }
         */
        'application/json': components['schemas']['Error']
      }
    }
    /** @description Missing or invalid API key */
    Unauthorized: {
      headers: {
        [name: string]: unknown
      }
      content: {
        /**
         * @example {
         *       "error": "Unauthorized",
         *       "message": "Authentication required"
         *     }
         */
        'application/json': components['schemas']['Error']
      }
    }
  }
  parameters: {
    /** @description Filter by active status */
    ActiveFilter: boolean
    /**
     * @description Filter by base currency
     * @example BTC
     */
    BaseFilter: string
    /**
     * @description Exchange identifier (lowercase)
     * @example binance
     */
    ExchangeId: 'binance' | 'bybit' | 'coinbase' | 'kraken' | 'okx'
    /** @description Maximum number of results (default 100, max 200) */
    Limit: number
    /** @description Number of results to skip */
    Offset: number
    /**
     * @description Filter by quote currency
     * @example USDT
     */
    QuoteFilter: string
    /**
     * @description Trading pair symbol (use dash instead of slash)
     * @example BTC-USDT
     */
    Symbol: string
    /** @description Maximum number of tickers to return (default 20, max 50) */
    TickerLimit: number
  }
  requestBodies: never
  headers: {
    /** @description Maximum requests per day (Free tier only) */
    'X-RateLimit-Daily-Limit': number
    /** @description Requests remaining today (Free tier only) */
    'X-RateLimit-Daily-Remaining': number
    /** @description Unix timestamp for midnight UTC (Free tier only) */
    'X-RateLimit-Daily-Reset': number
    /** @description Maximum requests per minute for the current tier */
    'X-RateLimit-Limit': number
    /** @description Requests remaining in the current minute window */
    'X-RateLimit-Remaining': number
    /** @description Unix timestamp when the minute window resets */
    'X-RateLimit-Reset': number
  }
  pathItems: never
}
export type $defs = Record<string, never>
export interface operations {
  getExchanges: {
    parameters: {
      query?: never
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description List of exchanges */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          /**
           * @example {
           *       "exchanges": [
           *         {
           *           "id": "binance",
           *           "name": "Binance",
           *           "status": "operational",
           *           "websiteUrl": "https://binance.com"
           *         },
           *         {
           *           "id": "bybit",
           *           "name": "Bybit",
           *           "status": "operational",
           *           "websiteUrl": "https://bybit.com"
           *         },
           *         {
           *           "id": "coinbase",
           *           "name": "Coinbase",
           *           "status": "operational",
           *           "websiteUrl": "https://coinbase.com"
           *         }
           *       ]
           *     }
           */
          'application/json': components['schemas']['ExchangeListResponse']
        }
      }
      500: components['responses']['InternalServerError']
    }
  }
  getMarketsByExchange: {
    parameters: {
      query?: {
        /** @description Filter by active status */
        active?: components['parameters']['ActiveFilter']
        /**
         * @description Filter by base currency
         * @example BTC
         */
        base?: components['parameters']['BaseFilter']
        /** @description Maximum number of results (default 100, max 200) */
        limit?: components['parameters']['Limit']
        /** @description Number of results to skip */
        offset?: components['parameters']['Offset']
        /**
         * @description Filter by quote currency
         * @example USDT
         */
        quote?: components['parameters']['QuoteFilter']
      }
      header?: never
      path: {
        /**
         * @description Exchange identifier (lowercase)
         * @example binance
         */
        exchange: components['parameters']['ExchangeId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description List of markets */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['MarketListResponse']
        }
      }
      400: components['responses']['BadRequest']
      401: components['responses']['Unauthorized']
      404: components['responses']['NotFound']
      429: components['responses']['RateLimited']
      500: components['responses']['InternalServerError']
      503: components['responses']['ServiceUnavailable']
    }
  }
  getTicker: {
    parameters: {
      query?: never
      header?: never
      path: {
        /**
         * @description Exchange identifier (lowercase)
         * @example binance
         */
        exchange: components['parameters']['ExchangeId']
        /**
         * @description Trading pair symbol (use dash instead of slash)
         * @example BTC-USDT
         */
        symbol: components['parameters']['Symbol']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description Ticker data */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['Ticker']
        }
      }
      401: components['responses']['Unauthorized']
      404: components['responses']['NotFound']
      429: components['responses']['RateLimited']
      500: components['responses']['InternalServerError']
      503: components['responses']['ServiceUnavailable']
    }
  }
  getTickers: {
    parameters: {
      query?: {
        /**
         * @description Filter by exchange ID
         * @example binance
         */
        exchange?: string
        /** @description Maximum number of tickers to return (default 20, max 50) */
        limit?: components['parameters']['TickerLimit']
        /** @description Number of results to skip */
        offset?: components['parameters']['Offset']
        /**
         * @description Comma-separated list of symbols in URL format (use dash instead of slash)
         * @example BTC-USDT,ETH-USDT,SOL-USDT
         */
        symbols?: string
      }
      header?: never
      path?: never
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description List of tickers */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['TickerListResponse']
        }
      }
      401: components['responses']['Unauthorized']
      429: components['responses']['RateLimited']
      500: components['responses']['InternalServerError']
      503: components['responses']['ServiceUnavailable']
    }
  }
  getTickersByExchange: {
    parameters: {
      query?: {
        /** @description Maximum number of tickers to return (default 20, max 50) */
        limit?: components['parameters']['TickerLimit']
        /** @description Number of results to skip */
        offset?: components['parameters']['Offset']
      }
      header?: never
      path: {
        /**
         * @description Exchange identifier (lowercase)
         * @example binance
         */
        exchange: components['parameters']['ExchangeId']
      }
      cookie?: never
    }
    requestBody?: never
    responses: {
      /** @description List of tickers */
      200: {
        headers: {
          [name: string]: unknown
        }
        content: {
          'application/json': components['schemas']['TickerListResponse']
        }
      }
      401: components['responses']['Unauthorized']
      404: components['responses']['NotFound']
      429: components['responses']['RateLimited']
      500: components['responses']['InternalServerError']
      503: components['responses']['ServiceUnavailable']
    }
  }
}
