/**
 * lib/pipeline.ts
 *
 * Simulates Document Pipeline functions formatting native ingestion tasks (e.g., text parsing,
 * chunk mapping, and vector embeddings routing directly mapped from Document models).
 * This stub acts as the Phase 4 template for the real implementation embedding workers.
 */

import type { ChunkMetadata } from "./types";
import { db } from "@/lib/db";
import { serializeVector } from "@/lib/vector";
import * as fs from "node:fs";

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
  chunkId: string; // Dummy vector DB IDs natively mapped inside testing output
  vector: number[];
}

/**
 * Mocks parsing raw bytes (PDF, TXT, DOCX) extracting formatted string nodes
 */
export async function extractText(fileBuffer: ArrayBuffer, mimeType: string): Promise<ExtractedDocument> {
  // Simulate heavy processing mapping natively 
  await new Promise(r => setTimeout(r, Number(process.env.MOCK_PIPELINE_DELAY_MS || 500)));

  return {
    text: "This is a placeholder extracted document strictly modeling testing capabilities without true blob allocations.",
    metadata: { mimeType, status: "extracted" },
  };
}

/**
 * Subdivides giant text blocks cleanly into cleanly manageable chunks
 */
export function chunkDocument(text: string, chunkSize: number, overlap: number): DocumentChunk[] {
  // Simple token counting map directly mimicking tiktoken lengths for simple English
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
      metadata: { section: `mock_section_${chunkId}` }
    });
    currentIndex += (chunkSize - overlap);
  }
  
  return chunks;
}

/**
 * Returns standard Array float vectors strictly mocking Open AI format 
 */
export async function embedChunks(chunks: DocumentChunk[], modelName: string): Promise<ChunkEmbedding[]> {
  // Simulate API vector wait strictly allowing integrations mapped securely natively 
  await new Promise(r => setTimeout(r, Number(process.env.MOCK_PIPELINE_DELAY_MS || 500)));
  
  return chunks.map(chunk => ({
    chunkId: `mock_vector_db_id_${chunk.index}`,
    vector: new Array(1536).fill(0).map(() => Math.random() * 2 - 1),
  }));
}

/**
 * Executes full asynchronous chunking -> embedding mapping saving completely cleanly
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

    if (!documentRecord) throw new Error("Document vanished before processing natively.");

    let textChunkRaw = "";

    // Simple extension router mocking capabilities smoothly
    if (documentRecord.name.endsWith(".txt") || documentRecord.name.endsWith(".md")) {
       textChunkRaw = fs.readFileSync(filePath, "utf-8");
    } else {
       const buffer = fs.readFileSync(filePath);
       const obj = await extractText(buffer.buffer as ArrayBuffer, documentRecord.type);
       textChunkRaw = obj.text;
    }

    const { rag } = documentRecord;
    
    // Break into nodes mapped natively referencing RAG configuration
    const documentChunks = chunkDocument(textChunkRaw, rag.chunkSize, rag.chunkOverlap);

    for (const chunkData of documentChunks) {
      const mockVectorArray = await embedChunks([chunkData], rag.embeddingModel);
      const vectorResponse = mockVectorArray[0];

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
          model: rag.embeddingModel,
          vector: serializeVector(new Float32Array(vectorResponse.vector))
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
       console.error("Failed to commit FAILED status.", e);
     }
  } finally {
     // Clean up local temp file mappings eagerly preventing OS locking
     try {
       if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
       }
     } catch (e) {
       console.error("Failed to clear temporary upload file", filePath);
     }
  }
}

