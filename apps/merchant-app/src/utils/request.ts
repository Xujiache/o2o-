/**
 * 商家端统一请求封装(基于 uni.request)。
 * - 自动注入 Merchant-Token / Idempotency-Key(写接口) / X-Trace-Id
 * - 401 → clear token + 跳启动页(stage 0 占位;阶段 2 接入登录)
 * - 业务错误返回完整 ApiResponse 让调用方决定提示
 */
import { ErrorCode, Header, type ApiResponse } from '@o2o/contracts';

import { clearToken, getToken } from './token';
import { genTraceId } from './trace';

const BASE_URL = 'http://127.0.0.1:3000';

export interface MerchantRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown> | unknown[];
  params?: Record<string, unknown>;
  header?: Record<string, string>;
  idempotent?: boolean;
  authRequired?: boolean;
  timeout?: number;
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

export function request<T = unknown>(options: MerchantRequestOptions): Promise<ApiResponse<T>> {
  const method = options.method ?? 'GET';
  const isWrite = method !== 'GET';
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(options.header ?? {}) };

  if (options.authRequired !== false) {
    const token = getToken();
    if (token) headers[Header.MerchantToken] = token;
  }
  headers[Header.TraceId] = genTraceId();
  if (options.idempotent ?? isWrite) {
    headers[Header.IdempotencyKey] = genTraceId();
  }

  return new Promise<ApiResponse<T>>((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url + buildQuery(options.params),
      method,
      data: options.data,
      header: headers,
      timeout: options.timeout ?? 15000,
      success(res) {
        const body = res.data as ApiResponse<T> | undefined;
        if (!body || typeof body !== 'object' || !('code' in body)) {
          reject(new Error(`bad response: status=${res.statusCode}`));
          return;
        }
        if (body.code === ErrorCode.UNAUTHORIZED) {
          clearToken();
          uni.reLaunch({ url: '/pages/launch/index' });
        }
        resolve(body);
      },
      fail(err) {
        uni.reLaunch({ url: '/pages/error/network' });
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
    if (token) headers[Header.MerchantToken] = token;
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
            uni.reLaunch({ url: '/pages/launch/index' });
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
