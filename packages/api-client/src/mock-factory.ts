/**
 * 共享 mock 工厂(T25)— 4 端测试通用。
 * 调用方:
 *   const m = createMockApiClient();
 *   m.request({ url: '/api/v1/pub/dictionaries' });  // 返回 fixture
 *   m.calls;                                         // 记录所有请求,供断言
 *   m.setFixture('/api/v1/pub/cities', [...]);       // 自定义返回
 *
 * 不依赖具体 mocking framework(vitest/jest 都可用)。
 */
import type { ApiResponse } from '@o2o/contracts';

import type { ApiClient, RequestOptions } from './types';

interface MockApiClient extends ApiClient {
  /** 历史调用 */
  calls: Array<{ url: string; method: string; params?: Record<string, unknown>; data?: unknown }>;
  /** 注册按 URL 前缀匹配的 fixture */
  setFixture<T>(urlPrefix: string, data: T, code?: string, message?: string): void;
  /** 重置历史与 fixture(测试 beforeEach 调用) */
  reset(): void;
}

const DEFAULT_FIXTURES: Array<{ urlPrefix: string; data: unknown }> = [
  {
    urlPrefix: '/api/v1/pub/dictionaries',
    data: [
      { dictType: 'order_takeaway_status', code: 'WAIT_PAY', label: '待支付', sort: 10, enabled: true },
      { dictType: 'order_takeaway_status', code: 'DELIVERED', label: '已送达', sort: 90, enabled: true },
    ],
  },
  {
    urlPrefix: '/api/v1/pub/cities',
    data: [{ cityCode: '110100', cityName: '北京市', province: '北京', serviceEnabled: true }],
  },
  {
    urlPrefix: '/api/v1/pub/files/upload',
    data: { fileId: 'mock-file-1', url: 'http://mock/foo.png', expireAt: Date.now() + 900_000, size: 100 },
  },
  {
    urlPrefix: '/api/v1/admin/integrations/health',
    data: [
      { provider: 'amap', status: 'mock', lastCheckedAt: null, errorMessage: null },
      { provider: 'wxpay', status: 'mock', lastCheckedAt: null, errorMessage: null },
    ],
  },
  {
    urlPrefix: '/api/v1/admin/audit-logs',
    data: { pageNo: 1, pageSize: 20, total: 0, list: [] },
  },
];

export function createMockApiClient(): MockApiClient {
  let fixtures = [...DEFAULT_FIXTURES];
  const calls: MockApiClient['calls'] = [];

  return {
    calls,
    setFixture<T>(urlPrefix: string, data: T, _code = '0', _message = 'OK'): void {
      fixtures = [{ urlPrefix, data }, ...fixtures.filter((f) => f.urlPrefix !== urlPrefix)];
    },
    reset(): void {
      fixtures = [...DEFAULT_FIXTURES];
      calls.length = 0;
    },
    async request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
      calls.push({
        url: options.url,
        method: options.method ?? 'GET',
        params: options.params as Record<string, unknown> | undefined,
        data: options.data,
      });
      const matched = fixtures.find((f) => options.url.startsWith(f.urlPrefix));
      return {
        code: '0',
        message: 'OK',
        data: (matched?.data ?? null) as T,
        traceId: 'mock-trace',
        timestamp: Date.now(),
      };
    },
  };
}
