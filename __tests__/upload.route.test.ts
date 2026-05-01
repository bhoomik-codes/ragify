/**
 * __tests__/upload.route.test.ts
 *
 * Integration-style unit tests for POST /api/documents/upload.
 *
 * Strategy: mock all external I/O (auth, db, storage, pipeline) so tests
 * run fast, deterministically, and without a running server or database.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist shared mock functions BEFORE vi.mock factories run (Vitest requirement)
// ---------------------------------------------------------------------------

const {
  mockAuth,
  mockDbRagFindUnique,
  mockDbDocCreate,
  mockDbDocFindUnique,
  mockPutObject,
  mockRunPipeline,
} = vi.hoisted(() => ({
  mockAuth:             vi.fn(),
  mockDbRagFindUnique:  vi.fn(),
  mockDbDocCreate:      vi.fn(),
  mockDbDocFindUnique:  vi.fn(),
  mockPutObject:        vi.fn(),
  mockRunPipeline:      vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/db", () => ({
  db: {
    rag:      { findUnique: mockDbRagFindUnique },
    document: {
      create:     mockDbDocCreate,
      findUnique: mockDbDocFindUnique,
    },
  },
}));
vi.mock("@/lib/storage", () => ({
  getStorage: () => ({
    provider:  "local",
    putObject: mockPutObject,
  }),
}));
vi.mock("@/lib/pipeline", () => ({ runIngestionPipeline: mockRunPipeline }));

// ---------------------------------------------------------------------------
// Import handler AFTER mocks are registered
// ---------------------------------------------------------------------------

import { POST } from "../app/api/documents/upload/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal multipart-style FormData Request. */
function makeRequest(overrides: {
  ragId?:     string;
  fileName?:  string;
  mimeType?:  string;
  sizeBytes?: number;
}): Request {
  const {
    ragId     = "rag-123",
    fileName  = "doc.pdf",
    mimeType  = "application/pdf",
    sizeBytes = 1024,
  } = overrides;

  const content = new Uint8Array(sizeBytes).fill(37); // 37 = '%'
  const file    = new File([content], fileName, { type: mimeType });

  const formData = new FormData();
  formData.set("ragId", ragId);
  formData.set("file",  file);

  return new Request("http://localhost/api/documents/upload", {
    method: "POST",
    body:   formData,
  });
}

const STUB_RAG = { id: "rag-123", userId: "user-abc" };
const STUB_DOC = { id: "doc-xyz", name: "doc.pdf", size: 1024, type: "application/pdf" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Tracks a monotonically increasing fake timestamp so each test's uploads
// appear in a separate 60 s rate-limit window.
let fakeNow = Date.now();

describe("POST /api/documents/upload", () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Advance fake time by 2 minutes per test so every request lands outside
    // the previous test's rate-limit window (60 s) in the in-memory Map.
    fakeNow += 120_000;
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(fakeNow);
    // Happy-path defaults
    mockAuth.mockResolvedValue({ user: { id: "user-abc" } });
    mockDbRagFindUnique.mockResolvedValue(STUB_RAG);
    mockDbDocCreate.mockResolvedValue(STUB_DOC);
    mockDbDocFindUnique.mockResolvedValue({ ...STUB_DOC, status: "READY" });
    mockPutObject.mockResolvedValue(undefined);
    mockRunPipeline.mockResolvedValue(undefined);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Auth guard
  // -------------------------------------------------------------------------

  it("returns 401 when no session exists", async () => {
    mockAuth.mockResolvedValue(null);
    const res  = await POST(makeRequest({}));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  it("returns 400 when ragId is missing from the form", async () => {
    const formData = new FormData();
    const file = new File([new Uint8Array(10)], "doc.pdf", { type: "application/pdf" });
    formData.set("file", file);
    const req = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      body:   formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when file is missing from the form", async () => {
    const formData = new FormData();
    formData.set("ragId", "rag-123");
    const req = new Request("http://localhost/api/documents/upload", {
      method: "POST",
      body:   formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 413 when file exceeds the 10 MB limit", async () => {
    const BIG = 11 * 1024 * 1024; // 11 MB
    const res = await POST(makeRequest({ sizeBytes: BIG }));
    expect(res.status).toBe(413);
  });

  it("returns 415 for an unsupported mime type", async () => {
    const res = await POST(makeRequest({ fileName: "image.png", mimeType: "image/png" }));
    expect(res.status).toBe(415);
  });

  it("returns 415 for an unsupported file extension (even with a valid mime type)", async () => {
    const res = await POST(makeRequest({ fileName: "virus.exe", mimeType: "application/pdf" }));
    expect(res.status).toBe(415);
  });

  // -------------------------------------------------------------------------
  // Ownership checks
  // -------------------------------------------------------------------------

  it("returns 404 when the RAG does not exist", async () => {
    mockDbRagFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the session user does not own the RAG", async () => {
    mockDbRagFindUnique.mockResolvedValue({ ...STUB_RAG, userId: "other-user" });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("returns 200 with documentId and READY status on success", async () => {
    const res  = await POST(makeRequest({}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.documentId).toBe("doc-xyz");
    expect(body.status).toBe("READY");
    expect(body.name).toBe("doc.pdf");
  });

  it("calls putObject with the correct content-type", async () => {
    await POST(makeRequest({ mimeType: "application/pdf" }));
    expect(mockPutObject).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "application/pdf" })
    );
  });

  it("calls runIngestionPipeline with the new document id", async () => {
    await POST(makeRequest({}));
    expect(mockRunPipeline).toHaveBeenCalledWith("doc-xyz");
  });

  // -------------------------------------------------------------------------
  // Pipeline failure resilience
  // -------------------------------------------------------------------------

  it("still returns 200 when the ingestion pipeline throws (route swallows pipeline errors)", async () => {
    mockRunPipeline.mockRejectedValue(new Error("Ollama offline"));
    mockDbDocFindUnique.mockResolvedValue({ ...STUB_DOC, status: "FAILED" });

    const res  = await POST(makeRequest({}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("FAILED");
  });

  // -------------------------------------------------------------------------
  // Supported file types
  // -------------------------------------------------------------------------

  it.each([
    ["plain text", "notes.txt",   "text/plain"],
    ["markdown",   "readme.md",   "text/markdown"],
    ["CSV",        "data.csv",    "text/csv"],
    ["DOCX",       "report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ])("accepts %s files (%s)", async (_label, fileName, mimeType) => {
    const res = await POST(makeRequest({ fileName, mimeType }));
    expect(res.status).toBe(200);
  });
});
