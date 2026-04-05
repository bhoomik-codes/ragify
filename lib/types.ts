/**
 * lib/types.ts
 *
 * Single source of truth for ALL TypeScript types and enums.
 * Every other file MUST import from here — never redefine inline.
 *
 * Rule: no `any` type anywhere. Narrow with `unknown` where needed.
 * Rule: no z.infer<> here — input types are hand-written below.
 */

import type * as React from 'react';

// ---------------------------------------------------------------------------
// Enums (mirror Prisma schema — kept in sync manually)
// ---------------------------------------------------------------------------

/** LLM provider. Mirrors Prisma `Provider` enum. */
export enum Provider {
  ANTHROPIC = "ANTHROPIC",
  OPENAI    = "OPENAI",
  GOOGLE    = "GOOGLE",
  MISTRAL   = "MISTRAL",
}

/** Lifecycle state of a RAG pipeline. Mirrors Prisma `RagStatus`. */
export enum RagStatus {
  PENDING  = "PENDING",
  INDEXING = "INDEXING",
  READY    = "READY",
  ERROR    = "ERROR",
}

/** Lifecycle state of an uploaded document. Mirrors Prisma `DocumentStatus`. */
export enum DocumentStatus {
  QUEUED     = "QUEUED",
  PROCESSING = "PROCESSING",
  READY      = "READY",
  FAILED     = "FAILED",
}

/** Role of a chat message. Mirrors Prisma `MessageRole`. */
export enum MessageRole {
  USER      = "USER",
  ASSISTANT = "ASSISTANT",
}

// ---------------------------------------------------------------------------
// Json-field TypeScript types
// (every Json column in schema.prisma has an explicit type here)
// ---------------------------------------------------------------------------

/**
 * One retrieved source citation attached to an ASSISTANT message.
 * Stored as `Message.sources` (Json? → MessageSource[] | null).
 */
export interface MessageSource {
  chunkId : string;
  docName : string;
  excerpt : string;
  score   : number; // cosine similarity, 0–1
}

/**
 * Optional per-document metadata stored in `Document.metadata`.
 * Extensible — add fields without a migration.
 */
export interface DocumentMetadata {
  mimeType?   : string;
  pageCount?  : number;
  language?   : string;
  sha256?     : string; // content hash for dedup
  [key: string]: unknown; // allow additional ad-hoc fields
}

/**
 * Optional per-chunk metadata stored in `Chunk.metadata`.
 */
export interface ChunkMetadata {
  pageNumber? : number;
  section?    : string;
  heading?    : string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// API response shapes
// (raw Prisma rows MUST be mapped to these before returning from API routes)
// ---------------------------------------------------------------------------

/** Public representation of a User (never includes password hash). */
export interface UserDto {
  id             : string;
  email          : string;
  name           : string | null;
  image          : string | null;
  onboardingDone : boolean;
  theme          : string;
  createdAt      : string; // ISO-8601
}

/** Public representation of a RAG pipeline. */
export interface RagDto {
  id             : string;
  userId         : string;
  name           : string;
  description    : string | null;
  emoji          : string | null;
  tags           : string[]; // JSON array stored in DB, deserialized in app layer
  provider       : Provider;
  model          : string;
  temperature    : number;
  maxTokens      : number;
  topP           : number;
  systemPrompt   : string | null;
  strictMode     : boolean;
  chunkSize      : number;
  chunkOverlap   : number;
  topK           : number;
  threshold      : number;
  enableReranking: boolean;
  embeddingModel : string;
  maxTurns       : number;
  rateLimit      : number;
  filterLevel    : string;
  citationMode   : string;
  status         : RagStatus;
  createdAt      : string;
  updatedAt      : string;
}

/** Public representation of a Document. */
export interface DocumentDto {
  id         : string;
  ragId      : string;
  name       : string;
  size       : number;
  type       : string;
  status     : DocumentStatus;
  chunkCount : number;
  metadata   : DocumentMetadata | null;
  createdAt  : string;
}

/** Public representation of a Chunk (used in admin/debug views). */
export interface ChunkDto {
  id         : string;
  documentId : string;
  content    : string;
  index      : number;
  tokenCount : number;
  metadata   : ChunkMetadata | null;
  createdAt  : string;
}

/** Public representation of a Conversation. */
export interface ConversationDto {
  id        : string;
  ragId     : string;
  userId    : string;
  title     : string | null;
  createdAt : string;
  updatedAt : string;
}

/** Public representation of a Message. */
export interface MessageDto {
  id             : string;
  conversationId : string;
  role           : MessageRole;
  content        : string;
  sources        : MessageSource[] | null;
  tokenUsage     : number;
  responseTimeMs : number;
  createdAt      : string;
}

/**
 * Platform API key DTO.
 * `keyPrefix` is shown in the UI; `keyHash` never leaves the server.
 */
export interface ApiKeyDto {
  id         : string;
  userId     : string;
  name       : string;
  keyPrefix  : string;
  lastUsedAt : string | null;
  createdAt  : string;
}

/**
 * User provider API key DTO.
 * The decrypted key is NEVER returned — only existence metadata.
 */
export interface UserApiKeyDto {
  id        : string;
  userId    : string;
  provider  : Provider;
  createdAt : string;
}

/** Public share link DTO (passwordHash excluded). */
export interface ShareLinkDto {
  id         : string;
  ragId      : string;
  token      : string;
  expiresAt  : string | null;
  clickCount : number;
  createdAt  : string;
  hasPassword: boolean;
}

// ---------------------------------------------------------------------------
// Wizard form data (6-step RAG creation wizard)
// ---------------------------------------------------------------------------

/** Step 1 — Basic info */
export interface WizardStep1 {
  name       : string;
  description: string;
  emoji      : string;
  tags       : string[];
}

/** Step 2 — Model selection */
export interface WizardStep2 {
  provider    : Provider;
  model       : string;
  temperature : number;
  maxTokens   : number;
  topP        : number;
  systemPrompt: string;
  strictMode  : boolean;
}

/** Step 3 — Retrieval settings */
export interface WizardStep3 {
  chunkSize       : number;
  chunkOverlap    : number;
  topK            : number;
  threshold       : number;
  enableReranking : boolean;
  embeddingModel  : string;
}

/** Step 4 — Safety & limits */
export interface WizardStep4 {
  maxTurns    : number;
  rateLimit   : number;
  filterLevel : string;
  citationMode: string;
}

/** Step 5 — Document upload (references, not File objects, for serialisation) */
export interface WizardStep5 {
  documentIds: string[]; // IDs of already-uploaded Documents
}

/** Step 6 — Review & confirm (no extra fields — just a confirmation gate). */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WizardStep6 {}

/** Complete wizard form state — intersection of all six steps. */
export type WizardFormData = WizardStep1 &
  WizardStep2 &
  WizardStep3 &
  WizardStep4 &
  WizardStep5 &
  WizardStep6;

// ---------------------------------------------------------------------------
// API Input types (request body shapes — hand-written from validators.ts)
// validators.ts enforces these at runtime via Zod. types.ts owns the TS type.
// ---------------------------------------------------------------------------

/** Validated array of MessageSource objects written to Message.sources. */
export type MessageSourceInput = MessageSource[];

/** Validated DocumentMetadata written to Document.metadata. */
export type DocumentMetadataInput = DocumentMetadata;

/** Validated ChunkMetadata written to Chunk.metadata. */
export type ChunkMetadataInput = ChunkMetadata;

/** Body for POST /api/user/api-keys/provider */
export interface CreateUserApiKeyInput {
  provider: Provider;
  key     : string;
}

/** Body for POST /api/user/api-keys (platform keys) */
export interface CreateApiKeyInput {
  name: string;
}

/** Body for POST /api/rags/[ragId]/share */
export interface CreateShareLinkInput {
  ragId     : string;
  password? : string;
  expiresAt?: string; // ISO-8601
}

/** Body for POST /api/rags */
export interface CreateRagInput {
  name           : string;
  description?   : string;
  emoji?         : string;
  tags?          : string[];
  // Model config
  provider       : Provider;
  model          : string;
  temperature?   : number;
  maxTokens?     : number;
  topP?          : number;
  systemPrompt?  : string;
  strictMode?    : boolean;
  // Retrieval
  chunkSize?     : number;
  chunkOverlap?  : number;
  topK?          : number;
  threshold?     : number;
  enableReranking?: boolean;
  embeddingModel?: string;
  // Safety
  maxTurns?      : number;
  rateLimit?     : number;
  filterLevel?   : "LOW" | "MEDIUM" | "HIGH";
  citationMode?  : "INLINE" | "FOOTNOTE" | "NONE";
}

/** Body for PATCH /api/rags/[ragId] — all fields optional */
export type UpdateRagInput = Partial<CreateRagInput>;

/** Body for POST /api/rags/[ragId]/documents */
export interface UploadDocumentInput {
  ragId    : string;
  name     : string;
  size     : number; // bytes, max 100 MB
  type     : string; // MIME type
  metadata?: DocumentMetadata;
}

/** Body for POST /api/rags/[ragId]/conversations */
export interface CreateConversationInput {
  ragId : string;
  title?: string;
}

/** Body for PATCH /api/conversations/[id] */
export interface UpdateConversationInput {
  title: string;
}

/** Body for POST /api/conversations/[id]/messages */
export interface SendMessageInput {
  conversationId: string;
  content       : string;
}

/** Internal — shape written to DB when persisting a completed message turn. */
export interface PersistMessageInput {
  conversationId : string;
  role           : "USER" | "ASSISTANT";
  content        : string;
  sources?       : MessageSource[];
  tokenUsage?    : number;
  responseTimeMs?: number;
}

/**
 * Final submission payload of the 6-step RAG creation wizard.
 * Equivalent to WizardFormData but validated at runtime by wizardFormDataSchema.
 */
export type WizardFormDataInput = WizardFormData;

/** Body for PATCH /api/user/profile */
export interface UpdateProfileInput {
  name? : string;
  theme?: "light" | "dark";
}

/** Body for POST /api/user/change-password */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword    : string;
  confirmPassword: string;
}

// ---------------------------------------------------------------------------
// Misc utility types
// ---------------------------------------------------------------------------

/** Generic paginated list wrapper. */
export interface PaginatedList<T> {
  items   : T[];
  total   : number;
  page    : number;
  pageSize: number;
}

/** Standard API error shape. */
export interface ApiError {
  code   : string;
  message: string;
  details: unknown;
}

// ---------------------------------------------------------------------------
// UI Component Props
// ---------------------------------------------------------------------------

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// ---------------------------------------------------------------------------
// Shared Component Props
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  ctaHref?: string;
}

export interface SkeletonCardProps {
  className?: string;
}

export interface StatusBadgeProps {
  status: RagStatus | DocumentStatus;
  className?: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export interface OnboardingTourProps {
  onboardingDone: boolean;
}

export interface AppShellProps {
  children: React.ReactNode;
  initialTheme?: 'light' | 'dark';
  user?: UserDto;
}
