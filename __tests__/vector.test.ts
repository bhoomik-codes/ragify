import test from "node:test";
import assert from "node:assert/strict";

import {
  cosineSimilarity,
  deserializeVector,
  serializeVector,
} from "../lib/vector";

test("cosineSimilarity: identical vectors -> 1.0", () => {
  const a = new Float32Array([1, 2, 3]);
  const b = new Float32Array([1, 2, 3]);
  assert.equal(cosineSimilarity(a, b), 1);
});

test("cosineSimilarity: orthogonal vectors -> 0.0", () => {
  const a = new Float32Array([1, 0]);
  const b = new Float32Array([0, 1]);
  assert.equal(cosineSimilarity(a, b), 0);
});

test("cosineSimilarity: zero-magnitude vector -> 0 (no throw)", () => {
  const a = new Float32Array([0, 0, 0]);
  const b = new Float32Array([1, 2, 3]);
  assert.equal(cosineSimilarity(a, b), 0);
});

test("serialize/deserialize round-trip preserves Float32Array values", () => {
  const original = new Float32Array([0.1, -0.2, 3.14159]);
  const raw = serializeVector(original);
  const roundTripped = deserializeVector(raw);

  assert.equal(roundTripped.length, original.length);
  for (let i = 0; i < original.length; i++) {
    assert.ok(Math.abs(roundTripped[i] - original[i]) < 1e-6);
  }
});

