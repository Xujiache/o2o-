import { CallHandler, ConflictException, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import type Redis from 'ioredis';
import { defer, from, mergeMap, Observable, throwError } from 'rxjs';

import { REDIS_CLIENT } from '../../../config/redis.module';

const TTL_SECONDS = 7 * 24 * 3600;

/**
 * 回调去重 — 用 X-Callback-Id(provider 必须保证全局唯一)在 Redis 中 SETNX。
 * 重复回调直接返回 DUPLICATE_REQUEST。
 */
@Injectable()
export class CallbackIdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const provider = (req.params as Record<string, string>).provider ?? 'unknown';
    const callbackId = (req.headers['x-callback-id'] as string | undefined) ?? '';
    if (!callbackId) {
      return throwError(() => new ConflictException('callback id missing'));
    }
    const cacheKey = `callback:${provider}:${callbackId}`;
    return defer(() => from(this.redis.set(cacheKey, '1', 'EX', TTL_SECONDS, 'NX'))).pipe(
      mergeMap((res) => {
        if (res !== 'OK') {
          return throwError(() => new ConflictException('duplicate callback'));
        }
        return next.handle();
      }),
    );
  }
}
