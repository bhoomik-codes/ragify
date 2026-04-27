-- Add a human-readable failure message for ingestion errors.
ALTER TABLE "Document" ADD COLUMN "errorMessage" TEXT;

