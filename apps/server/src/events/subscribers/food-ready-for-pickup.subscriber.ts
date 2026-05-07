import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { DispatchService } from '../../modules/dispatch/dispatch.service';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { EventName, type FoodReadyForPickupPayload } from '../events';

/**
 * 出餐完成后:
 *  1. 触发派单 -> 建 dispatch_task PENDING(骑手大厅源数据)
 *  2. push 通知骑手
 *  3. audit_log
 */
@Injectable()
export class FoodReadyForPickupSubscriber {
  private readonly logger = new Logger(FoodReadyForPickupSubscriber.name);

  constructor(
    private readonly auditLog: AuditLogService,
    private readonly gateway: IntegrationGatewayService,
    private readonly dispatch: DispatchService,
  ) {}

  @OnEvent(EventName.FoodReadyForPickup)
  async handle(payload: FoodReadyForPickupPayload): Promise<void> {
    this.logger.log(`[food-order.ready-for-pickup] orderId=${payload.orderId} storeId=${payload.storeId}`);

    // 1. 建 dispatch_task(幂等:同 bizOrderId 已有 PENDING/DISPATCHED 直接返回)
    try {
      const dispatchTask = await this.dispatch.dispatch({
        bizType: 'FOOD',
        bizOrderId: payload.orderId,
        bizTaskId: null,
      });
      this.logger.log(
        `[food-order.ready-for-pickup] dispatch task ${dispatchTask.dispatchTaskId} created for order ${payload.orderId}`,
      );
    } catch (err) {
      this.logger.error({ err }, '[food-order.ready-for-pickup] dispatch failed (non-blocking)');
    }

    // 2. push 通知
    await this.gateway.getui
      .pushOne({
        cid: `rider:order:${payload.orderId}`,
        title: '订单已出餐',
        body: `店铺已出餐,请尽快取餐 (订单 ${payload.orderId})`,
        payload: { orderId: payload.orderId, scene: 'ready-for-pickup' },
      })
      .catch((err: unknown) => this.logger.warn({ err }, '[food-order.ready-for-pickup] push failed (non-blocking)'));

    // 3. audit log
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
