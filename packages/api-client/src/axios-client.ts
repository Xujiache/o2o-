import type { ApiResponse } from '@o2o/contracts';
import axios, { type AxiosInstance } from 'axios';

import { buildHeaders, handleApiCode } from './factory';
import type { ApiClient, ApiClientConfig, RequestOptions } from './types';

/**
 * 基于 axios 的 ApiClient(平台 Web 与 Node 测试使用)。
 * Uni-app 端不要用本实现,改用 createUniApiClient(在各端 utils/request.ts 中注入 uni.request)。
 */
export function createAxiosApiClient(config: ApiClientConfig): ApiClient {
  const instance: AxiosInstance = axios.create({
    baseURL: config.baseURL,
    timeout: config.defaultTimeout ?? 15000,
  });

  return {
    async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
      const headers = buildHeaders(config, options);
      try {
        const res = await instance.request<ApiResponse<T>>({
          url: options.url,
          method: options.method ?? 'GET',
          params: options.params,
          data: options.data,
          headers,
          timeout: options.timeout ?? config.defaultTimeout ?? 15000,
        });
        handleApiCode(config, res.data.code);
        return res.data;
      } catch (err: unknown) {
        config.onError?.(err);
        throw err;
      }
    },
  };
}
