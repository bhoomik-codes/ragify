/**
 * __tests__/retrieval.test.ts
 *
 * Unit tests for the RRF fusion logic in lib/retrieval.ts.
 *
 * We test the internal RRF mechanics by exercising the exported
 * `retrieveContext` function with both legs mocked. Network
 * calls (Ollama, SQLite) are fully stubbed so tests run offline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock dependencies before importing the module under test
// ---------------------------------------------------------------------------

// Mock db — FTS leg
vi.mock("../lib/db", () => ({
  db: { $queryRaw: vi.fn() },
}));

// Mock embeddings — vector leg
vi.mock("../lib/embeddings", () => ({
  isEmbeddingAvailable: vi.fn(),
  embedText: vi.fn(),
}));

// Mock vector search
vi.mock("../lib/vector", () => ({
  searchChunks: vi.fn(),
}));

// Now import (mocked versions are resolved)
import { retrieveContext } from "../lib/retrieval";
import { db } from "../lib/db";
import { isEmbeddingAvailable, embedText } from "../lib/embeddings";
import { searchChunks } from "../lib/vector";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RAG_ID = "rag-123";

const makeVectorHit = (id: string, score: number) => ({
  id,
  documentId: `doc-${id}`,
  content: `Content for chunk ${id}`,
  score,
  embedding: {},
  document: { metadata: { embedding: { mode: "REAL" } } },
});

const makeFtsRow = (chunkId: string) => ({
  chunkId,
  documentId: `doc-${chunkId}`,
  content: `Content for chunk ${chunkId}`,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("retrieveContext — RRF hybrid fusion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Both legs empty ────────────────────────────────────────────────────────

  it("returns [] when both vector and FTS legs return nothing", async () => {
    vi.mocked(isEmbeddingAvailable).mockResolvedValue(true);
    vi.mocked(embedText).mockResolvedValue(new Float32Array([0.1, 0.2]));
    vi.mocked(searchChunks).mockResolvedValue([]);
    vi.mocked(db.$queryRaw).mockResolvedValue([]);

    const result = await retrieveContext({
      ragId: RAG_ID, query: "anything",
      topK: 5, threshold: 0.7, embeddingModel: "test-model",
    });

    expect(result).toHaveLength(0);
  });

  // ── Only vector leg has results ────────────────────────────────────────────

  it("returns vector results when FTS returns nothing", async () => {
    vi.mocked(isEmbeddingAvailable).mockResolvedValue(true);
    vi.mocked(embedText).mockResolvedValue(new Float32Array([0.1]));
    vi.mocked(searchChunks).mockResolvedValue([
      makeVectorHit("c1", 0.9) as any,
      makeVectorHit("c2", 0.8) as any,
    ]);
    vi.mocked(db.$queryRaw).mockResolvedValue([]);

    const result = await retrieveContext({
      ragId: RAG_ID, query: "query",
      topK: 5, threshold: 0.7, embeddingModel: "m",
    });

    expect(result).toHaveLength(2);
    expect(result.every(r => r.source === "vector")).toBe(true);
  });

  // ── Only FTS leg has results (Ollama unavailable) ─────────────────────────

  it("returns FTS results when Ollama is not available", async () => {
    vi.mocked(isEmbeddingAvailable).mockResolvedValue(false);
    vi.mocked(db.$queryRaw).mockResolvedValue([
      makeFtsRow("f1"),
      makeFtsRow("f2"),
    ]);

    const result = await retrieveContext({
      ragId: RAG_ID, query: "query",
      topK: 5, threshold: 0.7, embeddingModel: "m",
    });

    expect(result).toHaveLength(2);
    expect(result.every(r => r.source === "fts")).toBe(true);
  });

  // ── RRF boosts chunks present in both legs ────────────────────────────────

  it("ranks a chunk that appears in both legs above exclusive chunks", async () => {
    // c1 appears in both vector (rank 1) and FTS (rank 2).
    // c2 appears only in vector (rank 2).
    // c3 appears only in FTS (rank 1).
    //
    // RRF scores (k=60):
    //   c1 = 1/(60+1) + 1/(60+2) = 0.01639 + 0.01613 ≈ 0.03252
    //   c3 = 1/(60+1)             ≈ 0.01639  (FTS rank 1 only)
    //   c2 = 1/(60+2)             ≈ 0.01613  (vector rank 2 only)
    // Expected order: c1 > c3 > c2

    vi.mocked(isEmbeddingAvailable).mockResolvedValue(true);
    vi.mocked(embedText).mockResolvedValue(new Float32Array([0.1]));
    vi.mocked(searchChunks).mockResolvedValue([
      makeVectorHit("c1", 0.95) as any, // vector rank 1
      makeVectorHit("c2", 0.88) as any, // vector rank 2
    ]);
    vi.mocked(db.$queryRaw).mockResolvedValue([
      makeFtsRow("c3"), // FTS rank 1
      makeFtsRow("c1"), // FTS rank 2
    ]);

    const result = await retrieveContext({
      ragId: RAG_ID, query: "query",
      topK: 5, threshold: 0.5, embeddingModel: "m",
    });

    expect(result).toHaveLength(3);
    expect(result[0].chunkId).toBe("c1"); // highest combined RRF score
    expect(result[1].chunkId).toBe("c3"); // FTS rank 1 only
    expect(result[2].chunkId).toBe("c2"); // vector rank 2 only
  });

  // ── topK is respected ──────────────────────────────────────────────────────

  it("returns at most topK results", async () => {
    vi.mocked(isEmbeddingAvailable).mockResolvedValue(true);
    vi.mocked(embedText).mockResolvedValue(new Float32Array([0.1]));
    vi.mocked(searchChunks).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeVectorHit(`v${i}`, 0.9 - i * 0.05) as any),
    );
    vi.mocked(db.$queryRaw).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeFtsRow(`f${i}`)),
    );

    const result = await retrieveContext({
      ragId: RAG_ID, query: "query",
      topK: 3, threshold: 0.5, embeddingModel: "m",
    });

    expect(result).toHaveLength(3);
  });

  // ── Resilience: vector leg failure ────────────────────────────────────────

  it("falls back gracefully when the vector leg throws", async () => {
    vi.mocked(isEmbeddingAvailable).mockResolvedValue(true);
    vi.mocked(embedText).mockRejectedValue(new Error("Ollama crashed"));
    vi.mocked(db.$queryRaw).mockResolvedValue([
      makeFtsRow("f1"),
      makeFtsRow("f2"),
    ]);

    const result = await retrieveContext({
      ragId: RAG_ID, query: "query",
      topK: 5, threshold: 0.7, embeddingModel: "m",
    });

    // Should still return FTS results, not crash.
    expect(result).toHaveLength(2);
    expect(result.every(r => r.source === "fts")).toBe(true);
  });

  // ── Resilience: FTS leg failure ───────────────────────────────────────────

  it("falls back gracefully when the FTS leg throws", async () => {
    vi.mocked(isEmbeddingAvailable).mockResolvedValue(true);
    vi.mocked(embedText).mockResolvedValue(new Float32Array([0.1]));
    vi.mocked(searchChunks).mockResolvedValue([
      makeVectorHit("c1", 0.9) as any,
    ]);
    vi.mocked(db.$queryRaw).mockRejectedValue(new Error("SQLite error"));

    const result = await retrieveContext({
      ragId: RAG_ID, query: "query",
      topK: 5, threshold: 0.7, embeddingModel: "m",
    });

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("vector");
  });
});
