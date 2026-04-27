/**
 * scripts/migrate-storage.mjs
 *
 * One-time helper to (re)upload document binaries into the configured storage backend.
 *
 * NOTE: This repo currently does not persist original binaries for already-ingested documents,
 * so this script is intentionally a scaffold. When object storage is enabled, uploads will
 * save `Document.storageKey` and pipeline will ingest from storage directly.
 *
 * Future extension:
 * - If you later store original uploads on local disk, iterate those files and call storage.putObject().
 * - Update `Document.storageProvider` + `Document.storageKey` accordingly.
 */

console.log(
  "migrate-storage: scaffold. Enable STORAGE_PROVIDER and re-upload documents to populate storageKey.",
);

