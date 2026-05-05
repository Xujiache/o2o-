import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type ErrandOrderCreatedPayload } from '../events';

@Injectable()
export class ErrandOrderCreatedSubscriber {
  private readonly logger = new Logger(ErrandOrderCreatedSubscriber.name);
  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.ErrandOrderCreated)
  async handle(payload: ErrandOrderCreatedPayload): Promise<void> {
    this.logger.log(`[errand-order.created] orderId=${payload.orderId} customer=${payload.customerId}`);
    await this.auditLog.writeAudit({
      traceId: `errand-order-created-${payload.orderId}`,
      operatorType: 'customer',
      operatorId: payload.customerId,
      targetType: 'errand-order',
      targetId: payload.orderId,
      afterStatus: 'WAIT_PAY',
      summary: `跑腿订单 ${payload.orderNo} 已创建`,
    });
  }
}
