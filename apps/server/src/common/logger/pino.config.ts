import type { Params } from 'nestjs-pino';

import { getCtx } from '../utils/als';

/**
 * pino 配置 — 自动注入 traceId、脱敏敏感 Header 与字段
 */
export function buildPinoOptions(): Params {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = process.env.LOG_LEVEL ?? 'info';
  const pretty = process.env.LOG_PRETTY === 'true';

  return {
    pinoHttp: {
      level,
      transport:
        isDev && pretty
          ? { target: 'pino-pretty', options: { singleLine: true, colorize: true, translateTime: 'SYS:HH:MM:ss.l' } }
          : undefined,
      redact: {
        paths: [
          'req.headers["customer-token"]',
          'req.headers["merchant-token"]',
          'req.headers["rider-token"]',
          'req.headers["admin-token"]',
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          '*.password',
          '*.idCard',
          '*.bankCard',
          '*.phone',
        ],
        censor: '[REDACTED]',
        remove: false,
      },
      base: { service: 'o2o-server' },
      customProps: () => {
        const ctx = getCtx();
        return ctx?.traceId ? { traceId: ctx.traceId, scope: ctx.scope } : {};
      },
      autoLogging: {
        ignore: (req) => {
          const url = (req as { url?: string }).url ?? '';
          return url === '/api/v1/pub/health' || url.startsWith('/api-docs');
        },
      },
    },
  };
}
