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

// ---------------------------------------------------------------------------
// SQLite performance PRAGMAs — applied once at startup
//
// WAL mode:       Allows concurrent readers while a write is in progress.
//                 Critical for the ingestion pipeline + chat reads to not block.
//
// synchronous=NORMAL: Safe with WAL; skips costly full-fsync on every write.
//                 A crash (not power loss) cannot corrupt the DB.
//
// cache_size:     Negative value = kilobytes. -32768 = 32 MB page cache.
//                 Keeps hot pages (embeddings, chunk content) in memory.
//
// busy_timeout:   SQLite throws SQLITE_BUSY when another process holds a
//                 write lock. 5 s timeout lets short contention windows resolve.
//
// temp_store:     Stores temporary tables and indices in memory instead of
//                 disk — speeds up FTS5 queries and ORDER BY sorts.
// ---------------------------------------------------------------------------

const pragmas = [
  "PRAGMA journal_mode   = WAL;",
  "PRAGMA synchronous    = NORMAL;",
  "PRAGMA cache_size     = -64000;",
  "PRAGMA busy_timeout   = 5000;",
  "PRAGMA temp_store     = MEMORY;",
  "PRAGMA foreign_keys   = ON;"
];

for (const p of pragmas) {
  db.$executeRawUnsafe(p).catch((err) => {
    console.error("[db] Failed to apply SQLite performance PRAGMA:", err);
  });
}
