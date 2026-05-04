import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Header } from '@o2o/contracts';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import type { CurrentPrincipal } from '../../modules/auth/types';
import { AUDIT_META, type AuditMeta } from '../decorators/audit.decorator';
import { getCtx } from '../utils/als';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMeta>(AUDIT_META, [context.getHandler(), context.getClass()]);
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request & { user?: CurrentPrincipal }>();
    const ctx = getCtx();

    return next.handle().pipe(
      tap({
        next: (response) => {
          queueMicrotask(() => {
            this.auditService
              .writeAudit({
                traceId: ctx?.traceId ?? '',
                operatorType: req.user?.scope ?? 'public',
                operatorId: req.user?.principalId ?? null,
                targetType: meta.targetType,
                targetId: this.extractTargetId(response),
                ip: ctx?.ip ?? null,
                deviceId: (req.headers[Header.DeviceId.toLowerCase()] as string | undefined) ?? null,
                summary: `${req.method} ${req.originalUrl}`,
                request: this.sanitizeRequest(req),
                response: meta.withResponse ? response : undefined,
              })
              .catch((err) => this.logger.error({ err }, 'audit write failed'));
          });
        },
      }),
    );
  }

  private extractTargetId(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null;
    const obj = response as Record<string, unknown>;
    const candidate = obj.id ?? obj.fileId ?? obj.eventId;
    return candidate ? String(candidate) : null;
  }

  private sanitizeRequest(req: Request): Record<string, unknown> {
    const headers = { ...req.headers } as Record<string, unknown>;
    for (const k of ['customer-token', 'merchant-token', 'rider-token', 'admin-token', 'authorization', 'cookie']) {
      if (headers[k]) headers[k] = '[REDACTED]';
    }
    return {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query,
      headers,
    };
  }
}
