/**
 * lib/crypto.ts
 *
 * Server-side cryptography utilities.
 *
 * ⚠  NEVER import this file from a client component or pages/_app.
 *    The "server-only" import below causes Next.js to throw at build
 *    time if you try.
 *
 * Environment variables required:
 *   ENCRYPTION_KEY — exactly 64 hex characters (32 bytes), used for
 *                    AES-256-GCM. Generate with:
 *                    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES   = 12; // 96-bit IV — standard for GCM
const TAG_BYTES  = 16; // 128-bit auth tag (GCM default)

/**
 * Reads and validates ENCRYPTION_KEY from the environment.
 * Throws at call-time (not module-load-time) so tests that don't need
 * encryption can still import the module safely.
 */
function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "[crypto] ENCRYPTION_KEY environment variable is not set. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "[crypto] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
      `Got ${raw.length} characters.`,
    );
  }
  return Buffer.from(raw, "hex");
}

// ---------------------------------------------------------------------------
// 1. encryptKey
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext string with AES-256-GCM.
 *
 * @param plaintext - The raw string to encrypt (e.g. an LLM API key).
 * @returns An object containing:
 *   - `ciphertext`: hex-encoded `<tag><ciphertext>` concatenation
 *   - `iv`: hex-encoded 12-byte random IV
 *
 * Both values must be stored together and passed to `decryptKey`.
 */
export function encryptKey(
  plaintext: string,
): { ciphertext: string; iv: string } {
  const key = getEncryptionKey();
  const ivBuffer = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALGORITHM, key, ivBuffer);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  // Prepend auth tag so decryptKey can verify integrity without an extra field.
  const combined = Buffer.concat([authTag, encrypted]);

  return {
    ciphertext: combined.toString("hex"),
    iv: ivBuffer.toString("hex"),
  };
}

// ---------------------------------------------------------------------------
// 2. decryptKey
// ---------------------------------------------------------------------------

/**
 * Returns the decrypted plaintext key for use in the current request only.
 * The caller MUST NOT log, store, or include this value in any response.
 * Use it for the API call and let it go out of scope immediately.
 *
 * @param ciphertext - Hex-encoded `<tag><ciphertext>` as returned by encryptKey.
 * @param iv - Hex-encoded 12-byte IV as returned by encryptKey.
 * @returns The original plaintext string.
 */
export function decryptKey(ciphertext: string, iv: string): string {
  const key = getEncryptionKey();
  const combined  = Buffer.from(ciphertext, "hex");
  const ivBuffer  = Buffer.from(iv, "hex");

  if (combined.length < TAG_BYTES) {
    throw new Error("[crypto] ciphertext is too short — likely corrupted.");
  }

  const authTag   = combined.subarray(0, TAG_BYTES);
  const encrypted = combined.subarray(TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  // ⚠ DO NOT log `decrypted` — it contains a raw secret key.
  return decrypted.toString("utf8");
}

// ---------------------------------------------------------------------------
// 3. generateApiKey
// ---------------------------------------------------------------------------

const API_KEY_PREFIX   = "rag_" as const;
const API_KEY_RAND_HEX = 32; // 32 random bytes → 64 hex chars → total 68 chars

/**
 * Returns the full plaintext key ONCE for display to the user.
 * The caller MUST NOT store `full` — store only `hash` and `prefix`.
 * After this function returns, `full` should never be persisted anywhere.
 *
 * @returns
 *   - `full`:   The complete key to show the user exactly once, e.g. `rag_<64-hex>`.
 *   - `hash`:   bcrypt hash of `full` — store this in `ApiKey.keyHash`.
 *   - `prefix`: First 12 chars of `full` (e.g. `rag_1a2b3c4d`) — store in
 *               `ApiKey.keyPrefix` for display in the UI.
 */
export async function generateApiKey(): Promise<{
  full  : string;
  hash  : string;
  prefix: string;
}> {
  const full   = API_KEY_PREFIX + randomBytes(API_KEY_RAND_HEX).toString("hex");
  const hash   = await bcrypt.hash(full, 12);
  const prefix = full.slice(0, 12); // "rag_" + 8 hex chars

  return { full, hash, prefix };
}

// ---------------------------------------------------------------------------
// 4. verifyApiKey
// ---------------------------------------------------------------------------

/**
 * Verifies whether an incoming raw key matches the stored bcrypt hash.
 *
 * @param incoming    - The raw key provided by the caller (from Authorization header).
 * @param storedHash  - The bcrypt hash stored in `ApiKey.keyHash`.
 * @returns `true` if the key is valid, `false` otherwise.
 */
export async function verifyApiKey(
  incoming   : string,
  storedHash : string,
): Promise<boolean> {
  return bcrypt.compare(incoming, storedHash);
}

// ---------------------------------------------------------------------------
// 5. generateShareToken  (bonus utility — used by ShareLink creation)
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically random URL-safe share token.
 * 24 random bytes → 48 hex chars.
 */
export function generateShareToken(): string {
  return randomBytes(24).toString("hex");
}

// ---------------------------------------------------------------------------
// 6. hashApiKey  (SHA-256 — fast, for look-up before bcrypt compare)
// ---------------------------------------------------------------------------

/**
 * Returns a SHA-256 hex digest of the given key.
 * Useful for a fast DB lookup index before the slower bcrypt compare.
 *
 * Note: This is NOT the stored hash — it's just for O(1) record lookup.
 * The authoritative verification is `verifyApiKey` (bcrypt).
 */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
