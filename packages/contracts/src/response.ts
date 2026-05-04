/**
 * 统一响应结构 — 来源:`项目阶段规划/全局接口契约规范.md`
 *
 * ```json
 * { "code": "0", "message": "OK", "data": {}, "traceId": "...", "timestamp": 1777903560000 }
 * ```
 */
export interface ApiResponse<T = unknown> {
  /** 错误码;成功为 "0",失败为 ErrorCode 之一 */
  code: string;
  /** 用户可读消息 */
  message: string;
  /** 业务数据;失败时可为 null */
  data: T | null;
  /** 链路追踪 ID(由后端生成或回传 X-Trace-Id) */
  traceId: string;
  /** 服务端时间(毫秒时间戳) */
  timestamp: number;
}

/** 分页响应通用结构 */
export interface PageResult<T> {
  /** 当前页(从 1 起) */
  pageNo: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数 */
  total: number;
  /** 当前页数据 */
  list: T[];
}

/** 分页请求参数基类 */
export interface PageParam {
  pageNo?: number;
  pageSize?: number;
}

/** 判断响应是否成功 */
export function isOk<T>(res: ApiResponse<T>): res is ApiResponse<T> & { data: T } {
  return res.code === '0';
}
