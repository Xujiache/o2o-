import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type MerchantAuditedPayload } from '../events';

@Injectable()
export class MerchantAuditedSubscriber {
  private readonly logger = new Logger(MerchantAuditedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.MerchantAudited)
  async handle(payload: MerchantAuditedPayload): Promise<void> {
    this.logger.log(
      `[merchant.audited] applicationId=${payload.applicationId} result=${payload.auditResult} operator=${payload.operatorAdminId}`,
    );
    await this.auditLog.writeAudit({
      traceId: `merchant-audited-${payload.applicationId}-${payload.auditedAt}`,
      operatorType: 'admin',
      operatorId: payload.operatorAdminId,
      targetType: 'merchant-application',
      targetId: payload.applicationId,
      afterStatus: payload.auditResult,
      summary: `商家审核 ${payload.auditResult}${payload.rejectReason ? `:${payload.rejectReason}` : ''}`,
    });
  }
}
