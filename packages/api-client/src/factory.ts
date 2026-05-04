import { Header, ScopeTokenHeader, ErrorCode } from '@o2o/contracts';

import type { ApiClientConfig, RequestOptions } from './types';

/** 默认 UUID(简易实现;Web 与 Uni-app 都可用) */
function defaultUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 构建发送前的最终 header(注入 Token / Trace / Idempotency) */
export function buildHeaders(config: ApiClientConfig, options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  const method = (options.method ?? 'GET').toUpperCase();
  const isWrite = method !== 'GET';

  // Token
  if (options.authRequired !== false) {
    const token = config.getToken();
    if (token) {
      headers[ScopeTokenHeader[config.scope]] = token;
    }
  }

  // Trace ID
  const trace = config.getTraceId?.();
  if (trace) {
    headers[Header.TraceId] = trace;
  }

  // Idempotency Key(写接口)
  const wantIdem = options.idempotent ?? isWrite;
  if (wantIdem) {
    const gen = config.generateIdempotencyKey ?? defaultUuid;
    headers[Header.IdempotencyKey] = gen();
  }

  return headers;
}

/** 通用错误码处理(401 触发 onUnauthorized) */
export function handleApiCode(config: ApiClientConfig, code: string): void {
  if (code === ErrorCode.UNAUTHORIZED) {
    config.onUnauthorized?.();
  }
}
