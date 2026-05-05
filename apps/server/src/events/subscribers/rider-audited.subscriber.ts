import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type RiderAuditedPayload } from '../events';

@Injectable()
export class RiderAuditedSubscriber {
  private readonly logger = new Logger(RiderAuditedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.RiderAudited)
  async handle(payload: RiderAuditedPayload): Promise<void> {
    this.logger.log(
      `[rider.audited] applicationId=${payload.applicationId} result=${payload.auditResult} operator=${payload.operatorAdminId}`,
    );
    await this.auditLog.writeAudit({
      traceId: `rider-audited-${payload.applicationId}-${payload.auditedAt}`,
      operatorType: 'admin',
      operatorId: payload.operatorAdminId,
      targetType: 'rider-application',
      targetId: payload.applicationId,
      afterStatus: payload.auditResult,
      summary: `骑手审核 ${payload.auditResult}${payload.rejectReason ? `:${payload.rejectReason}` : ''}`,
    });
  }
}
