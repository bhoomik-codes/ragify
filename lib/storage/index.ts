import "server-only";

import type { Storage } from "./types";
import { createLocalStorage } from "./local";
import { createS3Storage } from "./s3";

let singleton: Storage | null = null;

export function getStorage(): Storage {
  if (singleton) return singleton;

  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  if (provider === "s3") {
    const region = process.env.S3_REGION ?? "auto";
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "[storage] STORAGE_PROVIDER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (and optionally S3_ENDPOINT, S3_REGION).",
      );
    }

    singleton = createS3Storage({
      region,
      bucket,
      endpoint,
      accessKeyId,
      secretAccessKey,
    });
    return singleton;
  }

  const baseDir = process.env.LOCAL_STORAGE_DIR ?? "/tmp/ragify-storage";
  singleton = createLocalStorage(baseDir);
  return singleton;
}

