/**
 * 平台 Web 请求封装:axios + Admin-Token + 401 跳登录 + 自动注入 X-Trace-Id。
 */
import { ErrorCode, Header, type ApiResponse } from '@o2o/contracts';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

import { router } from '@/router';

import { clearAuth, getToken } from './token';
import { genTraceId } from './trace';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3000';

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

instance.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        void router.replace('/error/network');
      } else if (err.response.status === 401) {
        clearAuth();
        void router.replace('/login');
      }
    }
    return Promise.reject(err);
  },
);

export interface RequestOptions extends AxiosRequestConfig {
  /** 是否在错误时自动 ElMessage 提示;默认 true */
  toastOnBizError?: boolean;
}

export async function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
  const { toastOnBizError = true, ...rest } = options;
  const res = await instance.request<ApiResponse<T>>(rest);
  const body = res.data;
  if (body.code === ErrorCode.UNAUTHORIZED) {
    clearAuth();
    void router.replace('/login');
  }
  if (toastOnBizError && body.code !== '0') {
    ElMessage.error(body.message);
  }
  return body;
}
