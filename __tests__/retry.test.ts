/**
 * __tests__/retry.test.ts
 *
 * Unit tests for lib/retry.ts
 *
 * We use fake timers so that exponential back-off sleeps complete instantly
 * in the test suite — no actual wall-clock waiting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry, AbortError } from "../lib/retry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates an async function that fails the first `n` calls then succeeds. */
function failNTimes(n: number, resolveValue = "ok"): () => Promise<string> {
  let calls = 0;
  return async () => {
    calls++;
    if (calls <= n) throw new Error(`Intentional failure #${calls}`);
    return resolveValue;
  };
}

/** Creates an async function that always throws with a given error. */
function alwaysThrows(err: Error): () => Promise<never> {
  return async () => { throw err; };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Successful paths ───────────────────────────────────────────────────────

  it("resolves immediately when fn succeeds on the first attempt", async () => {
    const fn = vi.fn(async () => "success");
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resolves after a single retry when fn fails once then succeeds", async () => {
    const fn = failNTimes(1, "recovered");
    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    // Advance timers past the jittered delay (max 100 ms for attempt 0).
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(result).toBe("recovered");
  });

  it("resolves after two retries when fn fails twice then succeeds", async () => {
    const fn = failNTimes(2, "eventual");
    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    // Advance through both back-off windows (max 100 ms + max 200 ms).
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result).toBe("eventual");
  });

  // ── Exhausted retries ──────────────────────────────────────────────────────

  it("throws after all attempts are exhausted", async () => {
    const fn = alwaysThrows(new Error("persistent failure"));
    // Consume rejection immediately alongside timer advancement so the
    // intermediate rejections are never unhandled.
    await expect(
      Promise.all([
        withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 }),
        vi.advanceTimersByTimeAsync(10_000),
      ])
    ).rejects.toThrow("persistent failure");
  });

  it("calls fn exactly maxAttempts times when all attempts fail", async () => {
    const spy = vi.fn(async () => { throw new Error("fail"); });
    await expect(
      Promise.all([
        withRetry(spy, { maxAttempts: 4, baseDelayMs: 10 }),
        vi.advanceTimersByTimeAsync(10_000),
      ])
    ).rejects.toThrow();
    expect(spy).toHaveBeenCalledTimes(4);
  });

  // ── retryOn predicate ──────────────────────────────────────────────────────

  it("propagates immediately when retryOn returns false", async () => {
    const permErr = new Error("permanent");
    const spy = vi.fn(async () => { throw permErr; });
    const retryOn = vi.fn(() => false);
    // No timers needed — propagation is synchronous (no sleep).
    await expect(
      withRetry(spy, { maxAttempts: 5, retryOn })
    ).rejects.toThrow("permanent");
    // fn called once; retryOn called once; no retry.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(retryOn).toHaveBeenCalledTimes(1);
  });

  it("retries when retryOn returns true", async () => {
    const fn = failNTimes(1);
    const retryOn = vi.fn(() => true);
    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, retryOn });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result).toBe("ok");
    expect(retryOn).toHaveBeenCalled();
  });

  // ── onRetry callback ───────────────────────────────────────────────────────

  it("calls onRetry with the error, attempt number, and a positive delay", async () => {
    const onRetry = vi.fn();
    const fn = failNTimes(2);
    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100, onRetry });
    await vi.advanceTimersByTimeAsync(5000);
    await promise;
    expect(onRetry).toHaveBeenCalledTimes(2);
    const [err, attempt, delay] = onRetry.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(attempt).toBe(1);
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  // ── maxAttempts validation ─────────────────────────────────────────────────

  it("throws RangeError when maxAttempts < 1", async () => {
    await expect(
      withRetry(async () => "x", { maxAttempts: 0 })
    ).rejects.toThrow(RangeError);
  });

  // ── AbortSignal ────────────────────────────────────────────────────────────

  it("throws AbortError when signal is already aborted before first attempt", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      withRetry(async () => "x", { signal: controller.signal })
    ).rejects.toBeInstanceOf(AbortError);
  });

  it("throws AbortError when signal fires during sleep between retries", async () => {
    const controller = new AbortController();
    const fn = alwaysThrows(new Error("transient"));

    // Start the retry loop.
    const retryPromise = withRetry(fn, {
      maxAttempts: 5,
      baseDelayMs: 5_000,
      signal: controller.signal,
    });

    // Abort + consume the rejection atomically via Promise.all so the
    // AbortError is never seen as an unhandled rejection by Vitest.
    await expect(
      Promise.all([
        // Abort mid-sleep after a tick.
        (async () => {
          await vi.advanceTimersByTimeAsync(10);
          controller.abort();
          await vi.advanceTimersByTimeAsync(10_000);
        })(),
        retryPromise,
      ])
    ).rejects.toBeInstanceOf(AbortError);
  });
});
