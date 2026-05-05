import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type MerchantOrderPushedPayload } from '../events';

/**
 * 外卖订单 PAID_WAIT_MERCHANT 后立即推送给商家:
 *  1. push 商家工作台(语音 + 弹窗)
 *  2. audit_log 留痕
 */
@Injectable()
export class MerchantOrderPushedSubscriber {
  private readonly logger = new Logger(MerchantOrderPushedSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.MerchantOrderPushed)
  async handle(payload: MerchantOrderPushedPayload): Promise<void> {
    this.logger.log(
      `[merchant-order.pushed] orderId=${payload.orderId} storeId=${payload.storeId} payable=${payload.payableAmountCents}`,
    );

    await this.gateway.getui
      .pushOne({
        cid: `merchant:${payload.merchantId}`,
        title: '新订单',
        body: `店铺有新订单待接单 (¥${(Number(payload.payableAmountCents) / 100).toFixed(2)})`,
        payload: { orderId: payload.orderId, scene: 'new-order' },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[merchant-order.pushed] push failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `merchant-order-pushed-${payload.orderId}`,
      operatorType: 'system',
      operatorId: 'callback',
      targetType: 'food-order',
      targetId: payload.orderId,
      afterStatus: 'PAID_WAIT_MERCHANT',
      summary: `外卖订单 ${payload.orderId} 已推送至商家工作台`,
    });
  }
}
