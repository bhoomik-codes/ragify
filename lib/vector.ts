/**
 * lib/vector.ts
 *
 * Server-side vector / embedding utilities.
 *
 * ⚠  NEVER import this file from a client component.
 *    The "server-only" import below causes Next.js to throw at build
 *    time if you try.
 *
 * Responsibilities:
 *  - Serialize / deserialize Float32Array ↔ JSON string (SQLite storage)
 *  - Cosine-similarity computation (used for in-process retrieval in dev)
 *  - Top-K retrieval helper over an array of scored chunks
 */

import "server-only";

import type { Chunk, Embedding } from "@prisma/client";
import { db } from "./db";

// ---------------------------------------------------------------------------
// 1. Serialisation — Float32Array ↔ JSON string
// ---------------------------------------------------------------------------

/**
 * Serialises a Float32Array to a compact JSON number array string.
 * This is what gets written to `Embedding.vector` (String column).
 *
 * In production swap to a native pgvector column; the DB layer handles
 * the binary format, so callers keep using Float32Array throughout.
 */
export function serializeVector(vec: Float32Array): string {
  // JSON.stringify of a plain Array is the most interoperable format.
  return JSON.stringify(Array.from(vec));
}

/**
 * Deserialises a JSON string back to a Float32Array.
 * Validates that the parsed value is a non-empty array of numbers.
 *
 * @throws if the stored value is malformed.
 */
export function deserializeVector(raw: string): Float32Array {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("[vector] deserializeVector: stored value is not valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      "[vector] deserializeVector: expected a non-empty JSON array, " +
      `got: ${typeof parsed}`,
    );
  }

  for (let i = 0; i < parsed.length; i++) {
    if (typeof parsed[i] !== "number" || !isFinite(parsed[i])) {
      throw new Error(
        `[vector] deserializeVector: element at index ${i} is not a finite number.`,
      );
    }
  }

  return new Float32Array(parsed as number[]);
}

// ---------------------------------------------------------------------------
// 2. Cosine similarity
// ---------------------------------------------------------------------------

/**
 * Computes the cosine similarity between two vectors.
 * Both vectors must have the same dimensionality.
 *
 * Returns a value in [-1, 1] where 1 means identical direction.
 * Text embeddings are typically ≥0 (query/doc are rarely opposite).
 *
 * @throws if vectors have different lengths or are zero-length.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `[vector] cosineSimilarity: dimension mismatch (${a.length} vs ${b.length}).`,
    );
  }
  if (a.length === 0) {
    throw new Error("[vector] cosineSimilarity: vectors must not be empty.");
  }

  let dot  = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0; // one or both vectors are zero — no similarity

  return dot / denom;
}

// ---------------------------------------------------------------------------
// 3. ChunkWithScore type & retrieval helpers
// ---------------------------------------------------------------------------

/**
 * A Prisma Chunk row with its Embedding relation attached, plus a
 * computed cosine-similarity score (0–1) from the query.
 * Returned by `searchChunks` and used to build `MessageSource[]`.
 */
export type ChunkWithScore = Chunk & {
  embedding: Embedding;
  score    : number;
};

/**
 * DEV: Full table scan — loads all embeddings for the RAG's documents.
 * Acceptable for small document sets in local dev (SQLite).
 *
 * PROD MIGRATION: Replace with pgvector query:
 *   SELECT c.*, e.vector, (e.vector <=> $1) AS score
 *   FROM embeddings e JOIN chunks c ON e."chunkId" = c.id
 *   JOIN documents d ON c."documentId" = d.id
 *   WHERE d."ragId" = $2
 *   ORDER BY score ASC LIMIT $3
 *   Requires: vector(1536) column type + ivfflat index
 *
 * @param queryVector - Embedding of the user's query.
 * @param ragId       - ID of the RAG whose documents to search.
 * @param topK        - Maximum number of results to return.
 * @param threshold   - Minimum cosine similarity score (0–1).
 */
export async function searchChunks(
  queryVector: Float32Array,
  ragId      : string,
  topK       : number,
  threshold  : number,
): Promise<ChunkWithScore[]> {
  // Load only embeddings whose chunk belongs to a document in this RAG.
  const embeddings = await db.embedding.findMany({
    where: {
      chunk: {
        document: {
          ragId,
        },
      },
    },
    include: {
      chunk: {
        include: {
          document: true,
        },
      },
    },
  });

  if (embeddings.length === 0) return [];

  // NOTE: This in-process scan is a known scalability ceiling for SQLite.
  // If you hit this cap, migrate to PostgreSQL + pgvector (see `FUTURE_PLAN.md`).
  const MAX_EMBEDDINGS_PER_QUERY = 2000;
  const embeddingsToScore =
    embeddings.length > MAX_EMBEDDINGS_PER_QUERY
      ? (console.warn(
          `[vector] searchChunks: capping embeddings (${embeddings.length} → ${MAX_EMBEDDINGS_PER_QUERY}). ` +
            "Consider migrating to pgvector (see FUTURE_PLAN.md).",
        ),
        embeddings.slice(0, MAX_EMBEDDINGS_PER_QUERY))
      : embeddings;

  const scored: ChunkWithScore[] = [];
  for (let i = 0; i < embeddingsToScore.length; i++) {
    // Yield periodically so long scans don't block the event loop.
    if (i > 0 && i % 50 === 0) {
      await new Promise<void>((r) => setImmediate(r));
    }

    const emb = embeddingsToScore[i];
    const docMeta = (emb.chunk as any)?.document?.metadata as any;
    if (docMeta?.embedding?.mode === "MOCK") continue;

    const vec = deserializeVector(emb.vector);
    const score = cosineSimilarity(queryVector, vec);
    if (score < threshold) continue;

    scored.push({
      ...emb.chunk,
      embedding: emb,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  scored.splice(topK);

  return scored;
}

// ---------------------------------------------------------------------------
// 4. Excerpt helper
// ---------------------------------------------------------------------------

/**
 * Returns a trimmed excerpt of `content` up to `maxChars` characters,
 * appending "…" if truncated. Used to populate `MessageSource.excerpt`.
 */
export function makeExcerpt(content: string, maxChars = 300): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars).trimEnd() + "…";
}
