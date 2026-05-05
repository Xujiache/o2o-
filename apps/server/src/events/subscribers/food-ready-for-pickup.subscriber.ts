import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type FoodReadyForPickupPayload } from '../events';

/**
 * 出餐完成后:
 *  1. push 已分配骑手(取餐提醒)
 *  2. audit_log
 */
@Injectable()
export class FoodReadyForPickupSubscriber {
  private readonly logger = new Logger(FoodReadyForPickupSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
  ) {}

  @OnEvent(EventName.FoodReadyForPickup)
  async handle(payload: FoodReadyForPickupPayload): Promise<void> {
    this.logger.log(`[food-order.ready-for-pickup] orderId=${payload.orderId} storeId=${payload.storeId}`);

    await this.gateway.getui
      .pushOne({
        cid: `rider:order:${payload.orderId}`,
        title: '订单已出餐',
        body: `店铺已出餐,请尽快取餐 (订单 ${payload.orderId})`,
        payload: { orderId: payload.orderId, scene: 'ready-for-pickup' },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[food-order.ready-for-pickup] push failed (non-blocking)'));

    await this.auditLog.writeAudit({
      traceId: `food-order-ready-${payload.orderId}`,
      operatorType: 'merchant',
      operatorId: payload.merchantId,
      targetType: 'food-order',
      targetId: payload.orderId,
      beforeStatus: 'PREPARING',
      afterStatus: 'READY_FOR_PICKUP',
      summary: `订单 ${payload.orderId} 已出餐`,
    });
  }
}
