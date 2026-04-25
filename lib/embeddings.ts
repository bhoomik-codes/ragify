/**
 * lib/embeddings.ts
 *
 * Real embedding engine using Ollama's /api/embed endpoint.
 * Supports Qwen3-Embedding-8B and any other Ollama-hosted embedding model.
 *
 * ⚠ Server-only — never import from a client component.
 */

import "server-only";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

/**
 * The default embedding model served by Ollama.
 * Override per-RAG via the `embeddingModel` field in the RAG configuration.
 */
export const DEFAULT_EMBEDDING_MODEL = "qwen3-embedding";

interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
}

/**
 * Generates an embedding vector for a single text string.
 *
 * Uses Ollama's native /api/embed endpoint which supports batch inputs.
 * Falls back to a zero vector if Ollama is unreachable (graceful degradation).
 *
 * @param text  - The text to embed.
 * @param model - The Ollama model name (default: qwen3-embedding).
 * @returns Float32Array embedding vector.
 */
export async function embedText(
  text: string,
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<Float32Array> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: text }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(
        `Ollama embedding failed (${res.status}): ${errBody.slice(0, 200)}`
      );
    }

    const data: OllamaEmbedResponse = await res.json();

    if (!data.embeddings || data.embeddings.length === 0) {
      throw new Error("Ollama returned empty embeddings array.");
    }

    return new Float32Array(data.embeddings[0]);
  } catch (err) {
    console.error("[EMBEDDING_ERROR]", err);
    // Graceful fallback: return null to signal the caller to use keyword search
    throw err;
  }
}

/**
 * Generates embeddings for multiple text strings in a single batch call.
 * More efficient than calling embedText() in a loop.
 *
 * @param texts - Array of text strings to embed.
 * @param model - The Ollama model name.
 * @returns Array of Float32Array embedding vectors.
 */
export async function embedBatch(
  texts: string[],
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: texts }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(
        `Ollama batch embedding failed (${res.status}): ${errBody.slice(0, 200)}`
      );
    }

    const data: OllamaEmbedResponse = await res.json();

    if (!data.embeddings || data.embeddings.length !== texts.length) {
      throw new Error(
        `Expected ${texts.length} embeddings, got ${data.embeddings?.length ?? 0}.`
      );
    }

    return data.embeddings.map((vec) => new Float32Array(vec));
  } catch (err) {
    console.error("[BATCH_EMBEDDING_ERROR]", err);
    throw err;
  }
}

/**
 * Checks if the Ollama server is reachable and the embedding model is available.
 * Used for graceful fallback to keyword search when Ollama isn't running.
 */
export async function isEmbeddingAvailable(
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return false;

    const data = await res.json();
    const models: Array<{ name: string }> = data.models || [];
    return models.some(
      (m) => m.name === model || m.name.startsWith(`${model}:`)
    );
  } catch {
    return false;
  }
}
