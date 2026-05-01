/**
 * lib/db.ts
 *
 * Prisma Client singleton for the application.
 *
 * Prisma 7 requires a driver adapter instead of the old datasource url
 * in the schema. For SQLite dev we use @prisma/adapter-better-sqlite3.
 * In production, swap the adapter for @prisma/adapter-pg (Postgres).
 *
 * Usage:
 *   import { db } from "@/lib/db";
 *   const users = await db.user.findMany();
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// ---------------------------------------------------------------------------
// Adapter factory
//
// PrismaBetterSqlite3 is a factory (AdapterFactory) that takes a config
// object with a `url` field (same format as DATABASE_URL: "file:./...").
// It handles the "file:" prefix stripping and sqlite3 instantiation internally.
// ---------------------------------------------------------------------------

function createAdapter(): PrismaBetterSqlite3 {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  return new PrismaBetterSqlite3({ url });
}

// ---------------------------------------------------------------------------
// Singleton — shared across hot reloads in development
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Enable Write-Ahead Logging (WAL) for better concurrent read/write performance
db.$executeRawUnsafe('PRAGMA journal_mode = WAL;').catch(console.error);
