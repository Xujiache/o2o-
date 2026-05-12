/**
 * 平台 Web 请求封装:axios + Admin-Token + 401 自动 refresh + X-Trace-Id 注入。
 *
 * 401 自动刷新流程:
 *  - HTTP 401(或 body.code='UNAUTHORIZED')首次触发 → 用 refreshToken 调 admin-auth.refresh
 *  - 单飞:多个并发 401 共享一个 refresh promise
 *  - 成功 → 更新 token + 重发原请求
 *  - 失败 / 没有 refreshToken → clearAuth 跳登录
 *  - refresh 调用自身和带 skipAuthRefresh=true 的请求不参与该流程
 */
import { ErrorCode, Header, type ApiResponse } from '@o2o/contracts';
import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

import { router } from '@/router';

import { clearAuth, getRefreshToken, getToken, setRefreshToken, setToken } from './token';
import { genTraceId } from './trace';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3000';
const REFRESH_URL = '/api/v1/admin/auth/refresh';

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

instance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers[Header.AdminToken] = token;
  config.headers[Header.TraceId] = genTraceId();
  const m = (config.method ?? 'get').toUpperCase();
  if (m !== 'GET') config.headers[Header.IdempotencyKey] = genTraceId();
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    const r = await instance.post<ApiResponse<{ adminToken: string; refreshToken: string }>>(
      REFRESH_URL,
      { refreshToken: rt },
      { headers: { [Header.IdempotencyKey]: genTraceId() } },
    );
    const body = r.data;
    if (body.code !== '0' || !body.data) return null;
    setToken(body.data.adminToken);
    setRefreshToken(body.data.refreshToken);
    return body.data.adminToken;
  } catch {
    return null;
  }
}

function ensureRefreshing(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function goLogin(): void {
  clearAuth();
  if (router.currentRoute.value.path !== '/login') {
    void router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } });
  }
}

instance.interceptors.response.use(
  (res) => res,
  async (err: unknown) => {
    if (!axios.isAxiosError(err)) return Promise.reject(err);
    const cfg = err.config as RetriableConfig | undefined;
    if (!err.response) {
      void router.replace('/error/network');
      return Promise.reject(err);
    }
    const isUnauthorized =
      err.response.status === 401 ||
      (err.response.data as ApiResponse<unknown> | undefined)?.code === ErrorCode.UNAUTHORIZED;
    if (!isUnauthorized) return Promise.reject(err);

    if (!cfg || cfg.skipAuthRefresh || cfg._retry || cfg.url?.endsWith(REFRESH_URL)) {
      goLogin();
      return Promise.reject(err);
    }
    const newToken = await ensureRefreshing();
    if (!newToken) {
      goLogin();
      return Promise.reject(err);
    }
    cfg._retry = true;
    cfg.headers[Header.AdminToken] = newToken;
    return instance.request(cfg);
  },
);

export interface RequestOptions extends AxiosRequestConfig {
  /** 错误时自动 ElMessage 提示;默认 true */
  toastOnBizError?: boolean;
  /** 跳过 401 自动 refresh(refresh 端点自身使用) */
  skipAuthRefresh?: boolean;
}

export async function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
  const { toastOnBizError = true, skipAuthRefresh, ...rest } = options;
  const cfg = rest as RetriableConfig;
  if (skipAuthRefresh) cfg.skipAuthRefresh = true;
  const res = await instance.request<ApiResponse<T>>(cfg);
  const body = res.data;
  if (body.code === ErrorCode.UNAUTHORIZED) {
    goLogin();
  }
  if (toastOnBizError && body.code !== '0') {
    ElMessage.error(body.message);
  }
  return body;
}
