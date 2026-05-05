import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type MerchantOrderAcceptedPayload } from '../events';

/**
 * 商家接单后:
 *  1. sms 通知用户(订单已接单)
 *  2. audit_log
 */
@Injectable()
export class MerchantOrderAcceptedSubscriber {
  private readonly logger = new Logger(MerchantOrderAcceptedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.MerchantOrderAccepted)
  async handle(payload: MerchantOrderAcceptedPayload): Promise<void> {
    this.logger.log(`[merchant-order.accepted] orderId=${payload.orderId} expectedReadyAt=${payload.expectedReadyAt}`);

    await this.gateway.sms
      .send(payload.orderId, 'ORDER_ACCEPTED', String(payload.orderId))
      .catch((err: unknown) => this.logger.warn({ err }, '[merchant-order.accepted] sms send failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `merchant-order-accepted-${payload.orderId}`,
      operatorType: 'merchant',
      operatorId: payload.merchantId,
      targetType: 'food-order',
      targetId: payload.orderId,
      beforeStatus: 'PAID_WAIT_MERCHANT',
      afterStatus: 'PREPARING',
      summary: `订单 ${payload.orderId} 已接单`,
    });
  }
}
