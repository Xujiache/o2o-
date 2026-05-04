import { Injectable, NestMiddleware } from '@nestjs/common';
import { Header } from '@o2o/contracts';
import type { NextFunction, Request, Response } from 'express';

import { RequestContextStore } from '../utils/als';
import { generateTraceId } from '../utils/uuid';

/**
 * 全局中间件 — 进入请求的最早环节,生成或透传 traceId,放入 ALS 供后续使用。
 * 必须在 throttler/auth 等其他中间件 / interceptor 之前生效。
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerKey = Header.TraceId.toLowerCase();
    const incoming = (req.headers[headerKey] as string | undefined) ?? '';
    const traceId = incoming.trim() || generateTraceId();
    res.setHeader(Header.TraceId, traceId);

    RequestContextStore.run(
      {
        traceId,
        scope: 'public',
        ip: req.ip ?? '',
        deviceId: (req.headers[Header.DeviceId.toLowerCase()] as string | undefined) ?? '',
      },
      () => next(),
    );
  }
}
