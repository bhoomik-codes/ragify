import test from "node:test";
import assert from "node:assert/strict";

import { chunkDocument } from "../lib/pipeline";

test("chunkDocument preserves sentence boundaries for multi-paragraph inputs", () => {
  const input =
    "First paragraph. It has two sentences.\n\n" +
    "Second paragraph is here. It also has two sentences.\n\n" +
    "Third paragraph ends now. Final sentence here.";

  const chunks = chunkDocument(input, 6, 2);
  assert.ok(chunks.length >= 2);

  // Chunks should not cut mid-sentence; they should end in punctuation.
  for (const c of chunks) {
    assert.ok(c.content.length > 0);
    assert.match(c.content.trim(), /[.!?]$/);
  }
});

