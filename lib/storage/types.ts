export type StorageProvider = "local" | "s3";

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType?: string;
}

export interface Storage {
  provider: StorageProvider;
  putObject(input: PutObjectInput): Promise<{ key: string; size: number }>;
  getObjectBuffer(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
}

