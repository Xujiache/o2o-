import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type RefundExecutedPayload } from '../events';

@Injectable()
export class RefundExecutedSubscriber {
  private readonly logger = new Logger(RefundExecutedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.RefundExecuted)
  async handle(payload: RefundExecutedPayload): Promise<void> {
    this.logger.log(
      `[refund.executed] refundOrderId=${payload.refundOrderId} bizOrderId=${payload.bizOrderId} amount=${payload.amount} status=${payload.status}`,
    );
    await this.auditLog.writeAudit({
      traceId: `refund-${payload.refundOrderId}`,
      operatorType: 'system',
      operatorId: 'refund',
      targetType: 'refund-order',
      targetId: payload.refundOrderId,
      afterStatus: payload.status,
      summary: `退款 ${payload.refundNo} ${payload.bizType}/${payload.bizOrderId} 金额=${payload.amount} ${payload.status}`,
    });
  }
}
