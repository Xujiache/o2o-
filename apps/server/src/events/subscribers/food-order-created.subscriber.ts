import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { EventName, type FoodOrderCreatedPayload } from '../events';

@Injectable()
export class FoodOrderCreatedSubscriber {
  private readonly logger = new Logger(FoodOrderCreatedSubscriber.name);

  constructor(private readonly auditLog: AuditLogService) {}

  @OnEvent(EventName.FoodOrderCreated)
  async handle(payload: FoodOrderCreatedPayload): Promise<void> {
    this.logger.log(
      `[food-order.created] orderId=${payload.orderId} orderNo=${payload.orderNo} customerId=${payload.customerId}`,
    );
    await this.auditLog.writeAudit({
      traceId: `food-order-created-${payload.orderId}`,
      operatorType: 'customer',
      operatorId: payload.customerId,
      targetType: 'food-order',
      targetId: payload.orderId,
      afterStatus: 'WAIT_PAY',
      summary: `创建外卖订单 ${payload.orderNo} 待支付 ${payload.payableAmount} 分`,
    });
  }
}
