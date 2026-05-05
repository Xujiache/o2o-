import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type MerchantOrderRejectedPayload } from '../events';

/**
 * 商家拒单后:
 *  1. sms 通知用户(已拒单 + 退款中)
 *  2. audit_log(退款实际由 payment.service.refund 走 mock)
 */
@Injectable()
export class MerchantOrderRejectedSubscriber {
  private readonly logger = new Logger(MerchantOrderRejectedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.MerchantOrderRejected)
  async handle(payload: MerchantOrderRejectedPayload): Promise<void> {
    this.logger.log(`[merchant-order.rejected] orderId=${payload.orderId} reason=${payload.rejectReason}`);

    await this.gateway.sms
      .send(payload.orderId, 'ORDER_REJECTED', payload.rejectReason)
      .catch((err: unknown) => this.logger.warn({ err }, '[merchant-order.rejected] sms send failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `merchant-order-rejected-${payload.orderId}`,
      operatorType: 'merchant',
      operatorId: payload.merchantId,
      targetType: 'food-order',
      targetId: payload.orderId,
      beforeStatus: 'PAID_WAIT_MERCHANT',
      afterStatus: 'CANCELLED',
      summary: `订单 ${payload.orderId} 已被商家拒单(${payload.rejectReason})`,
    });
  }
}
