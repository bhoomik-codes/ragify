import "server-only";

import { db } from "@/lib/db";
import { embedText, isEmbeddingAvailable } from "@/lib/embeddings";
import { searchChunks } from "@/lib/vector";
import type { RetrievedChunk } from "@/lib/types";

function buildFtsQuery(query: string): string {
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return keywords.join(" OR ");
}

function isMockEmbeddingDocument(metadata: unknown): boolean {
  const m = metadata as any;
  return m?.embedding?.mode === "MOCK";
}

export interface RetrieveContextParams {
  ragId: string;
  query: string;
  topK: number;
  threshold: number;
  embeddingModel: string;
}

/**
 * Hybrid retrieval:
 * 1) vector search (if embedding model available)
 * 2) SQLite FTS5 keyword search fallback
 * 3) if neither yields results, return []
 */
export async function retrieveContext(
  params: RetrieveContextParams,
): Promise<RetrievedChunk[]> {
  const { ragId, query, topK, threshold, embeddingModel } = params;

  // 1) Dense vector retrieval (preferred)
  const canEmbed = await isEmbeddingAvailable(embeddingModel);
  if (canEmbed) {
    try {
      const queryVector = await embedText(query, embeddingModel);
      const scored = await searchChunks(queryVector, ragId, topK, threshold);

      const filtered = scored.filter((c) => !isMockEmbeddingDocument((c as any).document?.metadata));
      if (filtered.length > 0) {
        return filtered.map((c) => ({
          chunkId: c.id,
          documentId: c.documentId,
          content: c.content,
          score: c.score,
          source: "vector",
        }));
      }
    } catch (err) {
      console.warn("[retrieveContext] vector retrieval failed; falling back to FTS:", err);
    }
  }

  // 2) Sparse retrieval (FTS5)
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) return [];

  try {
    const rows = await db.$queryRaw<
      Array<{ chunkId: string; documentId: string; content: string }>
    >`
      SELECT c.id as chunkId, c.documentId as documentId, c.content as content
      FROM chunks_fts
      JOIN Chunk c ON c.rowid = chunks_fts.rowid
      JOIN Document d ON d.id = c.documentId
      WHERE d.ragId = ${ragId}
        AND d.status = 'READY'
        AND chunks_fts MATCH ${ftsQuery}
      LIMIT ${topK}
    `;

    return rows.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      content: r.content,
      source: "fts",
    }));
  } catch (err) {
    console.warn("[retrieveContext] FTS retrieval failed; returning empty context:", err);
    return [];
  }
}

