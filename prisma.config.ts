/**
 * prisma.config.ts
 *
 * Prisma 7 configuration file.
 * The `url` property is no longer supported inside schema.prisma datasource —
 * database connection is configured here instead.
 *
 * Switch `datasource.url` to a Postgres URL when deploying to production;
 * also change `datasource.provider` in schema.prisma to "postgresql".
 */

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
