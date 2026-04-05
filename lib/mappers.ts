import type { Rag } from "@prisma/client";
import { Provider, RagStatus, type RagDto } from "./types";

/**
 * Ensures Prisma `Rag` objects are cleanly mapped to the public `RagDto` schema.
 * This prevents raw Database objects and extra fields from accidentally leaking to the frontend.
 */
export function mapRagToDto(rag: Rag): RagDto {
  return {
    id: rag.id,
    userId: rag.userId,
    name: rag.name,
    description: rag.description,
    emoji: rag.emoji,
    tags: rag.tags as string[], // Prisma Json is mapped directly
    provider: rag.provider as Provider,
    model: rag.model,
    temperature: rag.temperature,
    maxTokens: rag.maxTokens,
    topP: rag.topP,
    systemPrompt: rag.systemPrompt,
    strictMode: rag.strictMode,
    chunkSize: rag.chunkSize,
    chunkOverlap: rag.chunkOverlap,
    topK: rag.topK,
    threshold: rag.threshold,
    enableReranking: rag.enableReranking,
    embeddingModel: rag.embeddingModel,
    maxTurns: rag.maxTurns,
    rateLimit: rag.rateLimit,
    filterLevel: rag.filterLevel,
    citationMode: rag.citationMode,
    status: rag.status as RagStatus,
    createdAt: rag.createdAt.toISOString(),
    updatedAt: rag.updatedAt.toISOString(),
  };
}
