import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { type ArbitrationCompletedPayload, EventName } from '../events';

@Injectable()
export class ArbitrationCompletedSubscriber {
  private readonly logger = new Logger(ArbitrationCompletedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.ArbitrationCompleted)
  async handle(payload: ArbitrationCompletedPayload): Promise<void> {
    this.logger.log(
      `[after-sale.arbitration-completed] arbitrationId=${payload.arbitrationId} afterSaleId=${payload.afterSaleId} decision=${payload.decision} responsibleParty=${payload.responsibleParty} refundOrderId=${payload.refundOrderId ?? '-'}`,
    );
    await this.auditLog.writeAudit({
      traceId: `arbitration-${payload.arbitrationId}`,
      operatorType: 'admin',
      operatorId: payload.operatorAdminId,
      targetType: 'after-sale',
      targetId: payload.afterSaleId,
      afterStatus: payload.decision === 'REJECT' ? 'COMPLETED' : 'REFUNDED',
      summary: `售后仲裁 ${payload.afterSaleId} ${payload.decision} 责任=${payload.responsibleParty} 退款=${payload.refundAmount} 处罚=${payload.penalty}`,
    });
  }
}
