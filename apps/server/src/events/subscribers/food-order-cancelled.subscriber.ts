import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type FoodOrderCancelledPayload } from '../events';

/**
 * 外卖订单取消:
 *  - 系统 / 平台触发 → 退款 mock log(stage 7 真接退款)
 *  - sms.send(customer ORDER_CANCELLED 模板)— mock
 *  - audit_log
 */
@Injectable()
export class FoodOrderCancelledSubscriber {
  private readonly logger = new Logger(FoodOrderCancelledSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.FoodOrderCancelled)
  async handle(payload: FoodOrderCancelledPayload): Promise<void> {
    this.logger.log(
      `[food-order.cancelled] orderId=${payload.orderId} by=${payload.cancelledBy} reason=${payload.reason}`,
    );
    if (payload.cancelledBy === 'system' || payload.cancelledBy === 'admin') {
      this.logger.warn(
        `[food-order.cancelled] mock refund for orderId=${payload.orderId} reason=${payload.reason}(stage 7 接真退款)`,
      );
    }
    await this.gateway.sms
      .send(payload.customerId, 'ORDER_CANCELLED', String(payload.orderId))
      .catch((err: unknown) => this.logger.warn({ err }, '[food-order.cancelled] sms send failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `food-order-cancelled-${payload.orderId}`,
      operatorType: payload.cancelledBy === 'customer' ? 'customer' : 'system',
      operatorId: payload.cancelledBy === 'customer' ? payload.customerId : 'system',
      targetType: 'food-order',
      targetId: payload.orderId,
      afterStatus: 'CANCELLED',
      summary: `订单 ${payload.orderId} 取消(${payload.cancelledBy} / ${payload.reason})`,
    });
  }
}
