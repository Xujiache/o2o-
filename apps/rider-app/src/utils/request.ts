/**
 * 骑手端统一请求封装(基于 uni.request)。
 * - 自动注入 Rider-Token / Idempotency-Key(写接口) / X-Trace-Id
 * - 401 → 调用 refreshHandler(stage 3 注入)→ 失败则 clear token + 跳登录
 */
import { ErrorCode, Header, type ApiResponse } from '@o2o/contracts';

import { clearToken, getToken } from './token';
import { genTraceId } from './trace';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3000';

export interface RiderRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: Record<string, unknown> | unknown[];
  params?: Record<string, unknown>;
  header?: Record<string, string>;
  idempotent?: boolean;
  authRequired?: boolean;
  timeout?: number;
  /** 内部用,防止 401 → refresh → 401 死循环 */
  _retried?: boolean;
}

type RefreshHandler = () => Promise<boolean>;
let refreshHandler: RefreshHandler | null = null;
export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      v.forEach((it) => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(it))}`));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function request<T = unknown>(options: RiderRequestOptions): Promise<ApiResponse<T>> {
  const method = options.method ?? 'GET';
  const isWrite = method !== 'GET';
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(options.header ?? {}) };

  if (options.authRequired !== false) {
    const token = getToken();
    if (token) headers[Header.RiderToken] = token;
  }
  headers[Header.TraceId] = genTraceId();
  if (options.idempotent ?? isWrite) {
    headers[Header.IdempotencyKey] = genTraceId();
  }

  return new Promise<ApiResponse<T>>((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url + buildQuery(options.params),
      method: method as never,
      data: options.data,
      header: headers,
      timeout: options.timeout ?? 15000,
      async success(res) {
        const body = res.data as ApiResponse<T> | undefined;
        if (!body || typeof body !== 'object' || !('code' in body)) {
          reject(new Error(`bad response: status=${res.statusCode}`));
          return;
        }
        if (body.code === ErrorCode.UNAUTHORIZED && !options._retried && refreshHandler) {
          const ok = await refreshHandler();
          if (ok) {
            try {
              const r = await request<T>({ ...options, _retried: true });
              resolve(r);
              return;
            } catch (err) {
              reject(err);
              return;
            }
          }
          clearToken();
          uni.reLaunch({ url: '/pages/login/index' });
        } else if (body.code === ErrorCode.UNAUTHORIZED) {
          clearToken();
          uni.reLaunch({ url: '/pages/login/index' });
        }
        resolve(body);
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

export interface UploadOptions {
  filePath: string;
  bizType: string;
  formData?: Record<string, string>;
  authRequired?: boolean;
  onProgress?: (percent: number) => void;
}

export function upload<T = unknown>(options: UploadOptions): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (options.authRequired !== false) {
    const token = getToken();
    if (token) headers[Header.RiderToken] = token;
  }
  headers[Header.TraceId] = genTraceId();
  headers[Header.IdempotencyKey] = genTraceId();

  return new Promise<ApiResponse<T>>((resolve, reject) => {
    const task = uni.uploadFile({
      url: BASE_URL + '/api/v1/pub/files/upload',
      filePath: options.filePath,
      name: 'file',
      header: headers,
      formData: { bizType: options.bizType, ...(options.formData ?? {}) },
      success(res) {
        try {
          const body = JSON.parse(res.data) as ApiResponse<T>;
          if (body.code === ErrorCode.UNAUTHORIZED) {
            clearToken();
            uni.reLaunch({ url: '/pages/login/index' });
          }
          resolve(body);
        } catch (e) {
          reject(e);
        }
      },
      fail(err) {
        reject(err);
      },
    });
    if (options.onProgress) {
      task.onProgressUpdate((p) => options.onProgress?.(p.progress));
    }
  });
}
