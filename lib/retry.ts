/**
 * lib/retry.ts
 *
 * Production-grade exponential backoff retry utility with full jitter.
 *
 * Design goals:
 *  - Generic: wraps any async function, not tied to LLM concerns.
 *  - Jittered: uses "full jitter" (random in [0, cap]) to prevent thundering herd.
 *  - Abort-aware: honours an optional AbortSignal so long-running retries
 *    can be cancelled by the caller (e.g. client disconnects).
 *  - Typed: exposes a strongly-typed `RetryOptions` — no `any` defaults.
 *  - Observable: optional `onRetry` hook so callers can log / instrument.
 *
 * Usage:
 *   import { withRetry } from '@/lib/retry';
 *
 *   const result = await withRetry(
 *     () => fetchFromProvider(params),
 *     {
 *       maxAttempts: 3,
 *       baseDelayMs: 1000,
 *       maxDelayMs: 8000,
 *       retryOn: (err) => err instanceof LlmError && err.code === 'RATE_LIMIT',
 *     }
 *   );
 */

export interface RetryOptions {
  /**
   * Maximum number of attempts (including the first call).
   * Must be ≥ 1. A value of 1 means "no retries — fail on first error".
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Base delay in milliseconds for the first retry.
   * Subsequent retries use exponential backoff: baseDelayMs * 2^(attempt-1),
   * capped at maxDelayMs, then jittered.
   * @default 1000
   */
  baseDelayMs?: number;

  /**
   * Maximum delay cap in milliseconds before jitter is applied.
   * Prevents unbounded wait times on long retry chains.
   * @default 16000
   */
  maxDelayMs?: number;

  /**
   * Predicate that receives the thrown error and returns `true` if the
   * operation should be retried. Return `false` to propagate immediately.
   *
   * If omitted, ALL errors are retried up to maxAttempts.
   */
  retryOn?: (err: unknown, attempt: number) => boolean;

  /**
   * Optional callback fired before each retry sleep.
   * Useful for structured logging, metrics, or UI state updates.
   */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;

  /**
   * Optional AbortSignal. If it fires during a sleep, the retry loop
   * will reject with an AbortError immediately.
   */
  signal?: AbortSignal;
}

/** Thrown when the retry loop is cancelled via AbortSignal. */
export class AbortError extends Error {
  constructor() {
    super('Retry cancelled: AbortSignal was aborted.');
    this.name = 'AbortError';
  }
}

/**
 * Sleeps for `ms` milliseconds, aborting early if the provided signal fires.
 * @internal
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError());
      return;
    }

    const timer = setTimeout(resolve, ms);

    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(new AbortError());
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Computes the jittered delay for a given attempt using "full jitter":
 *   delay = random(0, min(maxDelayMs, baseDelayMs * 2^attempt))
 *
 * Full jitter reduces contention when many clients retry simultaneously.
 * See: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param attempt    - Zero-indexed retry attempt number (0 = first retry).
 * @param baseDelayMs - Base delay in ms.
 * @param maxDelayMs  - Upper cap in ms before jitter.
 * @returns Jittered delay in ms.
 * @internal
 */
function computeDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, maxDelayMs);
  return Math.random() * capped; // full jitter: uniform in [0, capped]
}

/**
 * Executes `fn` with automatic retries on failure.
 *
 * @param fn      - Async function to execute and potentially retry.
 * @param options - Retry configuration.
 * @returns The resolved value of `fn` on success.
 * @throws The last error if all attempts are exhausted, or an AbortError
 *         if the signal fires during a sleep interval.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs  = 16_000,
    retryOn,
    onRetry,
    signal,
  } = options;

  if (maxAttempts < 1) {
    throw new RangeError(`[retry] maxAttempts must be ≥ 1, got ${maxAttempts}.`);
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check for cancellation before each attempt
    if (signal?.aborted) throw new AbortError();

    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLastAttempt = attempt === maxAttempts;

      // If the caller says "don't retry this error", propagate immediately.
      if (retryOn && !retryOn(err, attempt)) {
        throw err;
      }

      // No more retries — surface the error.
      if (isLastAttempt) break;

      // Compute jittered back-off delay (attempt is 1-indexed; delay exponent is 0-indexed).
      const delayMs = computeDelay(attempt - 1, baseDelayMs, maxDelayMs);

      onRetry?.(err, attempt, delayMs);

      await sleep(delayMs, signal);
    }
  }

  throw lastError;
}
