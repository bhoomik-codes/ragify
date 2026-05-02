/**
 * lib/embeddings.ts
 *
 * Real embedding engine using Ollama's /api/embed endpoint.
 * Supports Qwen3-Embedding and any other Ollama-hosted embedding model.
 *
 * ⚠ Server-only — never import from a client component.
 */

import "server-only";

import { DEFAULT_EMBEDDING_MODEL } from './models';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// ---------------------------------------------------------------------------
// Availability cache
//
// `isEmbeddingAvailable` is called on EVERY chat and retrieval request.
// Without caching it adds a round-trip to Ollama on each request, even when
// the server has been confirmed reachable seconds ago.
//
// Cache policy:
//  - TTL 30 s for positive results (Ollama is up).
//  - TTL 5 s for negative results (Ollama is down) so we recover quickly.
//
// This is module-level state, shared across all requests on the same Node
// process — exactly what we want for a singleton server.
// ---------------------------------------------------------------------------

interface AvailabilityEntry {
  available: boolean;
  expiresAt: number;
}

const availabilityCache = new Map<string, AvailabilityEntry>();

const AVAILABLE_TTL_MS   = 30_000; //  30 seconds when Ollama is reachable
const UNAVAILABLE_TTL_MS =  5_000; //   5 seconds when Ollama is not reachable

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates an embedding vector for a single text string.
 *
 * Uses Ollama's native /api/embed endpoint (single-item batch).
 *
 * @param text  - The text to embed.
 * @param model - The Ollama model name (default: qwen3-embedding).
 * @returns Float32Array embedding vector.
 * @throws if Ollama is unreachable or returns an unexpected response.
 */
export async function embedText(
  text: string,
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<Float32Array> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Ollama embedding failed (${res.status}): ${errBody.slice(0, 200)}`,
    );
  }

  const data: OllamaEmbedResponse = await res.json();

  if (!data.embeddings || data.embeddings.length === 0) {
    throw new Error("Ollama returned an empty embeddings array.");
  }

  return new Float32Array(data.embeddings[0]);
}

/**
 * Generates embeddings for multiple text strings in a single batch call.
 * More efficient than calling embedText() in a loop.
 *
 * @param texts - Array of text strings to embed.
 * @param model - The Ollama model name.
 * @returns Array of Float32Array embedding vectors in the same order as `texts`.
 * @throws if Ollama is unreachable or the count of returned vectors mismatches.
 */
export async function embedBatch(
  texts: string[],
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Ollama batch embedding failed (${res.status}): ${errBody.slice(0, 200)}`,
    );
  }

  const data: OllamaEmbedResponse = await res.json();

  if (!data.embeddings || data.embeddings.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} embeddings, got ${data.embeddings?.length ?? 0}.`,
    );
  }

  return data.embeddings.map((vec) => new Float32Array(vec));
}

/**
 * Checks if the Ollama server is reachable and the given model is loaded.
 *
 * Results are cached per model name to avoid repeated round-trips on every
 * chat or retrieval request:
 *  - Positive (available)  → cached for 30 s
 *  - Negative (unavailable) → cached for  5 s (fast recovery)
 *
 * @param model - The embedding model name to check.
 * @returns `true` if the model is available; `false` otherwise.
 */
export async function isEmbeddingAvailable(
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<boolean> {
  const now    = Date.now();
  const cached = availabilityCache.get(model);

  if (cached && now < cached.expiresAt) {
    return cached.available;
  }

  let available = false;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2_000),
    });

    if (res.ok) {
      const data   = await res.json();
      const models: Array<{ name: string }> = data.models ?? [];
      available = models.some(
        (m) => m.name === model || m.name.startsWith(`${model}:`),
      );
    }
  } catch {
    // Ollama is unreachable — available stays false.
  }

  availabilityCache.set(model, {
    available,
    expiresAt: now + (available ? AVAILABLE_TTL_MS : UNAVAILABLE_TTL_MS),
  });

  return available;
}
