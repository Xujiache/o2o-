import { SetMetadata } from '@nestjs/common';

export interface IdempotentMeta {
  /** 幂等域,用于隔离不同业务的 key,如 'order:create' */
  scope: string;
  /** 缓存有效期秒数,默认 24h */
  ttlSeconds?: number;
}

export const IDEMPOTENT_META = 'IDEMPOTENT_META';

/**
 * 幂等装饰器骨架 — T10 实现 IdempotencyInterceptor 真正接入 Redis。
 * 当前仅声明元数据。
 */
export const Idempotent = (meta: IdempotentMeta): MethodDecorator => SetMetadata(IDEMPOTENT_META, meta);
