-- Add storage fields so documents can be stored in S3-compatible backends.
ALTER TABLE "Document" ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "Document" ADD COLUMN "storageKey" TEXT;

