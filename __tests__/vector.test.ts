import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  deserializeVector,
  serializeVector,
} from "../lib/vector";

describe("vector utilities", () => {
  it("cosineSimilarity: identical vectors -> 1.0", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(1);
  });

  it("cosineSimilarity: orthogonal vectors -> 0.0", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0, 1]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("cosineSimilarity: zero-magnitude vector -> 0 (no throw)", () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("serialize/deserialize round-trip preserves Float32Array values", () => {
    const original = new Float32Array([0.1, -0.2, 3.14159]);
    const raw = serializeVector(original);
    const roundTripped = deserializeVector(raw);

    expect(roundTripped.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(roundTripped[i]).toBeCloseTo(original[i], 6);
    }
  });
});

