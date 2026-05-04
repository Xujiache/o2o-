import { Logger } from '@nestjs/common';
import * as Minio from 'minio';

export interface PutObjectInput {
  bucket: string;
  key: string;
  body: Buffer;
  contentType?: string;
  size?: number;
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  etag: string;
  size: number;
}

export interface PresignInput {
  bucket: string;
  key: string;
  expiresInSeconds: number;
}

export interface StorageAdapter {
  ensureBucket(bucket: string): Promise<void>;
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getPresignedGetUrl(input: PresignInput): Promise<string>;
  removeObject(input: { bucket: string; key: string }): Promise<void>;
}

/** 内存 mock(测试或 MinIO 不可用时) */
export class MockStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, Buffer>();
  async ensureBucket(): Promise<void> {
    // no-op
  }
  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    this.store.set(`${input.bucket}/${input.key}`, input.body);
    return { etag: `mock-${Date.now()}`, size: input.body.length };
  }
  async getPresignedGetUrl(input: PresignInput): Promise<string> {
    return `mock://${input.bucket}/${input.key}?expires=${input.expiresInSeconds}`;
  }
  async removeObject(input: { bucket: string; key: string }): Promise<void> {
    this.store.delete(`${input.bucket}/${input.key}`);
  }
}

/** MinIO 真实适配 */
export class MinioStorageAdapter implements StorageAdapter {
  private readonly client: Minio.Client;
  private readonly logger = new Logger('MinioStorageAdapter');

  constructor(opts: { endpoint: string; accessKey: string; secretKey: string; region: string }) {
    const url = new URL(opts.endpoint);
    this.client = new Minio.Client({
      endPoint: url.hostname,
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
      useSSL: url.protocol === 'https:',
      accessKey: opts.accessKey,
      secretKey: opts.secretKey,
      region: opts.region,
    });
  }

  async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.client.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(bucket, 'us-east-1');
      this.logger.log(`bucket created: ${bucket}`);
    }
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const meta: Record<string, string> = { 'Content-Type': input.contentType ?? 'application/octet-stream' };
    if (input.metadata) Object.assign(meta, input.metadata);
    const result = await this.client.putObject(input.bucket, input.key, input.body, input.body.length, meta);
    return { etag: result.etag, size: input.body.length };
  }

  async getPresignedGetUrl(input: PresignInput): Promise<string> {
    return this.client.presignedGetObject(input.bucket, input.key, input.expiresInSeconds);
  }

  async removeObject(input: { bucket: string; key: string }): Promise<void> {
    await this.client.removeObject(input.bucket, input.key);
  }
}
