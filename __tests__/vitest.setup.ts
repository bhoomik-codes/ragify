import { vi } from "vitest";

// These tests target pure utilities (chunking + vector math). Some source files
// import server/runtime-only modules; we mock them so the module can load in Vitest.

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/embeddings", () => ({
  embedText: vi.fn(),
  isEmbeddingAvailable: vi.fn(),
  DEFAULT_EMBEDDING_MODEL: "mock-embedding-model",
}));
vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(async () => ({ value: "" })),
  },
}));
vi.mock("pdf-parse", () => ({
  PDFParse: class {
    async getText() {
      return { text: "" };
    }
    async destroy() {}
  },
}));

