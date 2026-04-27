import * as fs from "node:fs";
import * as path from "node:path";
import type { Storage } from "./types";

function ensureContainedPath(baseDir: string, key: string): string {
  const base = path.resolve(baseDir);
  const safeKey = key.replace(/^\/+/, "");
  const full = path.resolve(base, safeKey);
  if (!full.startsWith(base + path.sep)) {
    throw new Error("[storage:local] key escapes base directory");
  }
  return full;
}

export function createLocalStorage(baseDir: string): Storage {
  const resolved = path.resolve(baseDir);
  if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });

  return {
    provider: "local",
    async putObject({ key, body }: { key: string; body: Buffer }) {
      const fullPath = ensureContainedPath(resolved, key);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, body);
      return { key, size: body.length };
    },
    async getObjectBuffer(key: string) {
      const fullPath = ensureContainedPath(resolved, key);
      return fs.readFileSync(fullPath);
    },
    async deleteObject(key: string) {
      const fullPath = ensureContainedPath(resolved, key);
      try {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch (e) {
        // best-effort
      }
    },
  };
}

