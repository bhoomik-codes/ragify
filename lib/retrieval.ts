/**
 * lib/retrieval.ts
 *
 * Hybrid retrieval engine: dense vector search + sparse FTS5 keyword search,
 * fused with Reciprocal Rank Fusion (RRF).
 *
 * Strategy:
 *  1. Run dense vector search and sparse FTS5 search in parallel.
 *  2. Assign an RRF score to every chunk from both result sets.
 *  3. Merge and deduplicate by chunkId.
 *  4. Sort by combined RRF score descending and return the top-K.
 *
 * Why RRF instead of simple fallback?
 *  Sequential fallback (try vector → if empty, try FTS) silently discards
 *  strong keyword matches when vector search returns any result at all.
 *  RRF merges both ranked lists so a chunk that ranks highly in either
 *  (or both) always surfaces near the top, regardless of the other leg.
 *
 * Reference:
 *  Cormack, G.V., Clarke, C.L., & Buettcher, S. (2009).
 *  "Reciprocal Rank Fusion outperforms Condorcet and individual Rank
 *   Learning Methods." SIGIR 2009.
 */

import "server-only";

import { db } from "@/lib/db";
import { embedText, isEmbeddingAvailable } from "@/lib/embeddings";
import { searchChunks } from "@/lib/vector";
import type { RetrievedChunk } from "@/lib/types";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ScoredChunk extends RetrievedChunk {
  /** Accumulated RRF score across both retrieval legs. */
  rrfScore: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips punctuation, lowercases, and drops stop-words shorter than
 * 3 characters to produce a clean SQLite FTS5 query.
 *
 * FTS5 requires at least one term; callers check for empty string.
 */
function buildFtsQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .join(" OR ");
}

/**
 * Returns true when a Document was indexed with mock (random) embeddings.
 * Mock-embedded chunks must be excluded from vector retrieval because their
 * cosine similarities are meaningless noise.
 */
function isMockEmbeddingDocument(metadata: unknown): boolean {
  const m = metadata as Record<string, unknown> | null;
  const embedding = m?.embedding as Record<string, unknown> | undefined;
  return embedding?.mode === "MOCK";
}

/**
 * Computes the RRF score contribution for a chunk at a given rank.
 *
 * RRF(rank) = 1 / (k + rank)
 *
 * k = 60 is the canonical constant from the original paper. It smooths
 * the contribution of very-high-ranked documents and prevents a single
 * first-place result from dominating when the other leg disagrees.
 */
const RRF_K = 60;

function rrfScore(rank: number): number {
  return 1 / (RRF_K + rank);
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface RetrieveContextParams {
  ragId: string;
  query: string;
  topK: number;
  threshold: number;
  embeddingModel: string;
}

/**
 * Hybrid retrieval with Reciprocal Rank Fusion (RRF).
 *
 * Both legs run in parallel; results are merged and re-ranked by their
 * combined RRF score. If a leg fails (e.g. Ollama is down) or returns zero
 * results it simply contributes nothing to the merged ranking — the other
 * leg carries the response.
 *
 * Returns an empty array only when both legs find nothing.
 */
export async function retrieveContext(
  params: RetrieveContextParams,
): Promise<RetrievedChunk[]> {
  const { ragId, query, topK, threshold, embeddingModel } = params;

  // ── Run both legs concurrently ─────────────────────────────────────────────

  const [vectorResults, ftsResults] = await Promise.all([
    runVectorSearch(ragId, query, topK, threshold, embeddingModel),
    runFtsSearch(ragId, query, topK),
  ]);

  // Fast-path: if both legs returned nothing, bail out early.
  if (vectorResults.length === 0 && ftsResults.length === 0) {
    return [];
  }

  // ── RRF fusion ─────────────────────────────────────────────────────────────
  //
  // Maintain a map of chunkId → ScoredChunk so each chunk's RRF score
  // accumulates contributions from both ranked lists.

  const scored = new Map<string, ScoredChunk>();

  // Helper: upsert a chunk into the scored map, adding an RRF contribution.
  const upsert = (chunk: RetrievedChunk, rank: number): void => {
    const contribution = rrfScore(rank);
    const existing = scored.get(chunk.chunkId);

    if (existing) {
      existing.rrfScore += contribution;
      // If this chunk now has a real cosine score (from vector leg), prefer it.
      if (chunk.score !== undefined && existing.score === undefined) {
        existing.score = chunk.score;
      }
    } else {
      scored.set(chunk.chunkId, { ...chunk, rrfScore: contribution });
    }
  };

  // Assign RRF contributions from the vector leg (1-indexed ranks).
  vectorResults.forEach((chunk, idx) => upsert(chunk, idx + 1));

  // Assign RRF contributions from the FTS leg (1-indexed ranks).
  ftsResults.forEach((chunk, idx) => upsert(chunk, idx + 1));

  // ── Sort + truncate ────────────────────────────────────────────────────────

  const merged = Array.from(scored.values());
  merged.sort((a, b) => b.rrfScore - a.rrfScore);

  // Annotate the retrieval source for observability.
  // Chunks that appeared in both legs get source "vector" (richer metadata).
  return merged.slice(0, topK).map(({ rrfScore: _, ...chunk }) => chunk);
}

// ---------------------------------------------------------------------------
// Internal retrieval legs
// ---------------------------------------------------------------------------

/**
 * Dense vector retrieval leg.
 *
 * Embeds the query, runs cosine-similarity search over stored chunk vectors,
 * and filters out chunks backed by mock embeddings.
 *
 * Returns [] when:
 *  - Ollama is not reachable / the embedding model is not loaded.
 *  - The embedding call itself fails.
 *  - All results are from mock-embedded documents.
 */
async function runVectorSearch(
  ragId: string,
  query: string,
  topK: number,
  threshold: number,
  embeddingModel: string,
): Promise<RetrievedChunk[]> {
  const canEmbed = await isEmbeddingAvailable(embeddingModel);
  if (!canEmbed) return [];

  try {
    const queryVector = await embedText(query, embeddingModel);
    const hits = await searchChunks(queryVector, ragId, topK, threshold);

    return hits
      .filter((c) => !isMockEmbeddingDocument((c as any).document?.metadata))
      .map((c) => ({
        chunkId: c.id,
        documentId: c.documentId,
        content: c.content,
        score: c.score,
        source: "vector" as const,
      }));
  } catch (err) {
    console.warn("[retrieval] Vector leg failed; contributing zero results to RRF:", err);
    return [];
  }
}

/**
 * Sparse FTS5 retrieval leg.
 *
 * Runs a full-text keyword search over the `chunks_fts` virtual table.
 * Rank is determined by SQLite's built-in BM25 scoring (implicit in FTS5 MATCH).
 *
 * Returns [] when the query produces no FTS terms or the DB call fails.
 */
async function runFtsSearch(
  ragId: string,
  query: string,
  topK: number,
): Promise<RetrievedChunk[]> {
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) return [];

  try {
    const rows = await db.$queryRaw<
      Array<{ chunkId: string; documentId: string; content: string }>
    >`
      SELECT c.id      AS chunkId,
             c.documentId AS documentId,
             c.content  AS content
      FROM   chunks_fts
      JOIN   Chunk    c ON c.rowid     = chunks_fts.rowid
      JOIN   Document d ON d.id        = c.documentId
      WHERE  d.ragId  = ${ragId}
        AND  d.status = 'READY'
        AND  chunks_fts MATCH ${ftsQuery}
      ORDER BY rank          -- FTS5 BM25 rank (lower = better)
      LIMIT  ${topK}
    `;

    return rows.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      content: r.content,
      source: "fts" as const,
    }));
  } catch (err) {
    console.warn("[retrieval] FTS leg failed; contributing zero results to RRF:", err);
    return [];
  }
}
