/**
 * lib/pipeline.ts
 *
 * Document ingestion pipeline: parse → chunk → embed → store.
 *
 * Embedding is done via Ollama (Qwen3-Embedding-8B by default).
 * Falls back to mock random vectors if Ollama is unreachable.
 */

import type { ChunkMetadata } from "./types";
import { db } from "@/lib/db";
import { serializeVector } from "@/lib/vector";
import { embedText, isEmbeddingAvailable, DEFAULT_EMBEDDING_MODEL } from "@/lib/embeddings";
import * as fs from "node:fs";
const pdfParse = require("pdf-parse");
import { parseOffice } from "officeparser";

export interface ExtractedDocument {
  text: string;
  metadata: Record<string, string>;
}

export interface DocumentChunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata: ChunkMetadata;
}

export interface ChunkEmbedding {
  chunkId: string;
  vector: number[];
}

/**
 * Parses raw file bytes into text.
 * Currently handles .txt/.md natively; PDF/DOCX returns placeholder.
 */
export async function extractText(fileBuffer: ArrayBuffer, mimeType: string): Promise<ExtractedDocument> {
  await new Promise(r => setTimeout(r, Number(process.env.MOCK_PIPELINE_DELAY_MS || 100)));

  return {
    text: "This is a placeholder extracted document. Replace with real PDF/DOCX parsing (e.g., pdf-parse).",
    metadata: { mimeType, status: "extracted" },
  };
}

/**
 * Subdivides text into overlapping chunks for embedding.
 */
export function chunkDocument(text: string, chunkSize: number, overlap: number): DocumentChunk[] {
  const tokens = text.split(" ");
  const chunks: DocumentChunk[] = [];

  let currentIndex = 0;
  let chunkId = 0;

  while (currentIndex < tokens.length) {
    const subset = tokens.slice(currentIndex, currentIndex + chunkSize);
    chunks.push({
      content: subset.join(" "),
      index: chunkId++,
      tokenCount: subset.length,
      metadata: { section: `section_${chunkId}` }
    });
    currentIndex += (chunkSize - overlap);
  }

  return chunks;
}

/**
 * Generates a mock random vector (fallback when Ollama is not available).
 */
function mockEmbedding(dimension: number = 1536): Float32Array {
  const vec = new Float32Array(dimension);
  for (let i = 0; i < dimension; i++) {
    vec[i] = Math.random() * 2 - 1;
  }
  return vec;
}

/**
 * Executes the full ingestion pipeline: parse → chunk → embed → store.
 *
 * If Ollama is available with the embedding model, uses real vector embeddings.
 * Otherwise falls back to mock random vectors (keyword search still works).
 */
export async function runIngestionPipeline(documentId: string, filePath: string): Promise<void> {
  try {
    await db.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" }
    });

    const documentRecord = await db.document.findUnique({
      where: { id: documentId },
      include: { rag: true }
    });

    if (!documentRecord) throw new Error("Document not found.");

    let textChunkRaw = "";

    // Parse text from file based on extension (strict allowlist)
    const ext = documentRecord.name.split(".").pop()?.toLowerCase();
    if (!ext) throw new Error("Unsupported file type: missing extension.");

    if (ext === "txt" || ext === "md" || ext === "csv") {
      textChunkRaw = fs.readFileSync(filePath, "utf-8");
    } else if (ext === "pdf") {
      const buffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buffer);
      textChunkRaw = pdfData.text;
    } else if (ext === "docx") {
      textChunkRaw = (await parseOffice(filePath)) as unknown as string;
    } else {
      throw new Error(`Unsupported file type: .${ext}`);
    }

    const { rag } = documentRecord;

    // Determine which embedding model to use
    const embeddingModelName = rag.embeddingModel || DEFAULT_EMBEDDING_MODEL;

    // Check if Ollama + embedding model is available
    const useRealEmbeddings = await isEmbeddingAvailable(embeddingModelName);
    if (useRealEmbeddings) {
      console.log(`[PIPELINE] Using real embeddings: ${embeddingModelName}`);
    } else {
      console.warn(`[PIPELINE] Ollama model "${embeddingModelName}" not available. Using mock embeddings.`);
    }

    // Break text into chunks
    const documentChunks = chunkDocument(textChunkRaw, rag.chunkSize, rag.chunkOverlap);

    for (const chunkData of documentChunks) {
      // Generate embedding (real or mock)
      let vector: Float32Array;
      if (useRealEmbeddings) {
        vector = await embedText(chunkData.content, embeddingModelName);
      } else {
        vector = mockEmbedding();
      }

      const recordChunk = await db.chunk.create({
        data: {
           documentId,
           content: chunkData.content,
           index: chunkData.index,
           tokenCount: chunkData.tokenCount,
           metadata: chunkData.metadata as any
        }
      });

      await db.embedding.create({
        data: {
          chunkId: recordChunk.id,
          model: embeddingModelName,
          vector: serializeVector(vector)
        }
      });
    }

    await db.document.update({
      where: { id: documentId },
      data: {
        status: "READY",
        chunkCount: documentChunks.length
      }
    });

  } catch(error) {
     console.error(`[PIPELINE_ERROR] Document ${documentId}:`, error);
     try {
       await db.document.update({
         where: { id: documentId },
         data: { status: "FAILED" }
       });
     } catch (e) {
       console.error("Failed to set FAILED status.", e);
     }
  } finally {
     // Clean up temp file
     try {
       if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
     } catch (e) {
       // Cleanup failures should never mask the original pipeline outcome.
       console.error("Failed to remove temp file", filePath, e);
     }
  }
}
