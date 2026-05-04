import { SetMetadata } from '@nestjs/common';

export interface AuditMeta {
  /** 审计目标类型,如 'order', 'merchant', 'config' */
  targetType: string;
  /** 是否记录响应数据(默认 false,避免日志过大) */
  withResponse?: boolean;
}

export const AUDIT_META = 'AUDIT_META';

/** 审计装饰器 — T11 接入 sys_audit_log + audit_log_detail */
export const Audit = (meta: AuditMeta): MethodDecorator => SetMetadata(AUDIT_META, meta);
