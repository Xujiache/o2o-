import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type FoodOrderPaidPayload } from '../events';

/**
 * 外卖订单支付成功后:
 *  1. getui.pushNotification(merchant)→ 商家 APP 推送(stage 2 既有 mock)
 *  2. sms.send(customer ORDER_PAID 模板)
 *  3. audit_log
 */
@Injectable()
export class FoodOrderPaidSubscriber {
  private readonly logger = new Logger(FoodOrderPaidSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.FoodOrderPaid)
  async handle(payload: FoodOrderPaidPayload): Promise<void> {
    this.logger.log(
      `[food-order.paid] orderId=${payload.orderId} customer=${payload.customerId} store=${payload.storeId}`,
    );
    // 推送商家(mock,cid 用 storeId 当作占位推送目标)
    await this.gateway.getui
      .pushOne({
        cid: `merchant:${payload.storeId}`,
        title: '新订单',
        body: `外卖订单 ${payload.orderId} 已支付,请尽快接单`,
        payload: { orderId: payload.orderId, paidAmount: payload.paidAmount },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[food-order.paid] getui push failed (non-blocking)'));

    // 短信通知用户(mock,sms.send(mobile, scene, code) — 复用 stage 1 既有签名;mobile 占位用 customerId)
    await this.gateway.sms
      .send(payload.customerId, 'ORDER_PAID', String(payload.orderId))
      .catch((err: unknown) => this.logger.warn({ err }, '[food-order.paid] sms send failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `food-order-paid-${payload.orderId}`,
      operatorType: 'system',
      operatorId: 'callback',
      targetType: 'food-order',
      targetId: payload.orderId,
      afterStatus: 'PAID_WAIT_MERCHANT',
      summary: `订单 ${payload.orderId} 支付成功,推送商家 ${payload.storeId} + 短信用户`,
    });
  }
}
