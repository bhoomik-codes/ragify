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
import { serializeVector, cosineSimilarity } from "@/lib/vector";
import pLimit from "p-limit";
import { embedBatch, isEmbeddingAvailable } from "@/lib/embeddings";
import { DEFAULT_EMBEDDING_MODEL } from "@/lib/models";
import { PDFParse } from "pdf-parse";
// `officeparser` currently pulls dependencies that break Next/SWC builds.
// Mammoth is already in this repo and works well for DOCX raw text extraction.
import mammoth from "mammoth";
import { getStorage } from "@/lib/storage";

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
 * Subdivides text into overlapping chunks for embedding.
 */
export function fallbackChunkDocument(text: string, chunkSize: number, overlap: number): DocumentChunk[] {
  const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

  const splitBySentence = (s: string) => {
    // Split on sentence boundaries while preserving punctuation on the sentence.
    // Falls back to the full string if no obvious boundary exists.
    const parts = s.split(/(?<=[.!?])\s+/);
    return parts.length > 1 ? parts : [s];
  };

  const recursiveSplit = (s: string, seps: Array<(input: string) => string[]>): string[] => {
    const normalized = s.trim();
    if (!normalized) return [];
    if (countWords(normalized) <= chunkSize) return [normalize(normalized)];
    if (seps.length === 0) {
      // Last resort: split by words (still ensures we don't exceed chunk size).
      const words = normalized.split(/\s+/).filter(Boolean);
      const out: string[] = [];
      for (let i = 0; i < words.length; i += chunkSize) {
        out.push(words.slice(i, i + chunkSize).join(" "));
      }
      return out;
    }

    const [splitter, ...rest] = seps;
    const pieces = splitter(normalized);
    if (pieces.length === 1) return recursiveSplit(pieces[0], rest);

    const out: string[] = [];
    for (const p of pieces) {
      out.push(...recursiveSplit(p, rest));
    }
    return out;
  };

  const semanticUnits = recursiveSplit(text, [
    (s) => s.split(/\n\n+/), // paragraphs
    (s) => s.split(/\n+/), // lines
    splitBySentence, // sentences
    (s) => s.split(/\s+/), // words (only reached if sentence still too large)
  ]).filter(Boolean);

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  let i = 0;
  while (i < semanticUnits.length) {
    const currentUnits: string[] = [];
    let currentWordCount = 0;

    while (i < semanticUnits.length) {
      const unit = semanticUnits[i];
      const unitWords = countWords(unit);
      if (currentUnits.length > 0 && currentWordCount + unitWords > chunkSize) break;
      currentUnits.push(unit);
      currentWordCount += unitWords;
      i++;
    }

    const content = normalize(currentUnits.join(" "));
    chunks.push({
      content,
      index: chunkIndex++,
      tokenCount: currentWordCount,
      metadata: { section: `section_${chunkIndex}` },
    });

    if (overlap <= 0 || i >= semanticUnits.length) continue;

    // For overlap, carry over trailing semantic units whose total word count ≤ overlap.
    let carryWords = 0;
    const carryUnits: string[] = [];
    for (let j = currentUnits.length - 1; j >= 0; j--) {
      const unit = currentUnits[j];
      const unitWords = countWords(unit);
      if (carryWords + unitWords > overlap) break;
      carryUnits.unshift(unit);
      carryWords += unitWords;
    }

    if (carryUnits.length > 0) {
      // Rewind `i` to re-process the carried units on the next chunk boundary.
      i -= carryUnits.length;
    }
  }

  return chunks;
}

/**
 * Semantic chunking strategy using a sliding window and cosine distance.
 */
export class SemanticChunker {
  private modelName: string;
  private maxChunkWords: number;
  private breakpointPercentile: number;
  private windowSize: number;
  private fallbackOverlap: number;

  constructor(options: {
    modelName: string;
    maxChunkWords?: number;
    breakpointPercentile?: number;
    windowSize?: number;
    fallbackOverlap?: number;
  }) {
    this.modelName = options.modelName;
    this.maxChunkWords = options.maxChunkWords || 300;
    this.breakpointPercentile = options.breakpointPercentile || 95;
    this.windowSize = options.windowSize || 2;
    this.fallbackOverlap = options.fallbackOverlap || 50;
  }

  private countWords(s: string) {
    return s.trim().split(/\s+/).filter(Boolean).length;
  }

  private splitSentences(text: string): string[] {
    const parts = text.split(/(?<=[.!?])\s+/);
    return parts.filter((p) => p.trim().length > 0);
  }

  private averageVectors(vectors: Float32Array[]): Float32Array {
    if (vectors.length === 0) return new Float32Array(1536);
    const dim = vectors[0].length;
    const avg = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      let sum = 0;
      for (const vec of vectors) sum += vec[i];
      avg[i] = sum / vectors.length;
    }
    return avg;
  }

  public async *chunkDocument(text: string): AsyncGenerator<DocumentChunk> {
    const isAvailable = await isEmbeddingAvailable(this.modelName);
    
    if (!isAvailable) {
      console.warn("[SemanticChunker] Model unavailable. Falling back to regex chunking.");
      yield* this.fallbackChunking(text);
      return;
    }

    const sentences = this.splitSentences(text);
    if (sentences.length === 0) return;

    const limit = pLimit(5);
    const BATCH_SIZE = 50;
    
    const embeddings: Float32Array[] = new Array(sentences.length);
    const embedPromises = [];
    
    for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
      embedPromises.push(
        limit(async () => {
          const batch = sentences.slice(i, i + BATCH_SIZE);
          const vectors = await embedBatch(batch, this.modelName);
          for (let j = 0; j < vectors.length; j++) {
            embeddings[i + j] = vectors[j];
          }
        })
      );
    }
    
    try {
      await Promise.all(embedPromises);
    } catch (e) {
      console.warn("[SemanticChunker] Embedding failed. Falling back.", e);
      yield* this.fallbackChunking(text);
      return;
    }

    const distances: number[] = [];
    for (let i = 0; i < sentences.length - 1; i++) {
      const leftStart = Math.max(0, i - this.windowSize + 1);
      const leftVectors = embeddings.slice(leftStart, i + 1);
      const leftAvg = this.averageVectors(leftVectors);

      const rightEnd = Math.min(sentences.length, i + 1 + this.windowSize);
      const rightVectors = embeddings.slice(i + 1, rightEnd);
      const rightAvg = this.averageVectors(rightVectors);

      const sim = cosineSimilarity(leftAvg, rightAvg);
      distances.push(1 - sim);
    }

    let threshold = 1.0;
    if (distances.length > 0) {
      const sortedDistances = [...distances].sort((a, b) => a - b);
      const pIndex = Math.floor((this.breakpointPercentile / 100) * sortedDistances.length);
      threshold = sortedDistances[Math.min(pIndex, sortedDistances.length - 1)];
    }

    let currentChunkSentences: string[] = [];
    let currentWords = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const words = this.countWords(sentence);
      
      currentChunkSentences.push(sentence);
      currentWords += words;

      const isLastSentence = i === sentences.length - 1;
      const isDistanceBreak = i < distances.length && distances[i] > threshold;
      const isTooLarge = currentWords >= this.maxChunkWords;

      if (isLastSentence || isTooLarge || (isDistanceBreak && currentWords > 50)) {
        const content = currentChunkSentences.join(" ").replace(/\s+/g, " ").trim();
        yield {
          content,
          index: chunkIndex++,
          tokenCount: currentWords,
          metadata: { section: `section_${chunkIndex}` }
        };
        
        currentChunkSentences = [];
        currentWords = 0;
        await new Promise(r => setImmediate(r));
      }
    }
  }

  private *fallbackChunking(text: string): Generator<DocumentChunk> {
    const chunks = fallbackChunkDocument(text, this.maxChunkWords, this.fallbackOverlap);
    for (const chunk of chunks) {
      yield chunk;
    }
  }
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

type EmbeddingMode = "REAL" | "MOCK";

function withEmbeddingMetadata(
  existing: unknown,
  embedding: { mode: EmbeddingMode; model: string; updatedAt: string },
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  return {
    ...base,
    embedding,
  };
}

/**
 * Executes the full ingestion pipeline: parse → chunk → embed → store.
 *
 * If Ollama is available with the embedding model, uses real vector embeddings.
 * Otherwise falls back to mock random vectors (keyword search still works).
 */
export async function runIngestionPipeline(documentId: string): Promise<void> {
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
    if (!documentRecord.storageKey) throw new Error("Document missing storageKey.");

    let textChunkRaw = "";

    const storage = getStorage();
    const fileBuffer = await storage.getObjectBuffer(documentRecord.storageKey);

    // Parse text from file based on extension (strict allowlist)
    const ext = documentRecord.name.split(".").pop()?.toLowerCase();
    if (!ext) throw new Error("Unsupported file type: missing extension.");

    try {
      if (ext === "txt" || ext === "md" || ext === "csv") {
        textChunkRaw = fileBuffer.toString("utf-8");
      } else if (ext === "pdf") {
        try {
          const parser = new PDFParse({ data: fileBuffer });
          const pdfData = await parser.getText();
          await parser.destroy();
          textChunkRaw = pdfData.text;
        } catch (pdfErr) {
          throw new Error("PDF could not be parsed — the file may be corrupt.");
        }
      } else if (ext === "docx") {
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          textChunkRaw = result.value ?? "";
        } catch (docxErr) {
          throw new Error("DOCX could not be parsed — the file may be corrupt.");
        }
      } else {
        throw new Error(`Unsupported file type: .${ext}`);
      }
    } catch (extractErr) {
      const message =
        extractErr instanceof Error ? extractErr.message : "Document could not be parsed.";
      console.error(`[PIPELINE_ERROR] Extraction failed for Document ${documentId}:`, extractErr);
      try {
        await db.document.update({
          where: { id: documentId },
          data: { status: "FAILED", errorMessage: message },
        });
      } catch (e) {
        console.error("Failed to set FAILED status with errorMessage.", e);
      }
      return;
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

    // Break text into chunks using SemanticChunker
    const chunker = new SemanticChunker({
      modelName: embeddingModelName,
      maxChunkWords: rag.chunkSize,
      fallbackOverlap: rag.chunkOverlap,
    });

    const documentChunks: DocumentChunk[] = [];
    for await (const chunk of chunker.chunkDocument(textChunkRaw)) {
      documentChunks.push(chunk);
    }

    // Free the massive raw string immediately so the Garbage Collector can reclaim memory
    textChunkRaw = "";

    const nowIso = new Date().toISOString();
    let currentEmbeddingMode: EmbeddingMode = useRealEmbeddings ? "REAL" : "MOCK";

    await db.document.update({
      where: { id: documentId },
      data: {
        metadata: withEmbeddingMetadata(documentRecord.metadata, {
          mode: currentEmbeddingMode,
          model: embeddingModelName,
          updatedAt: nowIso,
        }) as any,
      },
    });

    const BATCH_SIZE = 32;

    // Process iteratively to prevent memory explosion and Prisma connection pool starvation
    for (let i = 0; i < documentChunks.length; i += BATCH_SIZE) {
      const chunkBatch = documentChunks.slice(i, i + BATCH_SIZE);

      // 1. Create DB chunks for this batch
      const createdChunks = await Promise.all(
        chunkBatch.map((chunkData) =>
          db.chunk.create({
            data: {
              documentId,
              content: chunkData.content,
              index: chunkData.index,
              tokenCount: chunkData.tokenCount,
              metadata: chunkData.metadata as any,
            },
          }),
        ),
      );

      // 2. Generate embeddings for this batch
      let batchVectors: Float32Array[] = [];
      if (currentEmbeddingMode === "REAL") {
        try {
          batchVectors = await embedBatch(
            chunkBatch.map((c) => c.content),
            embeddingModelName
          );
        } catch (e) {
          console.warn(
            `[PIPELINE] Real embedding failed at chunk ${i}; falling back to mock embeddings:`,
            e,
          );
          currentEmbeddingMode = "MOCK";
          batchVectors = chunkBatch.map(() => mockEmbedding());

          await db.document.update({
            where: { id: documentId },
            data: {
              metadata: withEmbeddingMetadata(documentRecord.metadata, {
                mode: "MOCK",
                model: embeddingModelName,
                updatedAt: new Date().toISOString(),
              }) as any,
            },
          });
        }
      } else {
        batchVectors = chunkBatch.map(() => mockEmbedding());
      }

      // 3. Store vectors for this batch
      await Promise.all(
        createdChunks.map((recordChunk, idx) =>
          db.embedding.create({
            data: {
              chunkId: recordChunk.id,
              model: embeddingModelName,
              vector: serializeVector(batchVectors[idx]),
            },
          }),
        ),
      );
    }

    await db.document.update({
      where: { id: documentId },
      data: {
        status: "READY",
        chunkCount: documentChunks.length,
      }
    });

  } catch(error) {
     console.error(`[PIPELINE_ERROR] Document ${documentId}:`, error);
     try {
       await db.document.update({
         where: { id: documentId },
         data: {
           status: "FAILED",
           errorMessage: error instanceof Error ? error.message : "Pipeline failed.",
         }
       });
     } catch (e) {
       console.error("Failed to set FAILED status.", e);
     }
  } finally {}
}
