/**
 * 用户端统一请求封装(基于 uni.request)。
 * - 自动注入 Customer-Token / Idempotency-Key(写接口) / X-Trace-Id
 * - 401 → 尝试 refresh,失败再清 token + 跳登录页
 * - 业务错误返回完整 ApiResponse 让调用方决定提示
 */
import { ErrorCode, Header, type ApiResponse } from '@o2o/contracts';

import { clearToken, getToken } from './token';
import { genTraceId } from './trace';

type RefreshHandler = () => Promise<boolean>;
let refreshHandler: RefreshHandler | null = null;
/** 由 stores/auth.ts 在 app 启动时注入,避免循环依赖 */
export function setRefreshHandler(h: RefreshHandler | null): void {
  refreshHandler = h;
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3000';

export interface CustomerRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown> | unknown[];
  params?: Record<string, unknown>;
  header?: Record<string, string>;
  /** 写接口默认 true,GET 默认 false */
  idempotent?: boolean;
  /** 公开接口可设 false */
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

function rawRequest<T>(options: CustomerRequestOptions): Promise<ApiResponse<T>> {
  const method = options.method ?? 'GET';
  const isWrite = method !== 'GET';
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(options.header ?? {}) };

  if (options.authRequired !== false) {
    const token = getToken();
    if (token) headers[Header.CustomerToken] = token;
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
        resolve(body);
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

export async function request<T = unknown>(options: CustomerRequestOptions): Promise<ApiResponse<T>> {
  let res: ApiResponse<T>;
  try {
    res = await rawRequest<T>(options);
  } catch (err) {
    uni.reLaunch({ url: '/pages/error/network' });
    throw err;
  }
  if (res.code === ErrorCode.UNAUTHORIZED && options.authRequired !== false && refreshHandler) {
    const ok = await refreshHandler();
    if (ok) {
      try {
        return await rawRequest<T>(options);
      } catch (err) {
        uni.reLaunch({ url: '/pages/error/network' });
        throw err;
      }
    }
    clearToken();
    uni.reLaunch({ url: '/pages/login/index' });
  }
  return res;
}

/**
 * 文件上传(uni.uploadFile 走 multipart/form-data)。
 * formData 里附带 bizType;与 /pub/files/upload 后端 DTO 对齐。
 */
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
    if (token) headers[Header.CustomerToken] = token;
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
