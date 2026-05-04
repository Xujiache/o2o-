/**
 * 全局错误码 — 后端唯一权威,前端不得自造。
 * 来源:`项目阶段规划/00-阶段0-项目初始化与全局契约/接口契约清单.md`
 */
export const ErrorCode = {
  /** 成功 */
  OK: '0',
  /** 参数非法 */
  INVALID_PARAM: 'INVALID_PARAM',
  /** 未登录或 Token 失效 */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** 无权限(含跨端 Token 调用) */
  FORBIDDEN: 'FORBIDDEN',
  /** 资源不存在 */
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  /** 状态非法流转 */
  STATUS_INVALID: 'STATUS_INVALID',
  /** 重复请求(幂等冲突) */
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  /** 第三方失败 */
  THIRD_PARTY_ERROR: 'THIRD_PARTY_ERROR',
  /** 限流 */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  /** 服务器内部错误(兜底) */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 默认前端展示文案(可被 i18n 覆盖) */
export const ErrorCodeDefaultMessage: Record<ErrorCodeValue, string> = {
  [ErrorCode.OK]: '成功',
  [ErrorCode.INVALID_PARAM]: '参数有误,请检查后重试',
  [ErrorCode.UNAUTHORIZED]: '请先登录',
  [ErrorCode.FORBIDDEN]: '无权限执行该操作',
  [ErrorCode.DATA_NOT_FOUND]: '数据不存在或已被删除',
  [ErrorCode.STATUS_INVALID]: '当前状态不允许该操作',
  [ErrorCode.DUPLICATE_REQUEST]: '请勿重复操作',
  [ErrorCode.THIRD_PARTY_ERROR]: '第三方服务暂时不可用,请稍后再试',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '操作过于频繁,请稍后再试',
  [ErrorCode.INTERNAL_ERROR]: '服务异常,请稍后再试',
};
