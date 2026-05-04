import { createHash } from 'node:crypto';

import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Header } from '@o2o/contracts';
import type { Request } from 'express';
import type Redis from 'ioredis';
import { catchError, defer, from, mergeMap, Observable, of, tap, throwError } from 'rxjs';
import { Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import { IdempotencyRecord } from '../../database/entities';
import { IDEMPOTENT_META, type IdempotentMeta } from '../decorators/idempotent.decorator';

interface CacheEntry {
  status: 'processing' | 'done' | 'failed';
  payload?: unknown;
  ts: number;
  hash: string;
}

const DEFAULT_TTL = 86400;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(IdempotencyRecord) private readonly repo: Repository<IdempotencyRecord>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<IdempotentMeta>(IDEMPOTENT_META, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const idemKey = (req.headers[Header.IdempotencyKey.toLowerCase()] as string | undefined)?.trim();
    if (!idemKey) {
      throw new BadRequestException(`${Header.IdempotencyKey} header required for idempotent endpoint`);
    }

    const ttl = meta.ttlSeconds ?? DEFAULT_TTL;
    const cacheKey = `idem:${meta.scope}:${idemKey}`;
    const requestHash = this.hashRequest(req);

    return defer(() =>
      from(
        this.redis.set(
          cacheKey,
          JSON.stringify({ status: 'processing', ts: Date.now(), hash: requestHash }),
          'EX',
          ttl,
          'NX',
        ),
      ),
    ).pipe(
      mergeMap((setResult) => {
        if (setResult === 'OK') {
          // 首次请求 — 执行业务
          return next.handle().pipe(
            tap({
              next: (payload) => {
                const entry: CacheEntry = { status: 'done', payload, ts: Date.now(), hash: requestHash };
                queueMicrotask(() => {
                  this.redis
                    .set(cacheKey, JSON.stringify(entry), 'EX', ttl)
                    .catch((err) => this.logger.error({ err }, 'idem cache write failed'));
                  this.persistRecord(idemKey, meta.scope, requestHash, entry, ttl).catch((err) =>
                    this.logger.error({ err }, 'idem db write failed'),
                  );
                });
              },
              error: (err: unknown) => {
                const entry: CacheEntry = { status: 'failed', ts: Date.now(), hash: requestHash };
                queueMicrotask(() => {
                  this.redis
                    .set(cacheKey, JSON.stringify(entry), 'EX', 60)
                    .catch((e) => this.logger.error({ err: e }, 'idem cache write failed (after error)'));
                });
                this.logger.warn({ err }, `idem ${cacheKey} marked failed`);
              },
            }),
          );
        }
        // 重复请求 — 读缓存
        return defer(() => from(this.redis.get(cacheKey))).pipe(
          mergeMap((cached) => {
            if (!cached) return throwError(() => new ConflictException('idempotency in flight'));
            let parsed: CacheEntry;
            try {
              parsed = JSON.parse(cached) as CacheEntry;
            } catch {
              return throwError(() => new ConflictException('idempotency cache corrupt'));
            }
            if (parsed.hash && parsed.hash !== requestHash) {
              return throwError(() => new ConflictException('idempotency key reused with different payload'));
            }
            if (parsed.status === 'processing') {
              return throwError(() => new ConflictException('previous request still processing'));
            }
            if (parsed.status === 'done') {
              return of(parsed.payload);
            }
            return throwError(() => new ConflictException('previous request failed'));
          }),
          catchError((err) => throwError(() => err)),
        );
      }),
    );
  }

  private hashRequest(req: Request): string {
    const body = req.body ? JSON.stringify(req.body) : '';
    return createHash('sha256').update(`${req.method}|${req.originalUrl}|${body}`).digest('hex').slice(0, 32);
  }

  private async persistRecord(key: string, scope: string, hash: string, entry: CacheEntry, ttl: number): Promise<void> {
    const expireAt = Date.now() + ttl * 1000;
    await this.repo.upsert(
      {
        idempotencyKey: key,
        scope,
        requestHash: hash,
        responsePayload: entry.payload ? JSON.stringify(entry.payload) : null,
        status: entry.status === 'done' ? 'done' : entry.status === 'failed' ? 'failed' : 'processing',
        expireAt: expireAt.toString(),
        createdAt: entry.ts.toString(),
      },
      { conflictPaths: ['idempotencyKey', 'scope'], skipUpdateIfNoValuesChanged: true },
    );
  }
}
