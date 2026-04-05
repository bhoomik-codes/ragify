/**
 * lib/validators.ts
 *
 * Zod schemas for every API request body and every Json DB field.
 * Import from here everywhere — never define Zod schemas inline.
 *
 * Depends on: lib/types.ts (enums + interface types)
 *
 * ⚠ This file must contain ZERO type declarations.
 *   All input types are hand-written in lib/types.ts (single source of truth).
 */

import { z } from "zod";
import {
  Provider,
  type MessageSource,
  type DocumentMetadata,
  type ChunkMetadata,
} from "./types";

// ---------------------------------------------------------------------------
// Re-usable primitives
// ---------------------------------------------------------------------------

const cuid = z.string().cuid();
const isoDate = z.string().datetime({ offset: true });
const nonEmptyString = z.string().min(1, "Required");

// ---------------------------------------------------------------------------
// Json-field validators
// (parallel to the interfaces in lib/types.ts)
// ---------------------------------------------------------------------------

/**
 * Validates a single MessageSource entry before DB write.
 * Schema is constrained to the MessageSource interface in lib/types.ts.
 */
export const messageSouceItemSchema: z.ZodType<MessageSource> = z.object({
  chunkId : z.string().cuid(),
  docName : nonEmptyString,
  excerpt : nonEmptyString,
  score   : z.number().min(0).max(1),
});

/** Validates `Message.sources` (Json array). */
export const messageSourcesSchema = z.array(messageSouceItemSchema);

/**
 * Validates `Document.metadata` (Json object).
 * Schema is constrained to the DocumentMetadata interface in lib/types.ts.
 */
export const documentMetadataSchema: z.ZodType<DocumentMetadata> = z
  .object({
    mimeType  : z.string().optional(),
    pageCount : z.number().int().nonnegative().optional(),
    language  : z.string().optional(),
    sha256    : z.string().optional(),
  })
  .catchall(z.unknown());

/**
 * Validates `Chunk.metadata` (Json object).
 * Schema is constrained to the ChunkMetadata interface in lib/types.ts.
 */
export const chunkMetadataSchema: z.ZodType<ChunkMetadata> = z
  .object({
    pageNumber : z.number().int().nonnegative().optional(),
    section    : z.string().optional(),
    heading    : z.string().optional(),
  })
  .catchall(z.unknown());

// ---------------------------------------------------------------------------
// Provider key format validators
// ---------------------------------------------------------------------------

/**
 * Maps each Provider to a regex that roughly validates the key format
 * so we can reject obviously wrong keys before encrypting.
 */
const PROVIDER_KEY_PATTERNS: Record<Provider, RegExp> = {
  [Provider.ANTHROPIC]: /^sk-ant-[A-Za-z0-9\-_]{20,}$/,
  [Provider.OPENAI]   : /^sk-[A-Za-z0-9]{20,}$/,
  [Provider.GOOGLE]   : /^[A-Za-z0-9\-_]{20,}$/,    // Google AI Studio keys vary
  [Provider.MISTRAL]  : /^[A-Za-z0-9]{32,}$/,
};

// ---------------------------------------------------------------------------
// UserApiKey
// ---------------------------------------------------------------------------

/** Validates the request body when a user adds/updates a provider API key. */
export const createUserApiKeySchema = z
  .object({
    provider: z.nativeEnum(Provider),
    key     : nonEmptyString,
  })
  .superRefine(({ provider, key }, ctx) => {
    const pattern = PROVIDER_KEY_PATTERNS[provider];
    if (!pattern.test(key)) {
      ctx.addIssue({
        code   : z.ZodIssueCode.custom,
        path   : ["key"],
        message: `Key does not match expected format for provider ${provider}.`,
      });
    }
  });


// ---------------------------------------------------------------------------
// ApiKey (platform keys — SHA-256 hashed)
// ---------------------------------------------------------------------------

export const createApiKeySchema = z.object({
  name: nonEmptyString.max(64, "Name must be ≤ 64 characters"),
});


// ---------------------------------------------------------------------------
// ShareLink
// ---------------------------------------------------------------------------

export const createShareLinkSchema = z.object({
  ragId    : cuid,
  password : z.string().min(8, "Password must be at least 8 characters").optional(),
  expiresAt: isoDate.optional(),
});


// ---------------------------------------------------------------------------
// Rag CRUD
// ---------------------------------------------------------------------------

const ragBaseSchema = z.object({
  name           : nonEmptyString.max(100),
  description    : z.string().max(500).optional(),
  emoji          : z.string().max(8).optional(),
  tags           : z.array(z.string().max(32)).max(10).optional(),

  // Model config
  provider       : z.nativeEnum(Provider),
  model          : nonEmptyString.max(100),
  temperature    : z.number().min(0).max(2).optional(),
  maxTokens      : z.number().int().min(1).max(32_000).optional(),
  topP           : z.number().min(0).max(1).optional(),
  systemPrompt   : z.string().max(4000).optional(),
  strictMode     : z.boolean().optional(),

  // Retrieval
  chunkSize      : z.number().int().min(64).max(8192).optional(),
  chunkOverlap   : z.number().int().min(0).max(2048).optional(),
  topK           : z.number().int().min(1).max(50).optional(),
  threshold      : z.number().min(0).max(1).optional(),
  enableReranking: z.boolean().optional(),
  embeddingModel : z.string().max(100).optional(),

  // Safety
  maxTurns       : z.number().int().min(1).max(100).optional(),
  rateLimit      : z.number().int().min(1).max(1000).optional(),
  filterLevel    : z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  citationMode   : z.enum(["INLINE", "FOOTNOTE", "NONE"]).optional(),
});

export const createRagSchema = ragBaseSchema;

export const updateRagSchema = ragBaseSchema.partial();

// ---------------------------------------------------------------------------
// Document upload
// ---------------------------------------------------------------------------

export const uploadDocumentSchema = z.object({
  ragId   : cuid,
  name    : nonEmptyString.max(255),
  size    : z.number().int().min(1).max(100 * 1024 * 1024), // max 100 MB
  type    : nonEmptyString.max(100),
  metadata: documentMetadataSchema.optional(),
});


// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export const createConversationSchema = z.object({
  ragId: cuid,
  title: z.string().max(200).optional(),
});


export const updateConversationSchema = z.object({
  title: nonEmptyString.max(200),
});


// ---------------------------------------------------------------------------
// Message / chat turn
// ---------------------------------------------------------------------------

export const sendMessageSchema = z.object({
  conversationId: cuid,
  content       : nonEmptyString.max(32_000),
});


/**
 * Shape written to `Message.sources` before DB insert.
 * Always validate with this before persisting.
 */
export const persistMessageSchema = z.object({
  conversationId : cuid,
  role           : z.enum(["USER", "ASSISTANT"]),
  content        : nonEmptyString,
  sources        : messageSourcesSchema.optional(),
  tokenUsage     : z.number().int().nonnegative().optional(),
  responseTimeMs : z.number().int().nonnegative().optional(),
});


// ---------------------------------------------------------------------------
// Wizard (6-step RAG creation)
// Steps validated individually so the UI can validate per-step.
// ---------------------------------------------------------------------------

export const wizardStep1Schema = z.object({
  name       : nonEmptyString.max(100),
  description: z.string().max(500),
  emoji      : z.string().max(8),
  tags       : z.array(z.string().max(32)).max(10),
});

export const wizardStep2Schema = z.object({
  provider    : z.nativeEnum(Provider),
  model       : nonEmptyString.max(100),
  temperature : z.number().min(0).max(2),
  maxTokens   : z.number().int().min(1).max(32_000),
  topP        : z.number().min(0).max(1),
  systemPrompt: z.string().max(4000),
  strictMode  : z.boolean(),
});

export const wizardStep3Schema = z.object({
  chunkSize       : z.number().int().min(64).max(8192),
  chunkOverlap    : z.number().int().min(0).max(2048),
  topK            : z.number().int().min(1).max(50),
  threshold       : z.number().min(0).max(1),
  enableReranking : z.boolean(),
  embeddingModel  : nonEmptyString.max(100),
});

export const wizardStep4Schema = z.object({
  maxTurns    : z.number().int().min(1).max(100),
  rateLimit   : z.number().int().min(1).max(1000),
  filterLevel : z.enum(["LOW", "MEDIUM", "HIGH"]),
  citationMode: z.enum(["INLINE", "FOOTNOTE", "NONE"]),
});

export const wizardStep5Schema = z.object({
  documentIds: z.array(cuid).min(1, "Upload at least one document"),
});

export const wizardStep6Schema = z.object({});

/** Combined wizard form — used for final submission validation. */
export const wizardFormDataSchema = wizardStep1Schema
  .merge(wizardStep2Schema)
  .merge(wizardStep3Schema)
  .merge(wizardStep4Schema)
  .merge(wizardStep5Schema)
  .merge(wizardStep6Schema);


// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  name : z.string().min(1).max(100).optional(),
  theme: z.enum(["light", "dark"]).optional(),
});


export const changePasswordSchema = z
  .object({
    currentPassword: nonEmptyString,
    newPassword    : z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path   : ["confirmPassword"],
    message: "Passwords do not match",
  });

