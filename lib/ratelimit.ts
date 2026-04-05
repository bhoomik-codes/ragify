/**
 * lib/ratelimit.ts
 * 
 * An in-memory sliding window rate limiter that adheres to the Node.js runtime.
 * Provides an Upstash-compatible interface so we can easily swap it later.
 * 
 * IMPORTANT: This tracks state in-memory and will not persist across Edge worker reboots 
 * or multi-container horizontal scaleouts. Use strictly inside API routes with `runtime = 'nodejs'`.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // seconds to wait if not allowed
}

interface WindowData {
  count: number;
  resetAt: number; // epoch timestamp MS
}

// Global in-memory store
const store = new Map<string, WindowData>();

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowData = store.get(key);

  // If new key or window has passed, reset
  if (!windowData || now >= windowData.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  // If within window and over limit
  if (windowData.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((windowData.resetAt - now) / 1000)
    };
  }

  // Allowed request, increment counts
  windowData.count++;
  return { allowed: true, remaining: limit - windowData.count };
}

// Memory cleanup utility to prevent unbounded Map growth
// Specifically unreferenced so it does not block the Node event loop from terminating
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now >= value.resetAt) {
      store.delete(key);
    }
  }
}, 60 * 1000); // Check map once every minute

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}
