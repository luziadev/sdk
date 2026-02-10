/**
 * Retry logic with exponential backoff for the Luzia SDK.
 *
 * Features:
 * - Exponential backoff with configurable multiplier
 * - Random jitter to prevent thundering herd
 * - Respects Retry-After header for rate limit errors
 * - Configurable max retries and delay bounds
 */

import { isRetryableError, LuziaError } from './errors.ts'
import type { RetryOptions } from './types/index.ts'

/**
 * Default retry configuration.
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
}

/**
 * Small buffer added to rate limit retry delays to ensure the limit has fully reset.
 */
const RATE_LIMIT_BUFFER_MS = 100

/**
 * Resolved retry options with all defaults applied.
 */
export type ResolvedRetryOptions = Required<RetryOptions>

/**
 * Resolve retry options by merging with defaults.
 */
export function resolveRetryOptions(options?: RetryOptions): ResolvedRetryOptions {
  return {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  }
}

/**
 * Calculate the delay for a retry attempt.
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param options - Retry options
 * @param error - The error that triggered the retry (used for rate limit Retry-After)
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(
  attempt: number,
  options: ResolvedRetryOptions,
  error?: LuziaError
): number {
  // If we have a rate limit error, respect the Retry-After header
  if (error?.code === 'rate_limit' && error.retryAfter !== undefined) {
    const retryAfterMs = error.retryAfter * 1000
    return Math.min(retryAfterMs + RATE_LIMIT_BUFFER_MS, options.maxDelayMs)
  }

  // Calculate exponential backoff delay
  let delay = options.initialDelayMs * options.backoffMultiplier ** attempt

  // Apply jitter if enabled (random value between 0.5x and 1.5x)
  if (options.jitter) {
    const jitterFactor = 0.5 + Math.random()
    delay = delay * jitterFactor
  }

  // Clamp to max delay
  return Math.min(delay, options.maxDelayMs)
}

/**
 * Sleep for the specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Context passed to the retry callback.
 */
export interface RetryContext {
  /** Current attempt number (0-indexed) */
  attempt: number
  /** Total number of retries allowed */
  maxRetries: number
  /** The error that caused the retry (if any) */
  error?: unknown
}

/**
 * Callback invoked before each retry attempt.
 */
export type OnRetryCallback = (context: RetryContext) => void

/**
 * Execute a function with automatic retries.
 *
 * @param fn - The async function to execute
 * @param options - Retry options
 * @param onRetry - Optional callback invoked before each retry
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
  onRetry?: OnRetryCallback
): Promise<T> {
  const resolvedOptions = resolveRetryOptions(options)
  let lastError: unknown

  for (let attempt = 0; attempt <= resolvedOptions.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (!isRetryableError(error)) {
        throw error
      }

      // Check if we've exhausted retries
      if (attempt >= resolvedOptions.maxRetries) {
        throw error
      }

      // Calculate delay for next retry
      const luziaError = error instanceof LuziaError ? error : undefined
      const delay = calculateRetryDelay(attempt, resolvedOptions, luziaError)

      // Invoke retry callback if provided
      if (onRetry) {
        onRetry({
          attempt,
          maxRetries: resolvedOptions.maxRetries,
          error,
        })
      }

      // Wait before retrying
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Check if an HTTP status code is retryable.
 */
export function isRetryableStatus(status: number): boolean {
  return (
    status === 408 || // Request Timeout
    status === 429 || // Too Many Requests
    status === 500 || // Internal Server Error
    status === 502 || // Bad Gateway
    status === 503 || // Service Unavailable
    status === 504 // Gateway Timeout
  )
}
