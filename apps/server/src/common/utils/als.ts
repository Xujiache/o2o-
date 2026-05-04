import { AsyncLocalStorage } from 'node:async_hooks';

import type { Scope } from '@o2o/contracts';

export interface RequestContext {
  traceId: string;
  scope?: Scope | 'public';
  principalId?: string | number;
  ip?: string;
  deviceId?: string;
}

export const RequestContextStore = new AsyncLocalStorage<RequestContext>();

export function getCtx(): RequestContext | undefined {
  return RequestContextStore.getStore();
}

export function getTraceId(): string {
  return RequestContextStore.getStore()?.traceId ?? '';
}

export function setCtxField<K extends keyof RequestContext>(key: K, value: RequestContext[K]): void {
  const ctx = RequestContextStore.getStore();
  if (ctx) ctx[key] = value;
}
