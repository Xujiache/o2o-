import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { type AdminLoggedInPayload, EventName } from '../events';

@Injectable()
export class AdminLoggedInSubscriber {
  private readonly logger = new Logger(AdminLoggedInSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.AdminLoggedIn)
  async handle(payload: AdminLoggedInPayload): Promise<void> {
    this.logger.log(
      `[admin.logged-in] adminUserId=${payload.adminUserId} username=${payload.username} ip=${payload.ip ?? '-'}`,
    );
    await this.auditLog.writeAudit({
      traceId: `admin-login-${payload.adminUserId}-${payload.loggedInAt}`,
      operatorType: 'admin',
      operatorId: payload.adminUserId,
      targetType: 'admin-auth',
      targetId: payload.adminUserId,
      ip: payload.ip ?? null,
      deviceId: payload.deviceId ?? null,
      summary: `${payload.username} 登录管理后台`,
    });
  }
}
