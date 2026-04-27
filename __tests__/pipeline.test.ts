import { describe, expect, it } from "vitest";
import { chunkDocument } from "../lib/pipeline";

describe("chunkDocument", () => {
  it("preserves sentence boundaries for multi-paragraph inputs", () => {
  const input =
    "First paragraph. It has two sentences.\n\n" +
    "Second paragraph is here. It also has two sentences.\n\n" +
    "Third paragraph ends now. Final sentence here.";

  const chunks = chunkDocument(input, 6, 2);
  expect(chunks.length).toBeGreaterThanOrEqual(2);

  // Chunks should not cut mid-sentence; they should end in punctuation.
  for (const c of chunks) {
    expect(c.content.length).toBeGreaterThan(0);
    expect(c.content.trim()).toMatch(/[.!?]$/);
  }
});
});

