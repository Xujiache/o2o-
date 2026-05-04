import type { ApiResponse, Scope } from '@o2o/contracts';

/** 通用 HTTP 方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 单次请求参数 */
export interface RequestOptions {
  url: string;
  method?: HttpMethod;
  /** URL query */
  params?: Record<string, unknown>;
  /** body */
  data?: unknown;
  /** 自定义 header(会与 client 默认 header 合并) */
  headers?: Record<string, string>;
  /** 超时(毫秒);默认 15000 */
  timeout?: number;
  /** 是否发送幂等 Key(POST/PUT/PATCH/DELETE 默认 true) */
  idempotent?: boolean;
  /** 是否需要鉴权 Token(默认 true);Public 接口可设 false */
  authRequired?: boolean;
}

/** 客户端配置 */
export interface ApiClientConfig {
  /** API base URL,如 http://localhost:3000 */
  baseURL: string;
  /** 当前端的归属 */
  scope: Scope;
  /** 取 Token 的回调(由各端注入,各端 Token 存储隔离) */
  getToken: () => string | null | undefined;
  /** 取 traceId(可选;若无则后端生成) */
  getTraceId?: () => string | null | undefined;
  /** 生成幂等 Key 的回调;默认 UUID */
  generateIdempotencyKey?: () => string;
  /** Token 失效时的回调(401 触发,通常用于跳登录) */
  onUnauthorized?: () => void;
  /** 全局错误兜底(网络/解析错误);业务错误请在调用处处理 */
  onError?: (err: unknown) => void;
  /** 默认超时 */
  defaultTimeout?: number;
}

/** 客户端接口(axios / uni-request 都要实现) */
export interface ApiClient {
  request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>>;
}
