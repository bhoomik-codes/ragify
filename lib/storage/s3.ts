import type { Storage } from "./types";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createS3Storage(opts: {
  region: string;
  bucket: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Storage {
  const client = new S3Client({
    region: opts.region,
    endpoint: opts.endpoint,
    credentials: {
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
    },
    forcePathStyle: Boolean(opts.endpoint), // helps MinIO / custom endpoints
  });

  return {
    provider: "s3",
    async putObject({ key, body, contentType }) {
      await client.send(
        new PutObjectCommand({
          Bucket: opts.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return { key, size: body.length };
    },
    async getObjectBuffer(key: string) {
      const out = await client.send(
        new GetObjectCommand({
          Bucket: opts.bucket,
          Key: key,
        }),
      );
      if (!out.Body) throw new Error("[storage:s3] missing body");
      return streamToBuffer(out.Body);
    },
    async deleteObject(key: string) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: opts.bucket,
          Key: key,
        }),
      );
    },
  };
}

