/**
 * 5 个领域事件 — 定义在 `项目阶段规划/00-阶段0-...后端数据任务事件.md` § 领域事件。
 * 事件名称遵循 `domain.<biz>.<verb>` 风格。
 */

export const EventName = {
  ConfigChanged: 'domain.config.changed',
  PermissionChanged: 'domain.permission.changed',
  FileUploaded: 'domain.file.uploaded',
  ThirdPartyCallbackReceived: 'domain.third-party.callback.received',
  AuditLogCreated: 'domain.audit-log.created',
} as const;

export type EventName = (typeof EventName)[keyof typeof EventName];

export interface ConfigChangedPayload {
  configKey: string;
  oldValue: string | null;
  newValue: string | null;
  operator: string;
}

export interface PermissionChangedPayload {
  roleId: string;
  permissionId: string;
  action: 'grant' | 'revoke';
}

export interface FileUploadedPayload {
  fileId: string;
  bizType: string;
  ownerType: string;
  ownerId: string;
}

export interface ThirdPartyCallbackReceivedPayload {
  provider: string;
  callbackId: string;
  status: string;
  raw: Record<string, unknown>;
}

export interface AuditLogCreatedPayload {
  auditLogId: string;
  traceId: string;
  targetType: string;
  targetId: string | null;
}

export type EventPayloadMap = {
  [EventName.ConfigChanged]: ConfigChangedPayload;
  [EventName.PermissionChanged]: PermissionChangedPayload;
  [EventName.FileUploaded]: FileUploadedPayload;
  [EventName.ThirdPartyCallbackReceived]: ThirdPartyCallbackReceivedPayload;
  [EventName.AuditLogCreated]: AuditLogCreatedPayload;
};
