import { describe, expect, it } from "vitest";
import { chunkDocument } from "../lib/pipeline";

// ---------------------------------------------------------------------------
// chunkDocument — unit tests
// ---------------------------------------------------------------------------

describe("chunkDocument", () => {
  // --- basic sentence-boundary preservation -----------------------------------

  it("preserves sentence boundaries for multi-paragraph inputs", () => {
    const input =
      "First paragraph. It has two sentences.\n\n" +
      "Second paragraph is here. It also has two sentences.\n\n" +
      "Third paragraph ends now. Final sentence here.";

    const chunks = chunkDocument(input, 6, 2);
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    for (const c of chunks) {
      expect(c.content.length).toBeGreaterThan(0);
      expect(c.content.trim()).toMatch(/[.!?]$/);
    }
  });

  // --- empty / trivial input -------------------------------------------------

  it("returns an empty array for an empty string", () => {
    const chunks = chunkDocument("", 100, 10);
    expect(chunks).toHaveLength(0);
  });

  it("returns an empty array for whitespace-only input", () => {
    const chunks = chunkDocument("   \n\n   ", 100, 10);
    expect(chunks).toHaveLength(0);
  });

  // --- single sentence -------------------------------------------------------

  it("returns a single chunk for a short single sentence", () => {
    const chunks = chunkDocument("Hello world.", 100, 0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("Hello world.");
    expect(chunks[0].index).toBe(0);
  });

  // --- chunk size boundary ---------------------------------------------------

  it("fits all words into one chunk when chunkSize >= word count", () => {
    const text = "one two three four five";
    const chunks = chunkDocument(text, 10, 0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].tokenCount).toBeLessThanOrEqual(10);
  });

  it("produces multiple chunks when text exceeds chunkSize", () => {
    // 20 distinct words → should split with chunkSize=5
    const words = Array.from({ length: 20 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const chunks = chunkDocument(text, 5, 0);
    expect(chunks.length).toBeGreaterThan(1);
  });

  // --- zero overlap ----------------------------------------------------------

  it("does not repeat content across chunks when overlap is 0", () => {
    const words = Array.from({ length: 30 }, (_, i) => `tok${i}`);
    const text = words.join(" ");
    const chunks = chunkDocument(text, 10, 0);

    const allWords = chunks.flatMap((c) => c.content.split(/\s+/));
    // Every word should appear exactly once (no duplicates with no overlap).
    const unique = new Set(allWords);
    expect(unique.size).toBe(allWords.length);
  });

  // --- non-zero overlap ------------------------------------------------------

  it("carries over trailing semantic units into the next chunk when overlap > 0", () => {
    // Constraint: each sentence must have wordCount > overlap to prevent an
    // infinite rewind loop in the algorithm. Use sentences of exactly
    // chunkSize=5 words, with overlap=3 (< 5). Each sentence fits as one unit
    // per chunk; the overlap counter then tries to carry it into the next chunk,
    // but 5 > 3, so no carry-over. For visible duplication, use overlap relative
    // to multi-unit chunks where carry back is partial.
    //
    // Simpler approach: build a paragraph of 3-word sentences with chunkSize=10.
    // Two sentences fit per chunk (6 words ≤ 10); overlap=5 will carry back
    // one sentence (3 words ≤ 5), causing each sentence to appear twice.
    const sentences = [
      "alpha beta gamma.",
      "delta epsilon zeta.",
      "eta theta iota.",
      "kappa lambda mu.",
      "nu xi omicron.",
      "pi rho sigma.",
    ];
    const text = sentences.join(" ");
    // chunkSize=10 fits two 3-word sentences; overlap=5 can carry one sentence.
    const chunks = chunkDocument(text, 10, 5);
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    const allTokens = chunks.flatMap((c) =>
      c.content.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean)
    );
    const uniqueTokens = new Set(allTokens);

    // If overlap produced any carry-over, the combined token list is longer
    // than the set of unique tokens (some words appear in more than one chunk).
    expect(allTokens.length).toBeGreaterThan(uniqueTokens.size);
  });

  // --- metadata & index correctness ------------------------------------------

  it("assigns sequential, zero-based indexes to all chunks", () => {
    const words = Array.from({ length: 30 }, (_, i) => `w${i}`);
    const chunks = chunkDocument(words.join(" "), 8, 0);
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("attaches a non-empty metadata.section to every chunk", () => {
    const text = "Sentence one. Sentence two. Sentence three.";
    const chunks = chunkDocument(text, 3, 0);
    for (const c of chunks) {
      expect(typeof c.metadata.section).toBe("string");
      expect((c.metadata.section as string).length).toBeGreaterThan(0);
    }
  });

  // --- plain-text / CSV-style input (no sentence punctuation) ---------------

  it("handles CSV-style comma-separated single-line content without crashing", () => {
    const csv = "name,age,city\nAlice,30,NYC\nBob,25,LA\nCarol,35,Chicago";
    const chunks = chunkDocument(csv, 5, 0);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    const combined = chunks.map((c) => c.content).join(" ");
    expect(combined).toContain("Alice");
    expect(combined).toContain("Chicago");
  });

  it("does not lose words from a plain-text document (lossless chunking)", () => {
    const words = Array.from({ length: 50 }, (_, i) => `item${i}`);
    const text = words.join(" ");
    // Collect all words that appear across every chunk.
    const chunks = chunkDocument(text, 10, 0);
    const recovered = new Set(
      chunks.flatMap((c) => c.content.split(/\s+/).filter(Boolean))
    );
    for (const w of words) {
      expect(recovered.has(w)).toBe(true);
    }
  });

  // --- tokenCount accuracy ---------------------------------------------------

  it("reports tokenCount that matches the word count of the chunk content", () => {
    const text = "one two three. four five six. seven eight nine.";
    const chunks = chunkDocument(text, 5, 0);
    for (const c of chunks) {
      const wordCount = c.content.trim().split(/\s+/).filter(Boolean).length;
      expect(c.tokenCount).toBe(wordCount);
    }
  });
});
